export type RecipeIngredientInput = {
  name: string;
  expiresOn: string;
  daysUntilExpiration: number;
};

export type RecipePreferences = {
  cuisine: string;
  diet: string;
  mealType: string;
  maximumTime: number;
  allowExtras: boolean;
};

export type RecipeSuggestion = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceName: string;
  time: number | null;
  timeEstimated: boolean;
  match: number;
  uses: string[];
  urgentUses: string[];
  missing: string[];
  ingredients: { name: string; measure: string }[];
  steps: string[];
  cuisine: string;
  reason: string;
  attribution: "source-backed" | "demo";
};

export type RecipeSuggestResponse = {
  recipes: RecipeSuggestion[];
  mode: "live-ranked";
  message: string;
  notice: string | null;
};
