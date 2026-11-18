import type { RecipeIngredientInput, RecipePreferences, RecipeSuggestResponse, RecipeSuggestion } from "../../../../lib/recipe-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type MealSummary = { idMeal: string; strMeal: string; strMealThumb: string | null };
type Meal = MealSummary & Record<string, string | null>;
type RankedRecipe = RecipeSuggestion & {
  score: number;
  coverage: number;
  urgencyCoverage: number;
  cuisineFit: number;
  substantialMissingCount: number;
  strictMatch: boolean;
};

const DESCRIPTORS = new Set(["baby", "cherry", "fresh", "frozen", "organic", "plain", "greek", "basmati", "sourdough", "whole", "cooked", "raw", "sliced", "diced", "chopped"]);
const MEAT_WORDS = ["beef", "chicken", "pork", "lamb", "turkey", "bacon", "ham", "sausage", "fish", "salmon", "tuna", "shrimp", "prawn", "crab", "anchovy", "gelatin"];
const DAIRY_WORDS = ["milk", "cream", "cheese", "butter", "yogurt", "yoghurt", "whey", "casein", "ghee"];
const GLUTEN_WORDS = ["wheat", "flour", "bread", "pasta", "noodle", "couscous", "barley", "rye", "soy sauce", "tortilla"];
const PANTRY_STAPLE_WORDS = new Set([
  "salt", "pepper", "oil", "water", "garlic", "ginger", "vinegar", "sauce", "ketchup", "mustard", "mayonnaise",
  "seasoning", "seasonings", "spice", "spices", "herb", "herbs", "paprika", "cumin", "turmeric", "cinnamon", "nutmeg", "oregano", "thyme", "basil",
  "parsley", "cilantro", "coriander", "rosemary", "chive", "dill", "fennel", "clove", "cardamom", "extract",
]);
const CUISINE_AREAS: Record<string, string[]> = {
  Mediterranean: ["Greek", "Italian", "Spanish", "French", "Turkish", "Tunisian", "Moroccan", "Croatian"],
  "Middle Eastern": ["Turkish", "Lebanese", "Egyptian", "Saudi Arabian", "Iranian", "Syrian", "Jordanian", "Israeli"],
};

function cleanText(value: unknown, maximum = 80) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function singularize(value: string) {
  if (value.endsWith("atoes")) return value.slice(0, -2);
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("ses")) return value.slice(0, -2);
  if (value.endsWith("s") && !value.endsWith("ss")) return value.slice(0, -1);
  return value;
}

function ingredientMatches(recipeIngredient: string, pantryIngredient: string) {
  const recipe = singularize(normalize(recipeIngredient));
  const pantry = singularize(normalize(pantryIngredient));
  if (!recipe || !pantry) return false;
  if (recipe.includes(pantry) || pantry.includes(recipe)) return true;
  const recipeWords = new Set(recipe.split(" ").filter((word) => word.length > 2));
  const pantryWords = pantry.split(" ").filter((word) => word.length > 2 && !DESCRIPTORS.has(word));
  return pantryWords.length > 0 && pantryWords.every((word) => recipeWords.has(word));
}

function isPantryStaple(ingredient: string) {
  const normalized = normalize(ingredient);
  const words = normalized.split(" ");
  if (words.some((word) => PANTRY_STAPLE_WORDS.has(word) || PANTRY_STAPLE_WORDS.has(singularize(word)))) return true;
  return normalized.includes("chili powder")
    || normalized.includes("chilli powder")
    || normalized.includes("chili flake")
    || normalized.includes("chilli flake")
    || normalized.includes("onion powder")
    || normalized.includes("curry powder")
    || normalized.includes("curry paste")
    || normalized.includes("bay leaf");
}

function validateBody(value: unknown): { ingredients: RecipeIngredientInput[]; preferences: RecipePreferences } | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.ingredients) || !body.ingredients.length || body.ingredients.length > 15) return null;
  const ingredients = body.ingredients.map((item) => {
    const candidate = item as Record<string, unknown>;
    return {
      name: cleanText(candidate?.name, 70),
      expiresOn: cleanText(candidate?.expiresOn, 10),
      daysUntilExpiration: Number(candidate?.daysUntilExpiration),
    };
  }).filter((item) => item.name && Number.isFinite(item.daysUntilExpiration));
  if (!ingredients.length) return null;
  const input = (body.preferences ?? {}) as Record<string, unknown>;
  const maximumTime = Number(input.maximumTime);
  return {
    ingredients,
    preferences: {
      cuisine: cleanText(input.cuisine, 40) || "Any cuisine",
      diet: cleanText(input.diet, 40) || "None",
      mealType: cleanText(input.mealType, 40) || "Any meal",
      maximumTime: Number.isFinite(maximumTime) ? Math.min(180, Math.max(10, maximumTime)) : 45,
      allowExtras: input.allowExtras !== false,
    },
  };
}

