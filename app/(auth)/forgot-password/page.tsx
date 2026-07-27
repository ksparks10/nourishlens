import { requestPasswordReset } from "../actions";
export default function ForgotPassword() {
  return (
    <main className="auth">
      <section className="card">
        <h1>Reset your password</h1>
        <p className="muted">
          Enter your email. We’ll send instructions if an account matches.
        </p>
        <form className="form" action={requestPasswordReset}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button className="button">Send reset link</button>
        </form>
      </section>
    </main>
  );
}
