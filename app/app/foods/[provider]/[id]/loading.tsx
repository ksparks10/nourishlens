import { Database, LoaderCircle } from "lucide-react";

export default function FoodLabelLoading() {
  return (
    <section className="card detail-loading" role="status" aria-live="polite">
      <span className="search-loading-icon">
        <Database aria-hidden="true" size={24} />
        <LoaderCircle className="spin" aria-hidden="true" size={17} />
      </span>
      <div>
        <p className="eyebrow">LOADING PRODUCT LABEL</p>
        <h1>Retrieving nutrition detailsâ€¦</h1>
        <p className="muted">
          Checking the selected database for serving sizes, macros, vitamins,
          and minerals.
        </p>
      </div>
    </section>
  );
}
