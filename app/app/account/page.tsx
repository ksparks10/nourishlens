import { deleteAccount } from "./actions";
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  return (
    <>
      <h1>Account settings</h1>
      {q.error && (
        <p className="error" role="alert">
          {q.error}
        </p>
      )}
      <section className="card">
        <h2>Export your data</h2>
        <p className="muted">
          Download the account data currently stored for you.
        </p>
        <a className="button" href="/app/account/export">
          Download JSON export
        </a>
      </section>
      <section className="card">
        <h2>Delete account</h2>
        <p>
          This permanently removes your authentication account and profile. This
          cannot be undone.
        </p>
        <form className="form" action={deleteAccount}>
          <label>
            Type DELETE to confirm
            <input name="confirmation" required />
          </label>
          <button className="button">Permanently delete account</button>
        </form>
      </section>
    </>
  );
}
