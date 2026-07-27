import Link from "next/link";
export default function Pricing() {
  return (
    <main id="main-content" className="public-page">
      <p className="eyebrow">ACCESS</p>
      <h1>Free and premium access</h1>
      <div className="summary-grid">
        <section className="card">
          <h2>Free</h2>
          <p>
            Onboarding, food search, meal logging, current-day nutrition, and
            profile management.
          </p>
        </section>
        <section className="card">
          <h2>Premium</h2>
          <p>
            Recipes, full reports, exports, advanced projection analysis, and
            complete history.
          </p>
          <p>
            Production prices are not published until the owner configures and
            reviews Stripe.
          </p>
        </section>
        <section className="card">
          <h2>Complimentary</h2>
          <p>
            Approved access codes and administrator grants unlock premium
            features without payment.
          </p>
        </section>
      </div>
      <Link className="button" href="/signup">
        Get started
      </Link>
    </main>
  );
}
