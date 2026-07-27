import { redirect } from "next/navigation";

export default function TargetsRedirect() {
  redirect("/app/profile#targets");
}
