import fs from "node:fs";
import path from "node:path";
function envFile() {
  const content = fs.readFileSync(
    path.join(process.cwd(), ".env.local"),
    "utf8",
  );
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}
export default async function globalSetup() {
  const env = envFile();
  const base = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !service)
    throw new Error("Local Supabase environment is required");
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
  const created = await fetch(`${base}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "e2e@local.test",
      password: "LocalTest123!",
      email_confirm: true,
    }),
  });
  if (!created.ok)
    throw new Error(`Unable to create E2E user: ${await created.text()}`);
}
