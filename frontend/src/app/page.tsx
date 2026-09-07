import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

const crmBase =
  (process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:3001").replace(/\/$/, "");

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,160,23,0.16),transparent_45%)]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4a017] text-[#d4a017]">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl text-[#e8c547]">Bella Cucina</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#777]">Restaurant</p>
          </div>
        </div>
        <Link
          href={`${crmBase}/login`}
          className="rounded-full border border-[#d4a017]/40 px-5 py-2 text-sm text-[#e8c547] transition hover:bg-[#d4a017]/10"
        >
          Staff login
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#d4a017]">
          Digital menu · Kitchen dashboard
        </p>
        <h1 className="font-display mt-4 max-w-3xl text-5xl leading-tight text-white sm:text-7xl">
          Bella Cucina
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#9ca3af] sm:text-lg">
          Customers scan a table QR or NFC tag, order from your digital menu, and staff see every
          order appear live on the counter dashboard.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/r/bella-cucina/t/12"
            className="rounded-md bg-[#d4a017] px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-black"
          >
            Try demo menu
          </Link>
          <Link
            href={`${crmBase}/login`}
            className="rounded-md border border-[#2a2a2a] bg-[#141414] px-7 py-3.5 text-sm font-semibold text-white"
          >
            Open dashboard
          </Link>
        </div>

        <dl className="mt-20 grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Table URL",
              body: "/r/bella-cucina/t/12 — NFC and QR only store this link.",
            },
            {
              title: "Live orders",
              body: "NEW → ACCEPTED → PREPARING → READY → COMPLETED",
            },
            {
              title: "Multi-restaurant",
              body: "Each restaurant only sees its own menu, tables, and orders.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-5">
              <dt className="font-display text-lg text-[#e8c547]">{item.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-[#9ca3af]">{item.body}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  );
}
