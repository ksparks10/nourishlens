"use client";

import { useCallback, useEffect, useState } from "react";
import { createImportedRecipe } from "@/app/app/recipes/actions";
import type { ImportedRecipe } from "@/lib/recipes/instagram";

type ImportResponse = {
  sourceUrl?: string;
  caption?: string;
  recipe?: ImportedRecipe;
  error?: string;
  needsCaption?: boolean;
};

export function InstagramRecipeImporter({
  sharedUrl,
  sharedText,
}: {
  sharedUrl: string;
  sharedText: string;
}) {
  const [url, setUrl] = useState(sharedUrl);
  const [caption, setCaption] = useState(
    sharedText.includes("instagram.com") ? "" : sharedText,
  );
  const [recipe, setRecipe] = useState<ImportedRecipe | null>(null);
  const [sourceCaption, setSourceCaption] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCaption, setShowCaption] = useState(false);

  const analyze = useCallback(async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError("");
    setRecipe(null);
    let timeout: number | undefined;
    try {
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 12000);
      const response = await fetch("/api/recipes/import/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, caption }),
        signal: controller.signal,
      });
      const result = (await response.json()) as ImportResponse;
      if (!response.ok || !result.recipe) {
        setError(result.error ?? "Unable to import this Instagram recipe.");
        setShowCaption(Boolean(result.needsCaption));
        if (result.caption && !caption) setCaption(result.caption);
        return;
      }
      setRecipe(result.recipe);
      setSourceCaption(result.caption ?? caption);
      setUrl(result.sourceUrl ?? url);
      setShowCaption(false);
    } catch {
      setError(
        "Instagram did not provide the caption in time. Paste the post caption below to finish the import.",
      );
      setShowCaption(true);
    } finally {
      if (timeout) window.clearTimeout(timeout);
      setLoading(false);
    }
  }, [caption, loading, url]);

  useEffect(() => {
    if (sharedUrl) void analyze();
    // The shared URL should trigger exactly once when the share target opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="instagram-import-flow">
      <section className="card form">
        <label>
          Instagram post or reel link
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            required
          />
        </label>
        {showCaption && (
          <label>
            Instagram caption
            <textarea
              rows={12}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder={
                "Paste the caption, including the ingredients and directions."
              }
              required
            />
          </label>
        )}
        <button
          className="button"
          type="button"
          disabled={loading || !url.trim()}
          onClick={() => void analyze()}
        >
          {loading ? "Extracting recipe…" : "Extract recipe"}
        </button>
        {loading && (
          <div className="import-progress" role="status" aria-live="polite">
            <span />
            Checking the public caption and organizing the recipe…
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      {recipe && (
        <form className="card form import-review" action={createImportedRecipe}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">REVIEW IMPORT</p>
              <h2>Confirm the extracted recipe</h2>
            </div>
            <span>Nothing is saved until you confirm</span>
          </div>
          <input type="hidden" name="source_url" value={url} />
          <input
            type="hidden"
            name="source_caption"
            value={sourceCaption}
          />
          <label>
            Recipe name
            <input name="name" defaultValue={recipe.name} required />
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={3}
              defaultValue={recipe.description}
            />
          </label>
          <label>
            Servings
            <input
              name="servings"
              type="number"
              min=".1"
              max="1000"
              step=".1"
              defaultValue={recipe.servings}
              required
            />
          </label>
          <label>
            Ingredients — one per line
            <textarea
              name="ingredients_text"
              rows={Math.min(Math.max(recipe.ingredients.length + 1, 6), 18)}
              defaultValue={recipe.ingredients
                .map((ingredient) => ingredient.raw)
                .join("\n")}
              required
            />
          </label>
          <label>
            Directions — one step per line
            <textarea
              name="instructions_text"
              rows={Math.min(Math.max(recipe.instructions.length + 1, 6), 18)}
              defaultValue={recipe.instructions.join("\n")}
            />
          </label>
          <button className="button">Save to Recipes</button>
        </form>
      )}
    </div>
  );
}
