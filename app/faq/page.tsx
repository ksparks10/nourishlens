export default function FAQ() {
  return (
    <main id="main-content" className="public-page">
      <p className="eyebrow">FAQ</p>
      <h1>Common questions</h1>
      <section className="card">
        <h2>Are missing nutrients counted as zero?</h2>
        <p>
          No. Missing and confirmed-zero values are stored and displayed
          differently.
        </p>
        <h2>What is a projected value?</h2>
        <p>
          An explicitly labeled estimate that fills a missing nutrient using a
          versioned, reviewable method and confidence score.
        </p>
        <h2>Is this medical advice?</h2>
        <p>
          No. Nourish Lens is an education and tracking tool and does not
          diagnose or treat health conditions.
        </p>
        <h2>Can I remove projections from totals?</h2>
        <p>
          Yes. Eligible-projection and confirmed/calculated-only views are
          available.
        </p>
      </section>
    </main>
  );
}