function ingredientQueries(name: string) {
  const normalized = normalize(name);
  const words = normalized.split(" ");
  const simplified = words.filter((word) => !DESCRIPTORS.has(word)).join(" ");
  const singular = simplified.split(" ").map(singularize).join(" ");
  const finalWord = singularize(words.at(-1) ?? "");
  return [...new Set([normalized, simplified, singular, finalWord].filter(Boolean))].slice(0, 3);
}

async function fetchMealDb<T>(path: string, apiKey: string) {
  const response = await fetch(`https://www.themealdb.com/api/json/v1/${encodeURIComponent(apiKey)}/${path}`, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`TheMealDB request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

async function searchForIngredient(ingredient: RecipeIngredientInput, apiKey: string) {
  for (const query of ingredientQueries(ingredient.name)) {
    const data = await fetchMealDb<{ meals: MealSummary[] | null }>(`filter.php?i=${encodeURIComponent(query.replace(/ /g, "_"))}`, apiKey);
    if (data.meals?.length) return data.meals;
  }
  return [];
}

function mealIngredients(meal: Meal) {
  return Array.from({ length: 20 }, (_, index) => cleanText(meal[`strIngredient${index + 1}`], 80)).filter(Boolean);
}

function mealIngredientDetails(meal: Meal) {
  return Array.from({ length: 20 }, (_, index) => ({
    name: cleanText(meal[`strIngredient${index + 1}`], 80),
    measure: cleanText(meal[`strMeasure${index + 1}`], 80),
  })).filter((ingredient) => ingredient.name);
}

function instructionSteps(instructions: string | null) {
  if (!instructions) return [];
  const text = instructions.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  const lines = text.split(/\n+/).map((line) => line.replace(/^\s*(?:step\s*)?\d+[).:\-]?\s*/i, "").trim()).filter(Boolean);
  if (lines.length > 1) return lines.slice(0, 16);
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((step) => step.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function mealTags(meal: Meal) {
  return [meal.strMeal, meal.strCategory, meal.strArea, meal.strTags].filter((value): value is string => Boolean(value)).join(" ");
}

function containsAny(haystack: string, needles: string[]) {
  const value = normalize(haystack);
  return needles.some((needle) => value.includes(normalize(needle)));
}

function meetsDiet(meal: Meal, diet: string) {
  const ingredients = mealIngredients(meal).join(" ");
  if (diet === "Vegetarian") return !containsAny(ingredients, MEAT_WORDS);
  if (diet === "Vegan") return !containsAny(ingredients, [...MEAT_WORDS, ...DAIRY_WORDS, "egg", "honey"]);
  if (diet === "Dairy-free") return !containsAny(ingredients, DAIRY_WORDS);
  if (diet === "Gluten-free") return !containsAny(ingredients, GLUTEN_WORDS);
  return true;
}

function cuisineMatch(meal: Meal, preference: string) {
  if (preference === "Any cuisine") return 1;
  const tags = normalize(mealTags(meal));
  const acceptedAreas = CUISINE_AREAS[preference] ?? [preference];
  return acceptedAreas.some((area) => tags.includes(normalize(area))) ? 1 : 0;
}

function mealPreferenceMatch(meal: Meal, preference: string) {
  if (preference === "Any meal") return 1;
  const tags = normalize(mealTags(meal));
  if (tags.includes(normalize(preference))) return 1;
  if (preference === "Dinner" && ["main", "beef", "chicken", "pork", "seafood", "vegetarian"].some((word) => tags.includes(word))) return 0.8;
  if (preference === "Lunch" && ["main", "side", "starter", "salad"].some((word) => tags.includes(word))) return 0.7;
  if (preference === "Snack" && ["starter", "side", "snack"].some((word) => tags.includes(word))) return 0.8;
  return 0;
}

function estimateMinutes(instructions: string | null) {
  if (!instructions) return null;
  const minutes: number[] = [];
  const minutePattern = /(\d+)\s*(?:-|to)?\s*(\d+)?\s*(?:minutes?|mins?)/gi;
  const hourPattern = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/gi;
  for (const match of instructions.matchAll(minutePattern)) minutes.push(Number(match[2] || match[1]));
  for (const match of instructions.matchAll(hourPattern)) minutes.push(Math.round(Number(match[1]) * 60));
  if (!minutes.length) return null;
  const total = minutes.reduce((sum, value) => sum + value, 0);
  return total > 0 && total <= 240 ? total : null;
}

function naturalList(items: string[]) {
  if (items.length <= 1) return items[0] || "your selected food";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function sourceDetails(meal: Meal) {
  const slug = normalize(meal.strMeal).replace(/ /g, "-");
  return {
    url: `https://www.themealdb.com/meal/${meal.idMeal}-${slug}-recipe`,
    name: "TheMealDB",
  };
}

