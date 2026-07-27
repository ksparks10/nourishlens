import Link from "next/link";
import { requirePermission } from "@/lib/auth/authorization";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("admin.access");
  return (
    <div className="shell">
      <aside className="sidebar">
        <strong>Administration</strong>
        <nav>
          <Link href="/admin">Overview</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/foods">Foods</Link>
          <Link href="/admin/nutrient-mappings">Mappings</Link>
          <Link href="/admin/projections">Projections</Link>
          <Link href="/admin/analytics">Analytics</Link>
          <Link href="/admin/audit-logs">Audit logs</Link>
          <Link href="/admin/content">Content</Link>
          <Link href="/admin/feature-flags">Feature flags</Link>
          <Link href="/admin/automations">Automations</Link>
          <Link href="/admin/system-health">System health</Link>
          <Link href="/admin/promo-codes">Promo codes</Link>
          <Link href="/admin/staff">Staff</Link>
          <Link href="/app">User app</Link>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
