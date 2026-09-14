import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";

const requestSchema = z.object({
  restaurantSlug: z.string().min(1),
  tableNumber: z.coerce.number().int().positive(),
  type: z.enum(["WAITER", "BILL"]),
  /** Offline queue id — accepted for client correlation; never written into message */
  clientActionId: z.string().trim().min(1).max(80).optional().nullable(),
});

/** Strip accidental UUID / ZWSP markers previously appended to messages. */
export function sanitizePublicMessage(message: string): string {
  return message
    .replace(/\u200B/g, "")
    .replace(
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\s*$/i,
      ""
    )
    .trim();
}

async function cleanupPollutedMessages(restaurantId?: string) {
  try {
    const recent = await prisma.tableRequest.findMany({
      where: restaurantId ? { restaurantId } : undefined,
      select: { id: true, message: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    for (const row of recent) {
      const clean = sanitizePublicMessage(row.message);
      if (clean !== row.message && clean.length > 0) {
        await prisma.tableRequest.update({
          where: { id: row.id },
          data: { message: clean },
        });
      }
    }
  } catch {
    // best-effort
  }
}

function publicRequestPayload(row: {
  id: string;
  type: string;
  message: string;
  status: string;
  createdAt: Date;
  table: { tableNumber: number };
}) {
  return {
    id: row.id,
    type: row.type,
    message: sanitizePublicMessage(row.message),
    status: row.status,
    tableNumber: row.table.tableNumber,
    createdAt: row.createdAt.toISOString(),
  };
}

/** One-shot cleanup for CRM notifications that already leaked UUIDs */
export async function GET() {
  await cleanupPollutedMessages();
  return NextResponse.json({ ok: true, cleaned: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { restaurantSlug, tableNumber, type } = parsed.data;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Fix existing CRM notifications that leaked UUIDs into message text
    await cleanupPollutedMessages(restaurant.id);

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

    const message =
      type === "WAITER"
        ? `Table No. ${table.tableNumber} needs a waiter.`
        : `Table No. ${table.tableNumber} needs the bill.`;

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
      { request: publicRequestPayload(tableRequest) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Table request error:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
