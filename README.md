# Pantry Expiration Tracker

A fridge-inspired pantry dashboard that helps people see what is expiring, manage food inventory, and request recipe ideas using selected ingredients.

## Live website

Open the published app: **[pantry-expiration-tracker.vercel.app](https://pantry-expiration-tracker.vercel.app)**

## Current frontend features

- Distinct responsive fridge, frosted freezer, and wooden pantry views
- Add and edit pantry items, then mark them as Used or Tossed
- Seven-second Undo action that restores the item and corrects its My Impact statistics
- Search and filter by storage location
- Automatic expiration status and urgency sorting
- Server-managed pantry persistence through SQLite locally or Postgres in production
- Ingredient selection for recipe requests
- Cuisine, cooking-time, and dietary preference form
- Live recipe search through TheMealDB's free development API
- Cuisine, meal, time, and dietary preferences
- Expiration-aware recipe scoring that prioritizes food which should be used soon
- Local ranking and descriptions with no paid AI requests
- In-memory food catalog with automatic category and emoji assignment
- Case-insensitive names and aliases such as `CHICKEN BREAST`, `chicken breast`, and `Chicken Breast`

## Recipe suggestion backend

The `POST /api/recipes/suggest` route accepts selected pantry items, expiration urgency, and user preferences. It searches TheMealDB's free V1 API for each of the most urgent ingredients, combines duplicate results, loads the full ingredient lists, and locally scores the candidates. The top three retain the existing polished recipe cards, short descriptions, match percentages, missing-ingredient labels, source links, and use-soon explanations.

No API setup is required for development or educational use. The server automatically uses TheMealDB's public development key. If the project later receives a supporter/production key, it can be supplied as:

```text
THEMEALDB_API_KEY=your_supporter_key
```

TheMealDB's free key is intended for development and educational projects. A publicly released production or app-store version should follow TheMealDB's supporter terms. No OpenAI, Gemini, or Spoonacular key is used by this implementation. Vercel can run the Next.js route directly without a separate server.

## Food catalog backend

The Next.js route at `/api/foods` connects the add-item form to a fast, read-only in-memory catalog. Common foods and aliases are loaded directly from the curated seed list, including juices, beverages, herbs, spices, and other everyday ingredients. Food names are normalized for case, accents, punctuation, and extra spacing. Exact food and alias matches lock their catalog-assigned category and emoji so they stay paired correctly. Unknown foods receive an inferred category, then clearly expose editable category and catalog-backed emoji controls for that pantry entry only. User-created unknown foods are never promoted into the shared catalog; new catalog matches must be added to the curated seed list in `lib/food-catalog.ts`.

## Pantry database

The `/api/pantry` route stores every added, edited, used, or tossed pantry item in a database. Local development uses `data/pantry.db`; when `DATABASE_URL` is present, the same route automatically uses serverless Postgres through Neon. Clerk authentication assigns each signed-in user a separate pantry, and every database operation is scoped to that user's ID.

When an item is marked Used or Tossed, the app records that activity for the My Impact totals and displays an Undo message for seven seconds. Undo atomically restores the complete pantry item and removes the corresponding activity record, keeping both the pantry and impact totals accurate.

For Vercel, connect a Neon Postgres integration so Vercel supplies `DATABASE_URL` automatically. The pantry table and index are created on the first request.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Class project scope

This application is an educational class project and MVP. The deployed demo uses Clerk authentication, Neon Postgres, Vercel, and TheMealDB's development API. Before operating it as a large public or commercial service, use production Clerk credentials on a custom domain, follow TheMealDB's production terms, add rate limiting and monitoring, and publish appropriate privacy and data-deletion policies.
