import fs from "node:fs";
import path from "node:path";

function envFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const fileValues = Object.fromEntries(
    content
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
  return {
    ...fileValues,
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      fileValues.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      fileValues.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export default async function globalTeardown() {
  if (process.env.E2E_PUBLIC_ONLY === "1") return;
  const env = envFile();
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !service) return;
  const headers = {
    apikey: service,
    Authorization: `Bearer ${service}`,
    "Content-Type": "application/json",
  };
  const users = (await fetch(
    `${base}/auth/v1/admin/users?page=1&per_page=100`,
    { headers },
  ).then((response) => response.json())) as {
    users?: { id: string; email?: string }[];
  };
  const existing = users.users?.find((user) => user.email === "e2e@local.test");
  if (existing)
    await fetch(`${base}/auth/v1/admin/users/${existing.id}`, {
      method: "DELETE",
      headers,
    });
}
