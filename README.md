# Pantry Expiration Tracker

A fridge-inspired pantry dashboard that helps people see what is expiring, manage food inventory, and request recipe ideas using selected ingredients.

## Live website

Open the published app: **[pantry-expiration-tracker.vercel.app](https://pantry-expiration-tracker.vercel.app)**

## Current frontend features

- Distinct responsive fridge, frosted freezer, and wooden pantry views
- Add, edit, consume, and delete pantry items
- Search and filter by storage location
- Automatic expiration status and urgency sorting
- Server-managed pantry persistence through SQLite locally or Postgres in production
- Ingredient selection for recipe requests
- Cuisine, cooking-time, and dietary preference form
- Live recipe search through TheMealDB's free development API
- Cuisine, meal, time, and dietary preferences
- Expiration-aware recipe scoring that prioritizes food which should be used soon
- Local ranking and descriptions with no paid AI requests
- SQLite-backed food catalog with automatic category and emoji assignment
- Case-insensitive names and aliases such as `CHICKEN BREAST`, `chicken breast`, and `Chicken Breast`

## Recipe suggestion backend

The `POST /api/recipes/suggest` route accepts selected pantry items, expiration urgency, and user preferences. It searches TheMealDB's free V1 API for each of the most urgent ingredients, combines duplicate results, loads the full ingredient lists, and locally scores the candidates. The top three retain the existing polished recipe cards, short descriptions, match percentages, missing-ingredient labels, source links, and use-soon explanations.

No API setup is required for development or educational use. The server automatically uses TheMealDB's public development key. If the project later receives a supporter/production key, it can be supplied as:

```text
THEMEALDB_API_KEY=your_supporter_key
```

TheMealDB's free key is intended for development and educational projects. A publicly released production or app-store version should follow TheMealDB's supporter terms. No OpenAI, Gemini, or Spoonacular key is used by this implementation. Vercel can run the Next.js route directly without a separate server.

## Food catalog backend

The Next.js route at `/api/foods` connects the add-item form to a local SQLite catalog. Common foods and aliases are seeded automatically, including juices, beverages, herbs, spices, and other everyday ingredients. Food names are normalized for case, accents, punctuation, and extra spacing. Exact food and alias matches lock their catalog-assigned category and emoji so they stay paired correctly. Unknown foods receive an inferred category, then clearly expose editable category and catalog-backed emoji controls for that pantry entry only. User-created unknown foods are never promoted into the shared catalog; new catalog matches must be added to the curated backend seed list.

The development database is created at `data/food-catalog.db` and is intentionally ignored by Git. The schema and seed catalog live in `lib/food-catalog.ts`.

## Pantry database

The `/api/pantry` route stores every added, edited, used, or deleted pantry item in a database. Local development uses `data/pantry.db`; when `DATABASE_URL` is present, the same route automatically uses serverless Postgres through Neon. A private anonymous kitchen ID separates each browser's pantry without storing food data in `localStorage`. Existing browser-saved pantry items are imported into the database once and then removed from browser storage.

For Vercel, connect a Neon Postgres integration so Vercel supplies `DATABASE_URL` automatically. The pantry table and index are created on the first request.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
Cook food from your fridge before it expires
