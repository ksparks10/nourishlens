export type NutrientEducation = {
  overview: string;
  roles: string[];
  foodSources: string[];
  chemistry: string;
  chemicalQuery?: string;
  practicalNotes: string[];
  references: { label: string; href: string }[];
};

const roles: Record<string, string[]> = {
  energy_kcal: [
    "Measures usable dietary energy",
    "Supports every energy-requiring body process",
  ],
  protein: [
    "Supplies amino acids for tissue maintenance",
    "Supports enzymes, hormones, transporters, and immune proteins",
  ],
  carbohydrate: [
    "Provides glucose for cellular energy",
    "Replenishes glycogen in liver and muscle",
  ],
  fat: [
    "Provides concentrated energy",
    "Supports cell membranes and absorption of vitamins A, D, E, and K",
  ],
  fiber: [
    "Supports bowel function and the gut microbiome",
    "Can moderate glucose absorption and support healthy cholesterol levels",
  ],
  sodium: [
    "Supports fluid balance",
    "Required for nerve impulses and muscle contraction",
  ],
  vitamin_a: [
    "Supports vision",
    "Contributes to immune function and cell differentiation",
  ],
  vitamin_c: [
    "Required for collagen synthesis",
    "Acts as an antioxidant and improves nonheme iron absorption",
  ],
  vitamin_d: [
    "Supports calcium absorption and bone mineralization",
    "Contributes to muscle, nerve, and immune function",
  ],
  vitamin_e: [
    "Protects cell membranes from oxidation",
    "Supports immune function",
  ],
  vitamin_k: [
    "Required for normal blood-clotting proteins",
    "Supports bone-protein activation",
  ],
  thiamin: [
    "Helps convert carbohydrate into usable energy",
    "Supports nerve function",
  ],
  riboflavin: [
    "Forms the FAD and FMN coenzymes",
    "Supports energy metabolism and redox reactions",
  ],
  niacin: [
    "Forms NAD and NADP",
    "Supports energy transfer, DNA repair, and cellular signaling",
  ],
  pantothenic_acid: [
    "Forms coenzyme A",
    "Supports fatty-acid and energy metabolism",
  ],
  vitamin_b6: [
    "Supports amino-acid metabolism",
    "Contributes to neurotransmitter and hemoglobin synthesis",
  ],
  biotin: [
    "Acts as a carboxylase cofactor",
    "Supports fat, carbohydrate, and amino-acid metabolism",
  ],
  folate: [
    "Supports one-carbon metabolism and DNA synthesis",
    "Required for normal cell division and red-blood-cell formation",
  ],
  vitamin_b12: [
    "Supports neurologic function",
    "Required for DNA synthesis and healthy red blood cells",
  ],
  choline: [
    "Supports cell membranes and lipid transport",
    "Precursor to the neurotransmitter acetylcholine",
  ],
  calcium: [
    "Builds and maintains bones and teeth",
    "Supports muscle contraction, nerve signaling, and blood clotting",
  ],
  iron: [
    "Carries oxygen in hemoglobin and myoglobin",
    "Supports energy metabolism and many enzymes",
  ],
  potassium: [
    "Major intracellular electrolyte",
    "Supports nerve transmission, muscle contraction, and fluid balance",
  ],
  magnesium: [
    "Cofactor in hundreds of enzyme systems",
    "Supports energy production, muscle and nerve function, and bone",
  ],
  zinc: [
    "Supports catalytic and structural proteins",
    "Contributes to immune function, wound healing, and DNA synthesis",
  ],
  phosphorus: [
    "Structural component of bone and teeth",
    "Part of ATP, phospholipids, and nucleic acids",
  ],
  selenium: [
    "Component of antioxidant selenoproteins",
    "Supports thyroid-hormone metabolism",
  ],
  copper: [
    "Supports iron metabolism and connective tissue",
    "Component of antioxidant and energy enzymes",
  ],
  manganese: [
    "Enzyme cofactor",
    "Supports metabolism, bone formation, and antioxidant defense",
  ],
  iodine: [
    "Required to make thyroid hormones",
    "Supports metabolic regulation, growth, and development",
  ],
  chromium: [
    "Participates in normal macronutrient metabolism",
    "Its essential mechanisms remain incompletely defined",
  ],
  molybdenum: [
    "Cofactor for sulfite oxidase and other enzymes",
    "Helps metabolize sulfur compounds and purines",
  ],
  fluoride: [
    "Strengthens tooth mineral",
    "Helps make enamel more resistant to acid",
  ],
  chloride: [
    "Major extracellular anion for fluid balance",
    "Component of stomach hydrochloric acid",
  ],
  total_sugars: [
    "Provide carbohydrate energy",
    "Describe the combined mono- and disaccharides in a food",
  ],
  added_sugars: [
    "Provide dietary energy",
    "Track sugars introduced during processing or preparation",
  ],
  glucose: [
    "Primary circulating sugar and cellular fuel",
    "Especially important to glucose-dependent tissues",
  ],
  fructose: [
    "Provides carbohydrate energy",
    "Is primarily processed by the liver after absorption",
  ],
  saturated_fat: [
    "Provides energy and fatty-acid building blocks",
    "Intake context matters because different saturated fatty acids have different effects",
  ],
  monounsaturated_fat: [
    "Provides energy and membrane lipids",
    "Can replace saturated fat within an overall dietary pattern",
  ],
  polyunsaturated_fat: [
    "Supplies essential fatty acids",
    "Supports membranes and lipid signaling",
  ],
  cholesterol: [
    "Component of cell membranes",
    "Precursor for steroid hormones, bile acids, and vitamin D",
  ],
  omega_3: [
    "Supports membrane structure and lipid mediators",
    "Includes ALA, EPA, DHA, and related fatty acids",
  ],
  omega_6: [
    "Includes essential linoleic acid",
    "Supports membranes, skin integrity, growth, and signaling",
  ],
  ala: [
    "Essential plant omega-3 fatty acid",
    "Can be converted in limited amounts to EPA and DHA",
  ],
  epa: [
    "Precursor to lipid signaling molecules",
    "Contributes to marine omega-3 intake",
  ],
  dha: [
    "Important structural lipid in brain and retina",
    "Supports neural and visual membrane structure",
  ],
  caffeine: [
    "Stimulates the central nervous system",
    "Can increase alertness and temporarily reduce perceived fatigue",
  ],
  alcohol: [
    "Provides energy but is not an essential nutrient",
    "The body prioritizes its metabolism because it cannot be stored",
  ],
  water: [
    "Solvent and transport medium",
    "Supports temperature regulation and chemical reactions",
  ],
};

