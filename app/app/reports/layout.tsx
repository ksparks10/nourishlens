import { requirePremiumAccess } from "@/lib/billing/access";
export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePremiumAccess();
  return children;
}
