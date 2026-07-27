"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Database, LoaderCircle } from "lucide-react";
import type { FoodSearchResult } from "@/lib/nutrition/search";
type State = {
  status: "idle" | "loading" | "success" | "error";
  results: FoodSearchResult[];
  message?: string;
};
function Result({ food, label }: { food: FoodSearchResult; label?: string }) {
  return (
    <Link
      role="option"
      aria-selected="false"
      className="food-result"
      href={`/app/foods/${food.provider}/${encodeURIComponent(food.id)}`}
    >
      <div>
        {label && <span className="eyebrow">{label}</span>}
        <strong>{food.name}</strong>
        <p>
          {food.brand ?? "Generic"} ·{" "}
          {food.servingLabel ?? "Serving unavailable"}
        </p>
      </div>
      <div className="food-meta">
        <strong>
          {food.calories === null ? "—" : `${Math.round(food.calories)} kcal`}
        </strong>
        <span>{food.sourceKey.replaceAll("_", " ")}</span>
        <span>
          {food.dataCompleteness > 0
            ? `${food.dataCompleteness}% nutrient coverage`
            : "Full nutrients load when selected"}
        </span>
        {food.containsProjections && <span>Includes projected values</span>}
      </div>
    </Link>
  );
}
export function FoodSearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "idle", results: [] });
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    if (query.trim().length < 2) {
      setState({ status: "idle", results: [] });
      return;
    }
    const timer = setTimeout(async () => {
      request.current?.abort();
      request.current = new AbortController();
      setState((previous) => ({ ...previous, status: "loading" }));
      try {
        const response = await fetch(
          `/api/foods/search?q=${encodeURIComponent(query)}&source=all`,
          { signal: request.current.signal },
        );
        const body = (await response.json()) as {
          data?: FoodSearchResult[];
          error?: { message: string };
        };
        if (!response.ok)
          throw new Error(body.error?.message ?? "Search failed");
        setState({ status: "success", results: body.data ?? [] });
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          setState({
            status: "error",
            results: [],
            message: (error as Error).message,
          });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const quick = state.results.find(
    (food) => food.foodType === "generic" && !food.brand,
  );
  const specific = state.results.filter((food) => food !== quick);
  function updateQuery(value: string) {
    setQuery(value);
    request.current?.abort();
    setState((previous) =>
      value.trim().length >= 2
        ? { ...previous, status: "loading", message: undefined }
        : { status: "idle", results: [] },
    );
  }
  return (
    <section>
      <label className="search-label">
        What did you eat or take?
        <input
          className="search-input"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder="Try eggs, coffee, or a multivitamin"
          role="combobox"
          aria-expanded={state.results.length > 0}
          aria-controls="food-results"
          autoComplete="off"
        />
      </label>
      <p className="muted">
        Choose a quick generic match, or browse specific foods, brands,
        preparations, and supplement labels.
      </p>
      <p className="muted">
        Searching USDA and Health Canada foods plus NIH supplement labels.
      </p>
      {state.status === "loading" && (
        <div className="search-loading card" role="status" aria-live="polite">
          <span className="search-loading-icon">
            <Database aria-hidden="true" size={20} />
            <LoaderCircle className="spin" aria-hidden="true" size={16} />
          </span>
          <div>
            <strong>Checking nutrition databases…</strong>
            <small>
              Searching USDA, Health Canada, and NIH supplement labels
            </small>
          </div>
        </div>
      )}
      {state.status === "error" && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.results.length === 0 && (
        <div className="card">
          <p>
            No foods matched. Try a singular name, brand, product name, or
            barcode.
          </p>
        </div>
      )}
      <div
        id="food-results"
        className="results"
        role="listbox"
        aria-busy={state.status === "loading"}
      >
        {quick && (
          <section>
            <h2>Quick choice</h2>
            <Result food={quick} label="Best generic match" />
          </section>
        )}
        {specific.length > 0 && (
          <section>
            <h2>{quick ? "Specific catalog choices" : "Catalog choices"}</h2>
            <div className="results">
              {specific.map((food) => (
                <Result food={food} key={`${food.provider}-${food.id}`} />
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