function scoreMeal(meal: Meal, ingredients: RecipeIngredientInput[], preferences: RecipePreferences): RankedRecipe | null {
  if (!meetsDiet(meal, preferences.diet)) return null;
  const recipeIngredients = mealIngredients(meal);
  const uses = ingredients.filter((item) => recipeIngredients.some((name) => ingredientMatches(name, item.name))).map((item) => item.name);
  if (!uses.length) return null;
  const urgentNames = ingredients.filter((item) => item.daysUntilExpiration <= 3).map((item) => item.name);
  const urgentUses = urgentNames.filter((item) => uses.includes(item));
  const missing = recipeIngredients.filter((name) => !ingredients.some((item) => ingredientMatches(name, item.name)));
  const substantialMissing = missing.filter((name) => !isPantryStaple(name));
  const coverage = uses.length / ingredients.length;
  const urgencyCoverage = urgentNames.length ? urgentUses.length / urgentNames.length : coverage;
  const cuisineFit = cuisineMatch(meal, preferences.cuisine);
  const mealFit = mealPreferenceMatch(meal, preferences.mealType);
  const time = estimateMinutes(meal.strInstructions);
  const timeFit = time === null ? 0.55 : Math.max(0, 1 - Math.max(0, time - preferences.maximumTime) / preferences.maximumTime);
  const extraFit = preferences.allowExtras ? Math.max(0, 1 - missing.length / 18) : Math.max(0, 1 - substantialMissing.length / 4);
  const extraPenalty = preferences.allowExtras ? 0 : substantialMissing.length * 11;
  const score = Math.round(Math.max(1, Math.min(99, 25 + coverage * 30 + urgencyCoverage * 25 + cuisineFit * 12 + mealFit * 3 + timeFit * 2 + extraFit * 3 - extraPenalty)));
  const cuisine = meal.strArea || "Global";
  const category = normalize(meal.strCategory || "meal");
  const categoryPhrase = category === "vegetarian" ? "vegetarian dish" : category === "miscellaneous" ? "recipe" : `${category} recipe`;
  const recipeStyle = `${cuisine} ${categoryPhrase}`;
  const article = /^[aeiou]/i.test(recipeStyle) ? "An" : "A";
  const strictDescription = substantialMissing.length === 0
    ? " with no additional main ingredients"
    : ` with ${substantialMissing.length} additional main ${substantialMissing.length === 1 ? "ingredient" : "ingredients"}`;
  const description = `${article} ${recipeStyle} that uses ${naturalList(uses.slice(0, 3))}${preferences.allowExtras ? (missing.length <= 4 ? " with only a few additional ingredients" : " in a practical, satisfying dish") : strictDescription}.`;
  const reason = !preferences.allowExtras
    ? substantialMissing.length === 0
      ? `Uses only your selected food${uses.length === 1 ? "" : "s"}, plus basic sauces and seasonings.`
      : `Uses ${uses.length} selected ${uses.length === 1 ? "ingredient" : "ingredients"} and needs only ${substantialMissing.length} additional main ${substantialMissing.length === 1 ? "ingredient" : "ingredients"}.`
    : urgentUses.length
      ? `Prioritizes ${naturalList(urgentUses.slice(0, 2))} before ${urgentUses.length === 1 ? "it expires" : "they expire"} and uses ${uses.length} selected ${uses.length === 1 ? "ingredient" : "ingredients"}.`
      : `Uses ${uses.length} of your ${ingredients.length} selected ingredients and keeps extra shopping ${missing.length <= 4 ? "low" : "focused"}.`;
  const source = sourceDetails(meal);
  return {
    score,
    coverage,
    urgencyCoverage,
    cuisineFit,
    substantialMissingCount: substantialMissing.length,
    strictMatch: substantialMissing.length === 0,
    id: meal.idMeal,
    title: meal.strMeal,
    description,
    imageUrl: meal.strMealThumb,
    sourceUrl: source.url,
    sourceName: source.name,
    time,
    timeEstimated: time !== null,
    match: score,
    uses,
    urgentUses,
    missing: missing.slice(0, 6),
    ingredients: mealIngredientDetails(meal),
    steps: instructionSteps(meal.strInstructions),
    cuisine,
    reason,
    attribution: "source-backed",
  };
}

