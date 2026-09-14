import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";

const requestSchema = z.object({
  restaurantSlug: z.string().min(1),
  tableNumber: z.coerce.number().int().positive(),
  type: z.enum(["WAITER", "BILL"]),
  /** Offline queue id — embedded for idempotent sync retries (no schema change) */
  clientActionId: z.string().trim().min(1).max(80).optional().nullable(),
});

function withActionMarker(message: string, clientActionId?: string | null) {
  if (!clientActionId) return message;
  return `${message}\u200B${clientActionId}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { restaurantSlug, tableNumber, type, clientActionId } = parsed.data;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const table = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber,
        },
      },
    });

    if (!table || !table.active) {
      return NextResponse.json({ error: "Table not found or inactive" }, { status: 404 });
    }

    // Idempotent replay: same clientActionId already stored on a prior sync
    if (clientActionId) {
      const marker = `\u200B${clientActionId}`;
      const existing = await prisma.tableRequest.findFirst({
        where: {
          restaurantId: restaurant.id,
          tableId: table.id,
          type,
          message: { endsWith: marker },
        },
        orderBy: { createdAt: "desc" },
        include: { table: { select: { tableNumber: true } } },
      });
      if (existing) {
        return NextResponse.json(
          {
            request: {
              id: existing.id,
              type: existing.type,
              message: existing.message.split("\u200B")[0],
              status: existing.status,
              tableNumber: existing.table.tableNumber,
              createdAt: existing.createdAt.toISOString(),
            },
          },
          { status: 200 }
        );
      }
    }

    const baseMessage =
      type === "WAITER"
        ? `Table No. ${table.tableNumber} needs a waiter.`
        : `Table No. ${table.tableNumber} needs the bill.`;
    const message = withActionMarker(baseMessage, clientActionId);

    const tableRequest = await prisma.tableRequest.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        type,
        message,
        status: "PENDING",
      },
      include: {
        table: { select: { tableNumber: true } },
      },
    });

    return NextResponse.json(
      {
        request: {
          id: tableRequest.id,
          type: tableRequest.type,
          message: baseMessage,
          status: tableRequest.status,
          tableNumber: tableRequest.table.tableNumber,
          createdAt: tableRequest.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Table request error:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
