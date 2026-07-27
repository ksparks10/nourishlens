import Link from "next/link";
import { signIn, requestMagicLink } from "../actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="auth">
      <section className="card">
        <h1>Welcome back</h1>
        <p className="muted">Sign in to continue tracking.</p>
        {q.error && (
          <p className="error" role="alert">
            {q.error}
          </p>
        )}
        {q.message && <p role="status">{q.message}</p>}
        <form className="form" action={signIn}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          <button className="button">Sign in</button>
        </form>
        <form className="form" action={requestMagicLink}>
          <input
            name="email"
            type="email"
            aria-label="Email for magic link"
            required
          />
          <button>Send a magic link</button>
        </form>
        <p>
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
        <p>
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
