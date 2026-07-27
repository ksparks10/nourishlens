import { InstagramRecipeImporter } from "@/features/recipes/instagram-recipe-importer";

function sharedInstagramUrl(url: string, text: string) {
  if (url) return url;
  return (
    text.match(
      /https:\/\/(?:www\.|m\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+[^\s]*/i,
    )?.[0] ?? ""
  );
}

export default async function ImportRecipe({
  searchParams,
}: {
  searchParams: Promise<{
    title?: string;
    text?: string;
    url?: string;
    error?: string;
  }>;
}) {
  const query = await searchParams;
  const url = sharedInstagramUrl(query.url ?? "", query.text ?? "");
  return (
    <>
      <p className="eyebrow">INSTAGRAM IMPORT</p>
      <h1>Turn a post into a recipe</h1>
      <p className="muted">
        Share an Instagram post or reel to Nourish Lens, or paste its link
        below. Public posts with the full recipe in the caption work best.
      </p>
      {query.error && (
        <p className="error" role="alert">
          {query.error}
        </p>
      )}
      <InstagramRecipeImporter
        sharedUrl={url}
        sharedText={query.text ?? ""}
      />
      <section className="card import-help">
        <h2>Share directly from Instagram</h2>
        <ol>
          <li>Install Nourish Lens from your browser’s app menu.</li>
          <li>In Instagram, tap Share, then Share to.</li>
          <li>Choose Nourish Lens and review the extracted recipe.</li>
        </ol>
        <p className="muted">
          Direct sharing depends on your phone and browser. Pasting the link
          always remains available. Private posts cannot be read.
        </p>
      </section>
    </>
  );
}
