import { requirePremiumAccess } from "@/lib/billing/access";
export default async function ProjectionReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePremiumAccess();
  return children;
}
