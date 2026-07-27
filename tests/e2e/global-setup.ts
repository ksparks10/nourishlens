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
export default async function globalSetup() {
  if (process.env.E2E_PUBLIC_ONLY === "1") return;
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
  const createdUser = (await created.json()) as { id: string };

  if (process.env.E2E_ADMIN === "1") {
    const restHeaders = {
      ...headers,
      Prefer: "return=minimal",
    };
    const permissions = (await fetch(
      `${base}/rest/v1/permissions?select=id`,
      { headers },
    ).then((response) => response.json())) as { id: string }[];
    const directPermissions = permissions.map((permission) => ({
      user_id: createdUser.id,
      permission_id: permission.id,
      granted: true,
    }));
    const permissionResponse = await fetch(
      `${base}/rest/v1/user_permissions`,
      {
        method: "POST",
        headers: restHeaders,
        body: JSON.stringify(directPermissions),
      },
    );
    if (!permissionResponse.ok)
      throw new Error(
        `Unable to grant E2E permissions: ${await permissionResponse.text()}`,
      );
    const accessResponse = await fetch(`${base}/rest/v1/access_grants`, {
      method: "POST",
      headers: restHeaders,
      body: JSON.stringify({
        user_id: createdUser.id,
        grant_type: "admin",
        reason: "Temporary responsive layout audit",
      }),
    });
    if (!accessResponse.ok)
      throw new Error(
        `Unable to grant E2E access: ${await accessResponse.text()}`,
      );
  }
}
