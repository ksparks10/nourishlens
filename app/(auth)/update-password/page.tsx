import { updatePassword } from "../actions";
export default async function UpdatePassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="auth">
      <section className="card">
        <h1>Choose a new password</h1>
        {q.error && (
          <p className="error" role="alert">
            {q.error}
          </p>
        )}
        <form className="form" action={updatePassword}>
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </label>
          <button className="button">Update password</button>
        </form>
      </section>
    </main>
  );
}
