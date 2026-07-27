import { requirePremiumAccess } from "@/lib/billing/access";
export default async function RecipesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePremiumAccess();
  return children;
}