const foodSources: Record<string, string[]> = {
  protein: [
    "Fish, poultry, meat, eggs",
    "Dairy foods",
    "Beans, lentils, soy, nuts, and seeds",
  ],
  carbohydrate: [
    "Whole grains and starchy vegetables",
    "Fruit and legumes",
    "Milk and yogurt",
  ],
  fat: ["Oils, nuts, seeds, and avocado", "Fish, meat, dairy, and eggs"],
  fiber: [
    "Beans and lentils",
    "Whole grains",
    "Vegetables, fruit, nuts, and seeds",
  ],
  vitamin_a: [
    "Liver, eggs, and fortified dairy",
    "Carrots, sweet potatoes, spinach, and other orange or dark-green produce",
  ],
  vitamin_c: [
    "Citrus, kiwi, strawberries, and guava",
    "Bell peppers, broccoli, tomatoes, and potatoes",
  ],
  vitamin_d: [
    "Fatty fish and fish-liver oils",
    "Fortified milk and plant beverages",
    "Egg yolk and UV-exposed mushrooms",
  ],
  vitamin_e: [
    "Nuts, seeds, and vegetable oils",
    "Wheat germ, avocado, and leafy vegetables",
  ],
  vitamin_k: [
    "Leafy greens such as kale and spinach",
    "Broccoli and Brussels sprouts",
    "Some fermented foods",
  ],
  thiamin: ["Whole and enriched grains", "Pork", "Legumes, seeds, and nuts"],
  riboflavin: [
    "Milk, yogurt, and eggs",
    "Meat and almonds",
    "Fortified grains",
  ],
  niacin: ["Poultry, meat, and fish", "Peanuts, legumes, and enriched grains"],
  pantothenic_acid: [
    "Chicken, beef, eggs, and dairy",
    "Mushrooms, avocado, potatoes, and whole grains",
  ],
  vitamin_b6: [
    "Fish, poultry, and organ meats",
    "Potatoes, chickpeas, bananas, and fortified cereals",
  ],
  biotin: [
    "Eggs, meat, fish, nuts, and seeds",
    "Sweet potatoes and some vegetables",
  ],
  folate: [
    "Leafy greens, asparagus, and Brussels sprouts",
    "Beans, peas, citrus, and fortified grains",
  ],
  vitamin_b12: [
    "Fish, shellfish, meat, eggs, and dairy",
    "Fortified cereals and nutritional yeast",
  ],
  choline: [
    "Eggs, liver, meat, and fish",
    "Soybeans, dairy, and cruciferous vegetables",
  ],
  calcium: [
    "Milk, yogurt, and cheese",
    "Calcium-set tofu and fortified beverages",
    "Canned fish with bones and some leafy greens",
  ],
  iron: [
    "Meat, poultry, and seafood",
    "Beans, lentils, tofu, spinach, and fortified grains",
  ],
  potassium: [
    "Potatoes, beans, lentils, and squash",
    "Fruit, leafy greens, dairy, meat, and fish",
  ],
  magnesium: [
    "Nuts, seeds, beans, and whole grains",
    "Leafy greens and dark chocolate",
  ],
  zinc: [
    "Oysters, meat, poultry, and dairy",
    "Beans, nuts, seeds, and fortified cereals",
  ],
  phosphorus: [
    "Dairy, meat, fish, poultry, and eggs",
    "Legumes, nuts, seeds, and whole grains",
  ],
  selenium: [
    "Brazil nuts, seafood, meat, poultry, and eggs",
    "Grains; amounts vary with soil",
  ],
  copper: [
    "Shellfish, seeds, nuts, and organ meats",
    "Whole grains and dark chocolate",
  ],
  manganese: ["Whole grains, nuts, legumes, and tea", "Leafy vegetables"],
  iodine: [
    "Iodized salt",
    "Seafood, dairy, and eggs",
    "Seaweed, with highly variable amounts",
  ],
  chromium: [
    "Meat, whole grains, and some vegetables",
    "Amounts vary and food data are limited",
  ],
  molybdenum: ["Legumes, grains, and nuts", "Amounts vary with soil"],
  fluoride: [
    "Fluoridated water and beverages made with it",
    "Tea and some seafood",
  ],
  chloride: [
    "Table salt and salted foods",
    "Tomatoes, lettuce, olives, and seaweed",
  ],
  omega_3: ["Fatty fish and shellfish", "Flax, chia, walnuts, and canola oil"],
  omega_6: ["Soybean, corn, sunflower, and safflower oils", "Nuts and seeds"],
  ala: ["Flaxseed, chia, walnuts, hemp, and canola oil"],
  epa: ["Salmon, sardines, herring, mackerel, and fish oil"],
  dha: ["Fatty fish, seafood, algae, and algal oil"],
  caffeine: ["Coffee, tea, cocoa, cola, energy drinks, and some medicines"],
  water: [
    "Water and other beverages",
    "Fruit, vegetables, soups, yogurt, and other high-moisture foods",
  ],
};

