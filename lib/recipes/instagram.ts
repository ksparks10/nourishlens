export type ImportedIngredient = {
  raw: string;
  amount: string;
  unit: string;
  name: string;
};

export type ImportedRecipe = {
  name: string;
  description: string;
  servings: number;
  ingredients: ImportedIngredient[];
  instructions: string[];
};

const instagramHosts = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);

export function normalizeInstagramUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !instagramHosts.has(url.hostname))
      return null;
    const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    return `https://www.instagram.com/${match[1]}/${match[2]}/`;
  } catch {
    return null;
  }
}

export function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x"))
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      if (code.startsWith("#"))
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      return named[code.toLowerCase()] ?? entity;
    },
  );
}

export function captionFromInstagramHtml(html: string) {
  const tags = html.match(/<meta\b[^>]{0,4096}>/gi) ?? [];
  for (const tag of tags) {
    const key = tag.match(
      /(?:property|name)=["'](og:description|description)["']/i,
    )?.[1];
    if (!key) continue;
    const content = tag.match(/content=(["'])(.*?)\1/i)?.[2];
    if (!content) continue;
    let value = decodeHtml(content)
      .replace(/\\n/g, "\n")
      .trim();
    const quotedCaption = value.match(
      /(?:Instagram|on Instagram):\s*[“"]([\s\S]+)[”"]\.?$/,
    );
    if (quotedCaption?.[1]) value = quotedCaption[1].trim();
    if (
      value.length >= 20 &&
      !/^(Instagram|Log in|Create an account)$/i.test(value)
    )
      return value;
  }
  return null;
}

const ingredientHeader = /^(ingredients?|what you(?:'|’)ll need)\s*:?\s*$/i;
const instructionHeader =
  /^(instructions?|directions?|method|steps?|how to make it)\s*:?\s*$/i;
const measurement =
  /^(?:(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])\s*)?(cups?|c|tablespoons?|tbsp|tbs|teaspoons?|tsp|grams?|g|kilograms?|kg|ounces?|oz|pounds?|lbs?|millilit(?:er|re)s?|ml|lit(?:er|re)s?|l|cloves?|cans?|packages?|packets?|pieces?|slices?|pinch(?:es)?|handfuls?)?\s*(?:of\s+)?(.+)$/i;

function cleanLine(value: string) {
  return value
    .replace(/^[\s•●▪◦*-]+/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

export function parseIngredientLine(rawValue: string): ImportedIngredient {
  const raw = cleanLine(rawValue);
  const match = raw.match(measurement);
  return {
    raw,
    amount: match?.[1]?.trim() ?? "",
    unit: match?.[2]?.trim() ?? "",
    name: match?.[3]?.trim() || raw,
  };
}

function looksLikeIngredient(value: string) {
  return Boolean(
    value.match(
      /^(?:[\s•●▪◦*-]*)(?:\d+(?:\.\d+)?|\d+\/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(?:cup|c\b|tbsp|tbs\b|tsp|g\b|kg\b|oz\b|lb|ml\b|l\b|clove|can|package|packet|piece|slice|pinch|handful)/i,
    ),
  );
}

function usableTitle(value: string) {
  const title = cleanLine(value)
    .replace(/^recipe\s*:?\s*/i, "")
    .replace(/\s*[|—-]\s*(?:save|follow|comment).*$/i, "")
    .trim();
  if (
    title.length < 2 ||
    title.length > 120 ||
    /^(@|#|save\b|follow\b|comment\b|ingredients?\b)/i.test(title)
  )
    return null;
  return title;
}

export function parseRecipeCaption(caption: string): ImportedRecipe {
  const lines = caption
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^#(?:\w+\s*)+$/.test(line));
  const ingredientIndex = lines.findIndex((line) =>
    ingredientHeader.test(cleanLine(line)),
  );
  const instructionIndex = lines.findIndex((line) =>
    instructionHeader.test(cleanLine(line)),
  );

  const ingredientLines =
    ingredientIndex >= 0
      ? lines.slice(
          ingredientIndex + 1,
          instructionIndex > ingredientIndex ? instructionIndex : undefined,
        )
      : lines.filter(looksLikeIngredient);
  const instructions =
    instructionIndex >= 0
      ? lines.slice(instructionIndex + 1).map(cleanLine).filter(Boolean)
      : lines
          .filter((line) => /^\d+[.)]\s+/.test(line))
          .map(cleanLine)
          .filter((line) => !ingredientLines.includes(line));

  const firstSection = [ingredientIndex, instructionIndex]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const introduction =
    firstSection === undefined ? lines : lines.slice(0, firstSection);
  const name =
    introduction.map(usableTitle).find(Boolean) ??
    lines.map(usableTitle).find(Boolean) ??
    "Imported Instagram recipe";
  const servingMatch = caption.match(
    /\b(?:serves?|servings?|makes)\s*:?\s*(\d+(?:\.\d+)?)/i,
  );
  const description = introduction
    .slice(1)
    .filter((line) => !/\b(?:serves?|servings?|makes)\b/i.test(line))
    .join(" ")
    .slice(0, 1000);

  return {
    name,
    description,
    servings: servingMatch ? Number(servingMatch[1]) : 4,
    ingredients: ingredientLines
      .map(parseIngredientLine)
      .filter((item) => item.name.length > 0)
      .slice(0, 60),
    instructions: instructions.slice(0, 40),
  };
}
