const phraseAliases: Array<[RegExp, string]> = [
  [/\bmac\s*(?:and|&)\s*cheese\b/g, "macaroni cheese"],
  [/\bmens?\s+(?:multi\s*)?vitamins?\b/g, "men multivitamin"],
  [/\bwomens?\s+(?:multi\s*)?vitamins?\b/g, "women multivitamin"],
  [/\bkids?\s+(?:multi\s*)?vitamins?\b/g, "children multivitamin"],
  [/\bmulti\s+vitamin\b/g, "multivitamin"],
  [/\bfish\s+oils?\b/g, "fish oil"],
  [/\bomega\s*[- ]?\s*3\b/g, "omega 3"],
];

const tokenAliases: Record<string, string> = {
  apples: "apple",
  avacado: "avocado",
  bannana: "banana",
  bananas: "banana",
  beans: "bean",
  blueberries: "blueberry",
  brocolli: "broccoli",
  califlower: "cauliflower",
  carrots: "carrot",
  chiken: "chicken",
  collegen: "collagen",
  creatine: "creatine",
  eggz: "egg",
  eggs: "egg",
  fettucine: "fettuccine",
  fettuccini: "fettuccine",
  fil: "fish",
  magnesum: "magnesium",
  multivitmain: "multivitamin",
  multivitamins: "multivitamin",
  mushrooms: "mushroom",
  oranges: "orange",
  penut: "peanut",
  penuts: "peanut",
  peanuts: "peanut",
  peper: "pepper",
  portabella: "portobello",
  portabello: "portobello",
  potatos: "potato",
  potatoes: "potato",
  salamon: "salmon",
  sphagetti: "spaghetti",
  spagetti: "spaghetti",
  stake: "steak",
  steaks: "steak",
  strawberries: "strawberry",
  supplament: "supplement",
  suppliement: "supplement",
  suppliment: "supplement",
  supplements: "supplement",
  tomatos: "tomato",
  tomatoes: "tomato",
  vitamins: "vitamin",
  yoghurt: "yogurt",
  yogart: "yogurt",
};

export function normalizeSearchQuery(value: string) {
  let normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of phraseAliases)
    normalized = normalized.replace(pattern, replacement);
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => tokenAliases[token] ?? token)
    .join(" ");
}

const weakCatalogTokens = new Set([
  "a",
  "an",
  "and",
  "food",
  "fresh",
  "of",
  "or",
  "plain",
  "prepared",
  "raw",
  "the",
  "with",
]);

export function catalogFallbackQueries(value: string) {
  const normalized = normalizeSearchQuery(value);
  if (!normalized) return [];
  const meaningful = normalized
    .split(" ")
    .filter((token) => token.length >= 3 && !weakCatalogTokens.has(token));
  return Array.from(
    new Set([
      normalized,
      meaningful.join(" "),
      [...meaningful].reverse().join(" "),
      ...meaningful,
    ]),
  )
    .filter(Boolean)
    .slice(0, 8);
}

export function editDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0] ?? 0;
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j] ?? j;
      previous[j] = Math.min(
        above + 1,
        (previous[j - 1] ?? i) + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length] ?? Math.max(a.length, b.length);
}

export function fuzzyTokenMatch(queryToken: string, candidateToken: string) {
  if (
    candidateToken.includes(queryToken) ||
    queryToken.includes(candidateToken)
  )
    return true;
  const allowance = queryToken.length >= 8 ? 2 : queryToken.length >= 4 ? 1 : 0;
  return editDistance(queryToken, candidateToken) <= allowance;
}

export function searchTextScore(query: string, candidate: string) {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedCandidate = normalizeSearchQuery(candidate);
  if (!normalizedQuery) return 1;
  if (normalizedCandidate.includes(normalizedQuery)) return 100;
  const queryTokens = normalizedQuery.split(" ");
  const candidateTokens = normalizedCandidate.split(" ");
  return queryTokens.reduce(
    (score, token) =>
      score +
      (candidateTokens.some((candidateToken) =>
        fuzzyTokenMatch(token, candidateToken),
      )
        ? 10
        : 0),
    0,
  );
}

export function foodNameMatchScore(
  query: string,
  name: string,
  brand: string | null = null,
) {
  const normalizedQuery = normalizeSearchQuery(query);
  const normalizedName = normalizeSearchQuery(name);
  if (!normalizedQuery) return 1;
  if (normalizedName === normalizedQuery) return 1000;
  if (normalizedName.startsWith(`${normalizedQuery} `)) return 900;

  const queryTokens = normalizedQuery.split(" ");
  const nameTokens = normalizedName.split(" ");
  const firstExactToken = nameTokens.findIndex((token) =>
    queryTokens.includes(token),
  );
  const phrasePosition = normalizedName.indexOf(normalizedQuery);
  if (phrasePosition >= 0)
    return 700 - Math.min(firstExactToken < 0 ? 20 : firstExactToken * 25, 150);

  const nameScore = searchTextScore(normalizedQuery, normalizedName);
  const brandScore = brand
    ? searchTextScore(normalizedQuery, normalizeSearchQuery(brand))
    : 0;
  return nameScore * 5 + brandScore;
}
