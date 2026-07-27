import Link from "next/link";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { signUp } from "../actions";
export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  return (
    <main className="auth">
      <section className="card">
        <h1>Create your account</h1>
        <p className="muted">
          Your nutrition and body data are private and protected.
        </p>
        {q.error && (
          <p className="error" role="alert">
            {q.error}
          </p>
        )}
        <form className="form" action={signUp} noValidate>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              aria-describedby="password-requirements"
              required
            />
          </label>
          <p className="field-help" id="password-requirements">
            Use 8–72 characters.
          </p>
          <AuthSubmitButton
            idleLabel="Create account"
            pendingLabel="Creating account…"
          />
        </form>
        <p>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