const chemistry: Record<string, [string, string?]> = {
  glucose: [
    "A six-carbon monosaccharide; molecular formula C₆H₁₂O₆.",
    "glucose",
  ],
  fructose: [
    "A six-carbon ketohexose monosaccharide; molecular formula C₆H₁₂O₆.",
    "fructose",
  ],
  sucrose: [
    "A disaccharide of glucose and fructose; molecular formula C₁₂H₂₂O₁₁.",
    "sucrose",
  ],
  lactose: [
    "A disaccharide of glucose and galactose; molecular formula C₁₂H₂₂O₁₁.",
    "lactose",
  ],
  vitamin_c: [
    "Ascorbic acid/ascorbate; molecular formula C₆H₈O₆.",
    "ascorbic acid",
  ],
  vitamin_d: [
    "A family of secosteroids, chiefly vitamin D₂ and D₃; it does not have one single formula.",
    "cholecalciferol",
  ],
  thiamin: [
    "Vitamin B1 is commonly represented as the thiamine cation, C₁₂H₁₇N₄OS⁺.",
    "thiamine",
  ],
  riboflavin: [
    "An isoalloxazine vitamin; molecular formula C₁₇H₂₀N₄O₆.",
    "riboflavin",
  ],
  niacin: [
    "Includes nicotinic acid (C₆H₅NO₂) and nicotinamide (C₆H₆N₂O).",
    "nicotinic acid",
  ],
  pantothenic_acid: [
    "Vitamin B5; molecular formula C₉H₁₇NO₅.",
    "pantothenic acid",
  ],
  vitamin_b6: [
    "A family including pyridoxine, pyridoxal, and pyridoxamine; pyridoxine is C₈H₁₁NO₃.",
    "pyridoxine",
  ],
  biotin: [
    "A sulfur-containing bicyclic vitamin; molecular formula C₁₀H₁₆N₂O₃S.",
    "biotin",
  ],
  folate: [
    "A family of pteroylglutamate compounds; folic acid is C₁₉H₁₉N₇O₆.",
    "folic acid",
  ],
  vitamin_b12: [
    "A family of cobalt-containing corrinoids; cyanocobalamin is C₆₃H₈₈CoN₁₄O₁₄P.",
    "cyanocobalamin",
  ],
  choline: [
    "A quaternary ammonium compound; molecular formula C₅H₁₄NO⁺.",
    "choline",
  ],
  calcium: [
    "An element (Ca), present in foods and the body primarily as Ca²⁺ salts and mineral complexes.",
    "calcium",
  ],
  iron: [
    "An element (Fe), biologically cycling mainly between Fe²⁺ and Fe³⁺ states.",
    "iron",
  ],
  potassium: [
    "An element (K), present biologically as the K⁺ ion.",
    "potassium",
  ],
  magnesium: [
    "An element (Mg), present biologically mainly as Mg²⁺.",
    "magnesium",
  ],
  zinc: [
    "An element (Zn), present biologically mainly as Zn²⁺ bound to proteins.",
    "zinc",
  ],
  caffeine: [
    "A methylxanthine alkaloid; molecular formula C₈H₁₀N₄O₂.",
    "caffeine",
  ],
  alcohol: ["Tracked here as ethanol; molecular formula C₂H₆O.", "ethanol"],
  water: ["A bent polar molecule with formula H₂O.", "water"],
  ala: [
    "An 18-carbon omega-3 fatty acid with three cis double bonds; C₁₈H₃₀O₂.",
    "alpha-linolenic acid",
  ],
  epa: [
    "A 20-carbon omega-3 fatty acid with five cis double bonds; C₂₀H₃₀O₂.",
    "eicosapentaenoic acid",
  ],
  dha: [
    "A 22-carbon omega-3 fatty acid with six cis double bonds; C₂₂H₃₂O₂.",
    "docosahexaenoic acid",
  ],
};

