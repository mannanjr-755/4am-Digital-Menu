import { redirect } from "next/navigation";
import Link from "next/link";
import { requireStaff } from "@backend/lib/session";
import { signOut } from "@backend/lib/auth";
import { UtensilsCrossed, LayoutList, LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();

  if (!session) {
    redirect("/admin/login");
  }

  const restaurantName = session.user.restaurantName;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="border-b border-[#2a2a2a] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d4a017] text-[#d4a017]">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#e8c547]">{restaurantName}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#888]">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <Link
            href="/admin/menu"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#ccc] transition hover:bg-[#141414] hover:text-[#e8c547]"
          >
            <LayoutList className="h-4 w-4" />
            Menu Management
          </Link>
        </nav>

        <div className="border-t border-[#2a2a2a] px-3 py-3">
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#888] transition hover:bg-[#141414] hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
