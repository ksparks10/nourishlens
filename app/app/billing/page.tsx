import { getAccessStatus } from "@/lib/billing/access";
import { redeemCode } from "./actions";
import { stripeIsConfigured } from "@/lib/stripe/server";
export default async function Billing({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    checkout?: string;
  }>;
}) {
  const q = await searchParams;
  const access = await getAccessStatus();
  const enabled = stripeIsConfigured();
  return (
    <>
      <p className="eyebrow">ACCESS & BILLING</p>
      <h1>Your plan</h1>
      {q.error && (
        <p className="error" role="alert">
          {q.error}
        </p>
      )}
      {q.message && <p role="status">{q.message}</p>}
      {q.checkout === "returned" && (
        <p role="status">
          Checkout returned. Access will update only after a verified Stripe
          webhook confirms the subscription.
        </p>
      )}
      <section className="summary-grid">
        <div className="card">
          <span>Premium access</span>
          <strong>{access.hasPremium ? "Active" : "Not active"}</strong>
        </div>
        <div className="card">
          <span>Subscription</span>
          <strong>{access.subscription?.status ?? "None"}</strong>
        </div>
      </section>
      <section className="card">
        <h2>Complimentary access code</h2>
        <form className="form" action={redeemCode}>
          <label>
            Access code
            <input
              name="code"
              autoCapitalize="characters"
              autoComplete="off"
              required
            />
          </label>
          <button className="button">Redeem code</button>
        </form>
      </section>
      <section className="card">
        <h2>Premium subscription</h2>
        {enabled ? (
          <>
            <div className="actions">
              <form action="/api/stripe/checkout" method="post">
                <input type="hidden" name="plan" value="monthly" />
                <button className="button">Choose monthly</button>
              </form>
              <form action="/api/stripe/checkout" method="post">
                <input type="hidden" name="plan" value="annual" />
                <button className="button">Choose annual</button>
              </form>
            </div>
            {access.subscription && (
              <form action="/api/stripe/portal" method="post">
                <button>Manage billing in Stripe</button>
              </form>
            )}
          </>
        ) : (
          <p className="muted">
            Stripe billing is disabled. The owner must personally configure and
            enable it before Checkout can create any Stripe resources.
          </p>
        )}
      </section>
      {access.grants.length > 0 && (
        <section className="card">
          <h2>Complimentary grants</h2>
          <ul>
            {access.grants.map((grant, index) => (
              <li key={index}>
                {grant.grant_type} ·{" "}
                {grant.expires_at
                  ? `Expires ${new Date(grant.expires_at).toLocaleDateString()}`
                  : "Permanent"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
