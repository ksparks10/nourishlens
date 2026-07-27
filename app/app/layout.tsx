import Link from "next/link";
import { requireUser } from "@/lib/auth/authorization";
import { signOut } from "./actions";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();
  return (
    <div className="shell">
      <aside className="sidebar">
        <strong>Nourish Lens</strong>
        <nav aria-label="Application">
          <Link href="/app">Dashboard</Link>
          <Link href="/app/diary">Food log</Link>
          <Link href="/app/add-food">Add food</Link>
          <Link href="/app/recipes">Recipes</Link>
          <Link href="/app/saved-meals">Saved meals</Link>
          <Link href="/app/reports">Reports</Link>
          <Link href="/app/projections">Data quality</Link>
          <Link href="/app/profile">Profile</Link>
          <Link href="/app/billing">Billing</Link>
          <Link href="/app/account">Account</Link>
          <Link href="/admin">Admin</Link>
        </nav>
        <small className="muted">{user.email}</small>
        <form action={signOut}>
          <button>Sign out</button>
        </form>
      </aside>
      <main id="main-content" className="main">
        {children}
      </main>
    </div>
  );
}
