import { getEmojiOptions, lookupFood, searchFoods } from "../../../lib/food-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim();
  const query = url.searchParams.get("query")?.trim();
  const options = url.searchParams.get("options")?.trim();

  if (options === "emojis") return Response.json({ emojis: getEmojiOptions() });
  if (name) return Response.json({ food: lookupFood(name) });
  if (query) return Response.json({ foods: searchFoods(query) });
  return Response.json({ error: "Provide a name or query parameter." }, { status: 400 });
}