async function findRecipes(ingredients: RecipeIngredientInput[], preferences: RecipePreferences, apiKey: string) {
  const searchIngredients = [...ingredients].sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration).slice(0, 6);
  const searchResults = await Promise.all(searchIngredients.map(async (ingredient) => ({ ingredient, meals: await searchForIngredient(ingredient, apiKey) })));
  const candidates = new Map<string, { summary: MealSummary; hits: number }>();
  for (const result of searchResults) {
    for (const meal of result.meals) {
      const current = candidates.get(meal.idMeal);
      candidates.set(meal.idMeal, { summary: meal, hits: (current?.hits ?? 0) + 1 });
    }
  }
  const ids = [...candidates.values()].sort((a, b) => b.hits - a.hits).slice(0, 24).map((candidate) => candidate.summary.idMeal);
  const details = await Promise.all(ids.map((id) => fetchMealDb<{ meals: Meal[] | null }>(`lookup.php?i=${encodeURIComponent(id)}`, apiKey)));
  const ranked = details
    .flatMap((result) => result.meals ?? [])
    .map((meal) => scoreMeal(meal, ingredients, preferences))
    .filter((recipe): recipe is RankedRecipe => Boolean(recipe))
    .sort((a, b) => preferences.allowExtras
      ? b.urgencyCoverage - a.urgencyCoverage || b.coverage - a.coverage || b.cuisineFit - a.cuisineFit || b.score - a.score
      : a.substantialMissingCount - b.substantialMissingCount || b.coverage - a.coverage || b.urgencyCoverage - a.urgencyCoverage || b.cuisineFit - a.cuisineFit || b.score - a.score);
  const topRanked = ranked.slice(0, 3);
  const exactFullMatchCount = ranked.filter((recipe) => recipe.strictMatch && recipe.coverage === 1).length;
  const topResultsNeedSeveralExtras = topRanked.some((recipe) => recipe.substantialMissingCount >= 3);
  const topResultsMissSelectedFood = topRanked.some((recipe) => recipe.coverage < 1);
  const cuisineMatchCount = preferences.cuisine === "Any cuisine" ? topRanked.length : topRanked.filter((recipe) => recipe.cuisineFit === 1).length;
  const ingredientNames = ingredients.slice(0, 3).map((ingredient) => ingredient.name);
  const ingredientSummary = `${naturalList(ingredientNames)}${ingredients.length > 3 ? " and your other selected ingredients" : ""}`;
  const notices: string[] = [];
  if (!preferences.allowExtras && (exactFullMatchCount < 3 || topResultsNeedSeveralExtras || topResultsMissSelectedFood)) {
    notices.push(`Few recipes use only ${ingredientSummary} with basic sauces and seasonings. The closest matches use as few additional main ingredients as possible, and some may not include every selected food.`);
  }
  if (preferences.cuisine !== "Any cuisine" && cuisineMatchCount < 3) {
    notices.push(`There aren’t many ${preferences.cuisine} recipes that use ${ingredientSummary}. These results still prioritize your ingredients, so some recipes may come from other cuisines.`);
  }
  const notice = notices.length ? notices.join(" ") : null;
  const recipes = topRanked.map(({ score: _score, coverage: _coverage, urgencyCoverage: _urgencyCoverage, cuisineFit: _cuisineFit, substantialMissingCount: _substantialMissingCount, strictMatch: _strictMatch, ...recipe }) => recipe);
  return { recipes, notice };
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Send a valid JSON request." }, { status: 400 }); }
  const input = validateBody(body);
  if (!input) return Response.json({ error: "Select between 1 and 15 valid ingredients." }, { status: 400 });

  try {
    const { recipes, notice } = await findRecipes(input.ingredients, input.preferences, process.env.THEMEALDB_API_KEY || "1");
    if (!recipes.length) return Response.json({ error: "No recipes matched those ingredients and preferences. Try selecting a common main ingredient or choosing broader preferences." }, { status: 404 });
    const response: RecipeSuggestResponse = {
      recipes,
      mode: "live-ranked",
      message: input.preferences.allowExtras
        ? "Live recipes from TheMealDB, ranked by urgent ingredients first, then cuisine fit."
        : "Strict matches ranked by the fewest additional main ingredients, then selected-ingredient coverage.",
      notice,
    };
    return Response.json(response);
  } catch (error) {
    console.error("Recipe suggestion request failed.", error);
    return Response.json({ error: "The free recipe service is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
