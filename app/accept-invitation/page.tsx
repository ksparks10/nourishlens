import { acceptInvitation } from "./actions";
export default async function AcceptInvitation({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="auth">
      <section className="card">
        <h1>Accept staff invitation</h1>
        {q.error && (
          <p className="error" role="alert">
            {q.error}
          </p>
        )}
        <p className="muted">
          Access will only activate when your signed-in email matches the
          invitation.
        </p>
        <form action={acceptInvitation}>
          <input type="hidden" name="token" value={q.token ?? ""} />
          <button className="button">Accept invitation</button>
        </form>
      </section>
    </main>
  );
}