const categoryDefaults: Record<
  string,
  Pick<NutrientEducation, "overview" | "roles" | "foodSources" | "chemistry">
> = {
  energy_macros: {
    overview:
      "A major dietary component used for energy, structure, or physiologic function.",
    roles: ["Contributes to whole-body energy or structural needs"],
    foodSources: [
      "Amounts vary across grains, legumes, produce, dairy, meat, fish, eggs, nuts, seeds, and oils",
    ],
    chemistry:
      "This tracked value represents a broad food component or measurement, not one molecule with a single chemical structure.",
  },
  vitamins: {
    overview:
      "An organic micronutrient needed in small amounts for normal metabolism and physiology.",
    roles: ["Acts directly or through coenzymes in regulated body processes"],
    foodSources: [
      "A varied diet containing produce, whole grains, legumes, dairy or fortified alternatives, eggs, fish, and other protein foods",
    ],
    chemistry:
      "Vitamins may occur in several related chemical forms called vitamers; the tracked total can therefore represent more than one molecule.",
  },
  minerals: {
    overview:
      "An inorganic nutrient element used structurally or as an electrolyte or enzyme cofactor.",
    roles: ["Supports structural, electrical, or enzyme-dependent processes"],
    foodSources: [
      "Whole and fortified foods; exact amounts depend on the element and food source",
    ],
    chemistry:
      "Minerals are elements, ions, or salts rather than carbon-based nutrient molecules.",
  },
  fatty_acids: {
    overview:
      "A lipid component distinguished by carbon-chain length and number and position of double bonds.",
    roles: ["Contributes energy, membrane structure, and lipid signaling"],
    foodSources: ["Oils, nuts, seeds, fish, meat, dairy, eggs, and avocado"],
    chemistry:
      "This value represents a fatty-acid class or sum. Members share a carboxyl group and hydrocarbon chain but do not have one structure.",
  },
  sugars: {
    overview:
      "A mono- or disaccharide that contributes carbohydrate and sweetness.",
    roles: ["Provides dietary energy after digestion and absorption"],
    foodSources: [
      "Fruit, vegetables, milk, grains, sweeteners, and prepared foods",
    ],
    chemistry:
      "This value can represent one sugar or a sum of several sugars; totals do not have one molecular structure.",
  },
  amino_acids: {
    overview:
      "An amino acid used to build proteins and other nitrogen-containing compounds.",
    roles: ["Supports protein synthesis and specialized metabolic pathways"],
    foodSources: [
      "Meat, fish, eggs, dairy, soy, beans, lentils, nuts, seeds, and grains",
    ],
    chemistry:
      "Amino acids contain amino and carboxyl groups attached to a central carbon; each side chain gives the amino acid its distinct structure.",
  },
  trace_elements: {
    overview: "An element needed or measured in very small quantities.",
    roles: [
      "May act as an enzyme cofactor, electrolyte, or structural component",
    ],
    foodSources: [
      "Amounts vary widely across water, soil-derived foods, seafood, animal foods, grains, and legumes",
    ],
    chemistry:
      "Trace elements occur as ions, salts, or protein-bound forms rather than as one organic molecule.",
  },
  bioactive_compounds: {
    overview:
      "A food component that can have physiologic activity but is not always an essential nutrient.",
    roles: [
      "Its effects depend on the specific compound, dose, and dietary context",
    ],
    foodSources: ["Plant and animal foods depending on the compound"],
    chemistry:
      "This category includes chemically diverse compounds and may not have one representative structure.",
  },
  polyphenols: {
    overview:
      "A family of plant compounds containing multiple phenolic features.",
    roles: [
      "Interact with oxidation, signaling, enzymes, and the gut microbiome; effects vary by compound",
    ],
    foodSources: [
      "Berries, cocoa, tea, coffee, herbs, spices, legumes, fruit, and vegetables",
    ],
    chemistry:
      "This is a chemical family containing many molecules, so a total or subclass does not have one molecular formula or structure.",
  },
};

