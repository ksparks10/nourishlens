"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Database, LoaderCircle } from "lucide-react";
import type { FoodSearchResult } from "@/lib/nutrition/search";

export type SupplementOption = {
  id: string;
  name: string;
  description: string | null;
  serving: string;
  nutrients: { name: string; amount: number; unit: string }[];
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j] ?? j;
      row[j] = Math.min(
        above + 1,
        (row[j - 1] ?? i) + 1,
        diagonal + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length] ?? Math.max(a.length, b.length);
}

function matches(item: SupplementOption, query: string) {
  const q = normalize(query);
  if (!q) return true;
  const searchable = normalize(`${item.name} ${item.description ?? ""}`);
  if (searchable.includes(q)) return true;
  const aliases: Record<string, string[]> = {
    multivitamin: [
      "multivitamin",
      "multivitmain",
      "multivitamins",
      "multivit",
      "dailyvitamin",
      "multivitaminadult",
      "mensvitamin",
      "mensmultivitamin",
      "menmultivitamin",
    ],
    fishoil: ["fishoil", "fishoils", "omega3", "omega", "epa", "dha"],
    protein: ["protein", "proteinpowder", "whey", "plantprotein"],
    magnesium: ["magnesium", "magnesum", "magnesiumglycinate"],
  };
  for (const [kind, terms] of Object.entries(aliases))
    if (
      searchable.includes(kind) &&
      terms.some(
        (term) =>
          distance(q, term) <= Math.max(2, Math.floor(term.length * 0.2)),
      )
    )
      return true;
  return searchable.split(/(?=[A-Z])/).some((word) => distance(q, word) <= 2);
}

export function SupplementBrowser({
  options,
}: {
  options: SupplementOption[];
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [catalog, setCatalog] = useState<FoodSearchResult[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const request = useRef<AbortController | null>(null);
  const filtered = useMemo(
    () =>
      options.filter(
        (item) =>
          (type === "all" || item.name.toLowerCase().includes(type)) &&
          matches(item, query),
      ),
    [options, query, type],
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setCatalog([]);
      setCatalogStatus("idle");
      return;
    }
    const timer = setTimeout(async () => {
      request.current?.abort();
      request.current = new AbortController();
      setCatalogStatus("loading");
      try {
        const response = await fetch(
          `/api/supplements/search?q=${encodeURIComponent(q)}`,
          { signal: request.current.signal },
        );
        const body = (await response.json()) as {
          data?: FoodSearchResult[];
          error?: { message?: string };
        };
        if (!response.ok)
          throw new Error(body.error?.message ?? "Search failed");
        setCatalog(body.data ?? []);
        setCatalogStatus("success");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCatalog([]);
          setCatalogStatus("error");
        }
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function updateQuery(value: string) {
    setQuery(value);
    request.current?.abort();
    if (value.trim().length >= 2) setCatalogStatus("loading");
    else {
      setCatalog([]);
      setCatalogStatus("idle");
    }
  }

  return (
    <>
      <section className="card form">
        <label>
          Search supplements
          <input
            className="search-input"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Try men’s multivitamin, fish oil, or a brand"
          />
        </label>
        <label>
          Popular type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">All popular supplements</option>
            <option value="protein">Protein powders</option>
            <option value="multivitamin">Multivitamins</option>
            <option value="fish oil">Fish oil and omega-3</option>
            <option value="vitamin">Vitamins</option>
            <option value="magnesium">Magnesium</option>
            <option value="creatine">Creatine</option>
            <option value="collagen">Collagen</option>
            <option value="calcium">Calcium</option>
            <option value="iron">Iron</option>
            <option value="zinc">Zinc</option>
          </select>
        </label>
      </section>
      {query.trim().length >= 2 && (
        <section className="nutrient-section">
          <div className="section-heading">
            <h2>NIH product matches</h2>
            <span>
              {catalogStatus === "loading"
                ? "Searching…"
                : `${catalog.length} found`}
            </span>
          </div>
          {catalogStatus === "error" && (
            <p className="error">
              NIH product search is temporarily unavailable.
            </p>
          )}
          {catalogStatus === "loading" && (
            <div
              className="search-loading card"
              role="status"
              aria-live="polite"
            >
              <span className="search-loading-icon">
                <Database aria-hidden="true" size={20} />
                <LoaderCircle className="spin" aria-hidden="true" size={16} />
              </span>
              <div>
                <strong>Checking the supplement database…</strong>
                <small>Searching NIH Dietary Supplement Label records</small>
              </div>
            </div>
          )}
          <div className="summary-grid" aria-busy={catalogStatus === "loading"}>
            {catalog.map((item) => (
              <section className="card" key={`${item.provider}-${item.id}`}>
                <h2>{item.name}</h2>
                <p>{item.brand ?? "Brand not listed"}</p>
                <small>
                  {item.servingLabel ?? "Review product label"} · NIH DSLD
                </small>
                <p>
                  <Link
                    className="button"
                    href={`/app/foods/${item.provider}/${encodeURIComponent(item.id)}`}
                    onClick={() => setOpeningId(item.id)}
                    aria-label={`View label and add ${item.name}`}
                  >
                    {openingId === item.id ? (
                      <>
                        <LoaderCircle
                          className="spin"
                          aria-hidden="true"
                          size={16}
                        />
                        Opening labelâ€¦
                      </>
                    ) : (
                      "View label and add"
                    )}
                  </Link>
                </p>
              </section>
            ))}
          </div>
          {catalogStatus === "success" && catalog.length === 0 && (
            <div className="card">
              <p>
                No NIH product matched. Try the brand plus “men multivitamin,”
                or search by barcode.
              </p>
            </div>
          )}
        </section>
      )}
      <p className="muted">
        {filtered.length} popular generic option
        {filtered.length === 1 ? "" : "s"}
      </p>
      <div className="summary-grid">
        {filtered.map((item) => (
          <section className="card" key={item.id}>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <small>{item.serving}</small>
            <div className="quality">
              {item.nutrients.slice(0, 6).map((nutrient) => (
                <span key={nutrient.name}>
                  {nutrient.name}:{" "}
                  {nutrient.amount.toFixed(nutrient.amount < 10 ? 1 : 0)}{" "}
                  {nutrient.unit} estimated
                </span>
              ))}
            </div>
            {item.nutrients.length === 0 && (
              <p className="muted">
                No tracked nutrient estimate yet. Enter values from the product
                label during review.
              </p>
            )}
            <Link className="button" href={`/app/foods/internal/${item.id}`}>
              Review and add
            </Link>
          </section>
        ))}
      </div>
    </>
  );
}
