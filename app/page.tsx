import Link from "next/link";
export default function Home() {
  return (
    <>
      <header className="marketing-nav">
        <Link href="/">Nourish Lens</Link>
        <nav aria-label="Public navigation">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <main id="main-content" className="hero">
        <div>
          <p className="eyebrow">NUTRITION, WITH CONTEXT</p>
          <h1>See what your food is really giving you.</h1>
          <p>
            Track calories, macros, vitamins, minerals, fatty acids, amino
            acids, and more—with clear visibility into measured and projected
            nutrition data.
          </p>
          <div className="actions">
            <Link className="button" href="/signup">
              Create an account
            </Link>
            <Link className="card" href="/features">
              Explore features
            </Link>
          </div>
          <p>
            <small>
              For education and tracking only. This service does not diagnose,
              treat, cure, or prevent medical conditions.
            </small>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <nav aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/disclaimer">Nutrition disclaimer</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}