export function getNutrientEducation(
  key: string,
  name: string,
  category: string,
): NutrientEducation {
  const fallback =
    categoryDefaults[category] ?? categoryDefaults.bioactive_compounds!;
  const chemical = chemistry[key];
  const aggregateKeys = new Set([
    "energy_kcal",
    "protein",
    "carbohydrate",
    "fat",
    "fiber",
    "total_sugars",
    "added_sugars",
    "saturated_fat",
    "monounsaturated_fat",
    "polyunsaturated_fat",
    "trans_fat",
    "omega_3",
    "omega_6",
    "phytosterols",
    "total_polyphenols",
    "flavonols",
    "flavan_3_ols",
    "flavanones",
    "anthocyanidins",
    "isoflavones",
    "proanthocyanidins",
    "flavones",
  ]);
  const canUseNameForStructure =
    [
      "vitamins",
      "minerals",
      "amino_acids",
      "trace_elements",
      "sugars",
      "bioactive_compounds",
    ].includes(category) && !aggregateKeys.has(key);
  const overview = roles[key]
    ? `${name} is tracked because it contributes to nutrition, metabolism, or food-composition understanding.`
    : fallback.overview;
  return {
    overview,
    roles: roles[key] ?? fallback.roles,
    foodSources: foodSources[key] ?? fallback.foodSources,
    chemistry: chemical?.[0] ?? fallback.chemistry,
    chemicalQuery: chemical?.[1] ?? (canUseNameForStructure ? name : undefined),
    practicalNotes: [
      "Food values vary by species, variety, growing conditions, preparation, processing, and serving size.",
      "A missing database value means not reported—not necessarily absent.",
      "This educational summary is not a diagnosis or individualized medical advice.",
    ],
    references: [
      {
        label: "NIH Office of Dietary Supplements fact sheets",
        href: "https://ods.od.nih.gov/factsheets/list-all/",
      },
      {
        label: "PubChem chemical information",
        href:
          chemical?.[1] || canUseNameForStructure
            ? `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(chemical?.[1] ?? name)}`
            : "https://pubchem.ncbi.nlm.nih.gov/",
      },
    ],
  };
}
