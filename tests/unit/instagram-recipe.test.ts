import { describe, expect, it } from "vitest";
import {
  captionFromInstagramHtml,
  normalizeInstagramUrl,
  parseRecipeCaption,
} from "../../lib/recipes/instagram";

describe("Instagram recipe importing", () => {
  it("accepts only supported Instagram post URLs", () => {
    expect(
      normalizeInstagramUrl(
        "https://www.instagram.com/reel/ABC_123/?igsh=tracking",
      ),
    ).toBe("https://www.instagram.com/reel/ABC_123/");
    expect(normalizeInstagramUrl("https://example.com/reel/ABC_123")).toBeNull();
    expect(normalizeInstagramUrl("http://instagram.com/p/ABC_123")).toBeNull();
  });

  it("extracts and decodes a public caption from link metadata", () => {
    const html =
      '<meta property="og:description" content="Cook on Instagram: &quot;Easy Soup&#10;Ingredients&#10;2 cups broth&#10;Directions&#10;1. Simmer.&quot;">';
    expect(captionFromInstagramHtml(html)).toContain("2 cups broth");
  });

  it("organizes a caption into an editable recipe", () => {
    const recipe = parseRecipeCaption(`Creamy Tomato Pasta
Serves 4
Ingredients
12 oz pasta
2 cups tomato sauce
1/2 cup parmesan
Directions
1. Boil the pasta.
2. Stir in the sauce and cheese.`);
    expect(recipe.name).toBe("Creamy Tomato Pasta");
    expect(recipe.servings).toBe(4);
    expect(recipe.ingredients).toHaveLength(3);
    expect(recipe.ingredients[0]).toMatchObject({
      amount: "12",
      unit: "oz",
      name: "pasta",
    });
    expect(recipe.instructions).toEqual([
      "Boil the pasta.",
      "Stir in the sauce and cheese.",
    ]);
  });
});
