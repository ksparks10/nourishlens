import Link from "next/link";
export default function Features() {
  return (
    <main id="main-content" className="public-page">
      <p className="eyebrow">FEATURES</p>
      <h1>Nutrition data without hidden assumptions</h1>
      <div className="summary-grid">
        <section className="card">
          <h2>Food log</h2>
          <p>
            Search reviewed foods, adjust servings, and preserve nutrient
            snapshots by meal and date.
          </p>
        </section>
        <section className="card">
          <h2>Transparent projections</h2>
          <p>
            See confidence, methodology, uncertainty ranges, and totals with or
            without eligible projections.
          </p>
        </section>
        <section className="card">
          <h2>Recipes and reports</h2>
          <p>
            Build versioned recipes, reuse meals, review trends, and export
            classification-rich CSV data.
          </p>
        </section>
      </div>
      <Link className="button" href="/signup">
        Create an account
      </Link>
    </main>
  );
}
