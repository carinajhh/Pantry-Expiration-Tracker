import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const FOOD_CATEGORIES = ["Produce", "Dairy", "Protein", "Grains", "Bakery", "Condiments", "Beverages", "Herbs & Spices", "Other"] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export type FoodRecord = {
  id: number;
  canonicalName: string;
  normalizedName: string;
  category: FoodCategory;
  emoji: string;
  matchType: "exact" | "alias" | "inferred";
};

type SeedFood = [name: string, category: FoodCategory, emoji: string, aliases?: string[]];

const SEED_FOODS: SeedFood[] = [
  ["Apple", "Produce", "🍎", ["apples", "red apple", "green apple"]],
  ["Avocado", "Produce", "🥑", ["avocados"]],
  ["Banana", "Produce", "🍌", ["bananas"]],
  ["Blueberries", "Produce", "🫐", ["blueberry"]],
  ["Broccoli", "Produce", "🥦", ["broccoli florets"]],
  ["Carrot", "Produce", "🥕", ["carrots", "baby carrots"]],
  ["Cherry tomatoes", "Produce", "🍅", ["cherry tomato", "grape tomatoes"]],
  ["Corn", "Produce", "🌽", ["sweet corn", "corn on the cob"]],
  ["Cucumber", "Produce", "🥒", ["cucumbers"]],
  ["Eggplant", "Produce", "🍆", ["aubergine", "eggplants"]],
  ["Garlic", "Produce", "🧄", ["garlic cloves", "garlic clove"]],
  ["Grapes", "Produce", "🍇", ["grape"]],
  ["Lemon", "Produce", "🍋", ["lemons"]],
  ["Lettuce", "Produce", "🥬", ["romaine", "romaine lettuce", "iceberg lettuce"]],
  ["Lime", "Produce", "🍋", ["limes"]],
  ["Mango", "Produce", "🥭", ["mangoes", "mangos"]],
  ["Mushrooms", "Produce", "🍄", ["mushroom", "button mushrooms"]],
  ["Onion", "Produce", "🧅", ["onions", "red onion", "yellow onion", "white onion"]],
  ["Orange", "Produce", "🍊", ["oranges"]],
  ["Peach", "Produce", "🍑", ["peaches"]],
  ["Pear", "Produce", "🍐", ["pears"]],
  ["Peas", "Produce", "🫛", ["green peas", "pea"]],
  ["Pepper", "Produce", "🫑", ["peppers", "bell pepper", "bell peppers", "capsicum"]],
  ["Pineapple", "Produce", "🍍", ["pineapples"]],
  ["Potato", "Produce", "🥔", ["potatoes", "russet potato", "russet potatoes", "red potato", "red potatoes", "yellow potato", "yellow potatoes", "yukon gold potato", "yukon gold potatoes", "baby potato", "baby potatoes"]],
  ["Spinach", "Produce", "🥬", ["baby spinach", "spinach leaves"]],
  ["Strawberries", "Produce", "🍓", ["strawberry"]],
  ["Sweet potato", "Produce", "🍠", ["sweet potatoes", "yam", "yams"]],
  ["Tomato", "Produce", "🍅", ["tomatoes", "roma tomato"]],
  ["Watermelon", "Produce", "🍉", ["watermelons"]],
  ["Zucchini", "Produce", "🥒", ["courgette", "zucchinis"]],
  ["Arugula", "Produce", "🥬", ["rocket", "arugula leaves"]],
  ["Beets", "Produce", "🫜", ["beet", "beetroot", "beetroots"]],
  ["Bok choy", "Produce", "🥬", ["pak choi", "baby bok choy"]],
  ["Brussels sprouts", "Produce", "🥬", ["brussel sprouts", "brussels sprout"]],
  ["Butternut squash", "Produce", "🎃", ["butternut", "butternut squash cubes"]],
  ["Cherries", "Produce", "🍒", ["cherry"]],
  ["Grapefruit", "Produce", "🍊", ["grapefruits"]],
  ["Green onions", "Produce", "🧅", ["green onion", "scallion", "scallions", "spring onion", "spring onions"]],
  ["Kiwi", "Produce", "🥝", ["kiwis", "kiwifruit"]],
  ["Leek", "Produce", "🧅", ["leeks"]],
  ["Plum", "Produce", "🍑", ["plums"]],
  ["Raspberries", "Produce", "🫐", ["raspberry"]],
  ["Shallot", "Produce", "🧅", ["shallots"]],
  ["Butter", "Dairy", "🧈", ["salted butter", "unsalted butter"]],
  ["Cheese", "Dairy", "🧀", ["cheddar", "mozzarella", "parmesan", "swiss cheese"]],
  ["Cream cheese", "Dairy", "🧀"],
  ["Greek yogurt", "Dairy", "🥣", ["greek yoghurt"]],
  ["Milk", "Dairy", "🥛", ["whole milk", "skim milk", "2 percent milk"]],
  ["Sour cream", "Dairy", "🥛"],
  ["Yogurt", "Dairy", "🥣", ["yoghurt"]],
  ["Almond milk", "Dairy", "🥛", ["unsweetened almond milk"]],
  ["Feta cheese", "Dairy", "🧀", ["feta"]],
  ["Goat cheese", "Dairy", "🧀", ["chèvre", "chevre"]],
  ["Oat milk", "Dairy", "🥛"],
  ["Ricotta cheese", "Dairy", "🧀", ["ricotta"]],
  ["Bacon", "Protein", "🥓"],
  ["Beef", "Protein", "🥩", ["ground beef", "steak"]],
  ["Chicken", "Protein", "🍗", ["chicken breast", "chicken breasts", "chicken thigh", "chicken thighs"]],
  ["Eggs", "Protein", "🥚", ["egg", "large eggs"]],
  ["Fish", "Protein", "🐟", ["white fish", "fish fillet"]],
  ["Ham", "Protein", "🍖"],
  ["Pork", "Protein", "🍖", ["pork chop", "pork chops", "ground pork"]],
  ["Salmon", "Protein", "🐟", ["salmon fillet"]],
  ["Shrimp", "Protein", "🍤", ["prawns", "prawn"]],
  ["Tofu", "Protein", "◻️", ["firm tofu", "silken tofu"]],
  ["Turkey", "Protein", "🦃", ["ground turkey", "turkey breast"]],
  ["Cod", "Protein", "🐟", ["cod fillet", "cod fillets"]],
  ["Lamb", "Protein", "🍖", ["ground lamb", "lamb chop", "lamb chops"]],
  ["Sardines", "Protein", "🐟", ["sardine", "canned sardines", "tinned sardines"]],
  ["Tilapia", "Protein", "🐟", ["tilapia fillet", "tilapia fillets"]],
  ["Black beans", "Protein", "🫘", ["black bean"]],
  ["Chickpeas", "Protein", "🫘", ["chickpea", "garbanzo beans", "garbanzo bean"]],
  ["Lentils", "Protein", "🫘", ["lentil", "red lentils", "green lentils"]],
  ["Almonds", "Protein", "🥜", ["almond"]],
  ["Peanuts", "Protein", "🥜", ["peanut"]],
  ["Basmati rice", "Grains", "🍚"],
  ["Brown rice", "Grains", "🍚"],
  ["White rice", "Grains", "🍚", ["rice"]],
  ["Jasmine rice", "Grains", "🍚"],
  ["Wild rice", "Grains", "🍚"],
  ["Oats", "Grains", "🥣", ["oatmeal", "rolled oats"]],
  ["Pasta", "Grains", "🍝", ["spaghetti", "penne", "macaroni", "noodles"]],
  ["Quinoa", "Grains", "🌾"],
  ["Egg noodles", "Grains", "🍜"],
  ["Ramen noodles", "Grains", "🍜", ["ramen"]],
  ["Flour", "Grains", "🌾", ["all purpose flour", "whole wheat flour"]],
  ["Cereal", "Grains", "🥣", ["breakfast cereal"]],
  ["Bagel", "Bakery", "🥯", ["bagels"]],
  ["Bread", "Bakery", "🍞", ["white bread", "wheat bread", "whole wheat bread"]],
  ["Croissant", "Bakery", "🥐", ["croissants"]],
  ["Sourdough bread", "Bakery", "🍞", ["sourdough", "sourdough loaf"]],
  ["Tortillas", "Bakery", "🫓", ["tortilla", "flour tortillas", "corn tortillas"]],
  ["Balsamic vinegar", "Condiments", "🍶"],
  ["Hot sauce", "Condiments", "🌶️"],
  ["Jam", "Condiments", "🫙", ["jelly", "fruit preserves"]],
  ["Ketchup", "Condiments", "🥫", ["catsup"]],
  ["Mayonnaise", "Condiments", "🥫", ["mayo"]],
  ["Mustard", "Condiments", "🟡"],
  ["Olive oil", "Condiments", "🫒", ["extra virgin olive oil", "evoo"]],
  ["Peanut butter", "Condiments", "🥜"],
  ["Soy sauce", "Condiments", "🍶"],
  ["Apple cider vinegar", "Condiments", "🍎", ["acv"]],
  ["Beef broth", "Condiments", "🍲", ["beef stock"]],
  ["Canola oil", "Condiments", "🫒", ["rapeseed oil"]],
  ["Fish sauce", "Condiments", "🍶"],
  ["Rice vinegar", "Condiments", "🍶", ["rice wine vinegar"]],
  ["Sesame oil", "Condiments", "🫒"],
  ["Tomato sauce", "Condiments", "🥫", ["passata"]],
  ["Vegetable oil", "Condiments", "🫒", ["cooking oil"]],
  ["White vinegar", "Condiments", "🍶", ["distilled vinegar", "vinegar"]],
  ["Sugar", "Other", "🧂", ["white sugar", "brown sugar"]],
  ["Salt", "Other", "🧂", ["sea salt", "kosher salt"]],
  ["Coffee", "Other", "☕", ["coffee beans", "ground coffee"]],
  ["Tea", "Other", "🍵", ["tea bags", "green tea", "black tea"]],
  ["Cornstarch", "Other", "🌽", ["corn starch", "cornflour"]],
  ["Powdered sugar", "Other", "🧂", ["confectioners sugar", "icing sugar"]],
  ["Yeast", "Other", "🍞", ["active dry yeast", "instant yeast"]],
  ["Apple juice", "Beverages", "🧃", ["apple cider juice"]],
  ["Orange juice", "Beverages", "🍊", ["oj", "fresh orange juice"]],
  ["Grape juice", "Beverages", "🍇"],
  ["Cranberry juice", "Beverages", "🧃"],
  ["Pineapple juice", "Beverages", "🍍"],
  ["Tomato juice", "Beverages", "🍅"],
  ["Lemon juice", "Beverages", "🍋"],
  ["Lime juice", "Beverages", "🍋"],
  ["Carrot juice", "Beverages", "🥕"],
  ["Fruit juice", "Beverages", "🧃", ["mixed fruit juice", "juice box"]],
  ["Coconut water", "Beverages", "🥥"],
  ["Sparkling water", "Beverages", "🫧", ["seltzer", "club soda"]],
  ["Soda", "Beverages", "🥤", ["soft drink", "pop"]],
  ["Water", "Beverages", "💧", ["bottled water", "drinking water"]],
  ["Asparagus", "Produce", "🌱"],
  ["Cabbage", "Produce", "🥬", ["green cabbage", "red cabbage"]],
  ["Cauliflower", "Produce", "🥦", ["cauliflower florets"]],
  ["Celery", "Produce", "🌿", ["celery stalks", "celery sticks"]],
  ["Green beans", "Produce", "🫛", ["string beans"]],
  ["Kale", "Produce", "🥬", ["kale leaves"]],
  ["Pumpkin", "Produce", "🎃", ["pumpkin puree"]],
  ["Radish", "Produce", "🥕", ["radishes"]],
  ["Ginger", "Produce", "🫚", ["fresh ginger", "ginger root"]],
  ["Jalapeño", "Produce", "🌶️", ["jalapeno", "jalapenos", "jalapeños"]],
  ["Cottage cheese", "Dairy", "🧀"],
  ["Heavy cream", "Dairy", "🥛", ["heavy whipping cream", "whipping cream"]],
  ["Half-and-half", "Dairy", "🥛", ["half and half"]],
  ["Buttermilk", "Dairy", "🥛"],
  ["Tuna", "Protein", "🐟", ["canned tuna", "tuna steak"]],
  ["Sausage", "Protein", "🌭", ["breakfast sausage", "italian sausage"]],
  ["Ground chicken", "Protein", "🍗"],
  ["Tempeh", "Protein", "🌱"],
  ["Couscous", "Grains", "🍚"],
  ["Barley", "Grains", "🌾", ["pearl barley"]],
  ["Cornmeal", "Grains", "🌽"],
  ["Breadcrumbs", "Grains", "🍞", ["bread crumbs", "panko", "panko breadcrumbs"]],
  ["Buns", "Bakery", "🍞", ["bun", "hamburger buns", "hot dog buns"]],
  ["Pita bread", "Bakery", "🫓", ["pita", "pitas"]],
  ["English muffin", "Bakery", "🧁", ["english muffins"]],
  ["Honey", "Condiments", "🍯"],
  ["Maple syrup", "Condiments", "🍁", ["pancake syrup"]],
  ["Barbecue sauce", "Condiments", "🥫", ["bbq sauce"]],
  ["Worcestershire sauce", "Condiments", "🍶"],
  ["Ranch dressing", "Condiments", "🥗", ["ranch"]],
  ["Tomato paste", "Condiments", "🥫"],
  ["Chicken broth", "Condiments", "🍲", ["chicken stock"]],
  ["Vegetable broth", "Condiments", "🍲", ["vegetable stock", "veggie broth"]],
  ["Coconut milk", "Condiments", "🥥", ["canned coconut milk"]],
  ["Basil", "Herbs & Spices", "🌿", ["fresh basil", "dried basil"]],
  ["Cilantro", "Herbs & Spices", "🌿", ["coriander leaves"]],
  ["Parsley", "Herbs & Spices", "🌿", ["fresh parsley"]],
  ["Mint", "Herbs & Spices", "🌿", ["mint leaves"]],
  ["Rosemary", "Herbs & Spices", "🌿"],
  ["Thyme", "Herbs & Spices", "🌿"],
  ["Oregano", "Herbs & Spices", "🌿"],
  ["Bay leaves", "Herbs & Spices", "🌿", ["bay leaf"]],
  ["Chili powder", "Herbs & Spices", "🌶️", ["chilli powder"]],
  ["Chives", "Herbs & Spices", "🌿", ["fresh chives"]],
  ["Curry powder", "Herbs & Spices", "🌶️"],
  ["Dill", "Herbs & Spices", "🌿", ["fresh dill", "dried dill"]],
  ["Nutmeg", "Herbs & Spices", "🟤", ["ground nutmeg"]],
  ["Turmeric", "Herbs & Spices", "🟡", ["ground turmeric"]],
  ["Cinnamon", "Herbs & Spices", "🟤", ["ground cinnamon", "cinnamon sticks"]],
  ["Paprika", "Herbs & Spices", "🌶️", ["smoked paprika"]],
  ["Cumin", "Herbs & Spices", "🧂", ["ground cumin"]],
  ["Black pepper", "Herbs & Spices", "🧂", ["peppercorns", "ground pepper"]],
  ["Garlic powder", "Herbs & Spices", "🧄"],
  ["Baking soda", "Other", "🧂", ["bicarbonate of soda"]],
  ["Baking powder", "Other", "🧂"],
  ["Chocolate", "Other", "🍫", ["chocolate chips", "dark chocolate", "milk chocolate"]],
  ["Cocoa powder", "Other", "🍫", ["cacao powder"]],
  ["Vanilla extract", "Other", "🌼", ["vanilla"]],
  ["Ice cream", "Dairy", "🍨", ["icecream"]],
  ["Gelato", "Dairy", "🍨"],
  ["Frozen yogurt", "Dairy", "🍦", ["froyo"]],
  ["Popsicle", "Other", "🍧", ["popsicles", "ice pop", "ice pops", "freezer pop", "freezer pops"]],
  ["Sorbet", "Other", "🍧", ["fruit sorbet"]],
  ["Frozen fruit", "Produce", "🍓", ["frozen fruits", "mixed frozen fruit"]],
  ["Frozen berries", "Produce", "🫐", ["mixed berries", "frozen mixed berries", "mixed frozen berries"]],
  ["Frozen strawberries", "Produce", "🍓"],
  ["Frozen mango", "Produce", "🥭", ["frozen mango chunks"]],
  ["Frozen vegetables", "Produce", "🥦", ["frozen veggies", "mixed frozen vegetables", "frozen mixed vegetables"]],
  ["Frozen peas", "Produce", "🫛"],
  ["Frozen corn", "Produce", "🌽"],
  ["French fries", "Produce", "🍟", ["frozen fries", "oven fries"]],
  ["Hash browns", "Produce", "🥔", ["frozen hash browns"]],
  ["Chicken nuggets", "Protein", "🍗", ["frozen chicken nuggets"]],
  ["Chicken tenders", "Protein", "🍗", ["chicken strips", "frozen chicken tenders"]],
  ["Fish sticks", "Protein", "🐟", ["fish fingers", "frozen fish sticks"]],
  ["Meatballs", "Protein", "🍖", ["frozen meatballs"]],
  ["Frozen shrimp", "Protein", "🍤"],
  ["Frozen pizza", "Bakery", "🍕", ["freezer pizza"]],
  ["Frozen waffles", "Bakery", "🧇", ["waffles"]],
  ["Frozen garlic bread", "Bakery", "🥖", ["garlic bread"]],
  ["Frozen dumplings", "Grains", "🥟", ["dumplings", "potstickers", "gyoza"]],
  ["Frozen burrito", "Grains", "🌯", ["frozen burritos"]],
  ["Frozen meal", "Other", "🍱", ["frozen food", "frozen dinner", "tv dinner", "ready meal"]],
  ["Canned beans", "Protein", "🫘", ["tinned beans"]],
  ["Kidney beans", "Protein", "🫘", ["red kidney beans"]],
  ["Pinto beans", "Protein", "🫘"],
  ["Cannellini beans", "Protein", "🫘", ["white beans"]],
  ["Refried beans", "Protein", "🫘"],
  ["Canned chicken", "Protein", "🍗"],
  ["Canned salmon", "Protein", "🐟"],
  ["Canned tomatoes", "Produce", "🥫", ["tinned tomatoes", "diced tomatoes", "crushed tomatoes"]],
  ["Canned corn", "Produce", "🌽"],
  ["Canned fruit", "Produce", "🍑", ["fruit cocktail", "tinned fruit"]],
  ["Applesauce", "Produce", "🍎", ["apple sauce"]],
  ["Dried fruit", "Produce", "🍇", ["mixed dried fruit"]],
  ["Raisins", "Produce", "🍇", ["dried grapes"]],
  ["Canned soup", "Other", "🍲", ["tinned soup"]],
  ["Instant noodles", "Grains", "🍜", ["ramen noodles", "instant ramen"]],
  ["Macaroni and cheese", "Grains", "🧀", ["mac and cheese", "boxed mac and cheese"]],
  ["Crackers", "Grains", "🍘", ["saltine crackers", "saltines"]],
  ["Granola", "Grains", "🥣"],
  ["Popcorn", "Grains", "🍿", ["popcorn kernels", "microwave popcorn"]],
  ["Pretzels", "Grains", "🥨", ["pretzel"]],
  ["Potato chips", "Other", "🥔", ["chips", "crisps"]],
  ["Cookies", "Bakery", "🍪", ["cookie", "biscuits"]],
  ["Mixed nuts", "Protein", "🥜", ["nuts"]],
  ["Cashews", "Protein", "🥜", ["cashew"]],
  ["Walnuts", "Protein", "🥜", ["walnut"]],
  ["Sunflower seeds", "Protein", "🌻", ["sunflower seed"]],
  ["Canned olives", "Condiments", "🫒", ["olives", "black olives", "green olives"]],
  ["Pickles", "Condiments", "🥒", ["pickle", "dill pickles"]],
  ["Salsa", "Condiments", "🍅", ["jarred salsa"]],
];

const categoryDefaults: Record<FoodCategory, string> = {
  Produce: "🥬", Dairy: "🥛", Protein: "🍗", Grains: "🍚", Bakery: "🍞", Condiments: "🥫", Beverages: "🧃", "Herbs & Spices": "🌿", Other: "🍽️",
};

let database: Database.Database | undefined;

export function normalizeFoodName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function foodNameVariants(normalizedName: string) {
  const variants = new Set([normalizedName]);
  const words = normalizedName.split(" ");
  const last = words.at(-1) ?? "";
  const addLastWord = (word: string) => variants.add([...words.slice(0, -1), word].join(" "));

  if (last.endsWith("ies") && last.length > 3) addLastWord(`${last.slice(0, -3)}y`);
  if (last.endsWith("es") && last.length > 2) {
    addLastWord(last.slice(0, -2));
    addLastWord(last.slice(0, -1));
  } else if (last.endsWith("s") && last.length > 1) {
    addLastWord(last.slice(0, -1));
  } else {
    addLastWord(`${last}s`);
    if (last.endsWith("y") && last.length > 1) addLastWord(`${last.slice(0, -1)}ies`);
    if (last.endsWith("o") || last.endsWith("ch") || last.endsWith("sh") || last.endsWith("x")) addLastWord(`${last}es`);
  }

  return [...variants].filter(Boolean);
}

function getDatabase() {
  if (database) return database;
  const dataDirectory = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDirectory, { recursive: true });
  database = new Database(path.join(dataDirectory, "food-catalog.db"));
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      category TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS food_aliases (
      alias TEXT PRIMARY KEY COLLATE NOCASE,
      food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
    CREATE INDEX IF NOT EXISTS idx_aliases_food_id ON food_aliases(food_id);
  `);

  const insertFood = database.prepare(`
    INSERT INTO foods (canonical_name, normalized_name, category, emoji)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(normalized_name) DO UPDATE SET
      canonical_name = excluded.canonical_name,
      category = excluded.category,
      emoji = excluded.emoji
  `);
  const findId = database.prepare("SELECT id FROM foods WHERE normalized_name = ? COLLATE NOCASE");
  const insertAlias = database.prepare("INSERT OR REPLACE INTO food_aliases (alias, food_id) VALUES (?, ?)");
  const seed = database.transaction(() => {
    for (const [name, category, emoji, aliases = []] of SEED_FOODS) {
      const normalized = normalizeFoodName(name);
      insertFood.run(name, normalized, category, emoji);
      const row = findId.get(normalized) as { id: number };
      for (const alias of aliases) insertAlias.run(normalizeFoodName(alias), row.id);
    }
  });
  seed();
  return database;
}

function inferFood(name: string): Omit<FoodRecord, "id"> {
  const normalizedName = normalizeFoodName(name);
  const rules: Array<[RegExp, FoodCategory, string]> = [
    [/\b(apple|berry|berries|fruit|vegetable|salad|greens|kale|cabbage|celery|bean sprouts)\b/, "Produce", "🥬"],
    [/\b(milk|cheese|yogurt|yoghurt|cream|butter|dairy)\b/, "Dairy", "🥛"],
    [/\b(chicken|beef|pork|fish|salmon|tuna|turkey|meat|egg|tofu|beans|lentil|sausage)\b/, "Protein", "🍗"],
    [/\b(rice|pasta|grain|oat|quinoa|flour|cereal|noodle)\b/, "Grains", "🍚"],
    [/\b(bread|loaf|bagel|croissant|tortilla|bun|roll|muffin)\b/, "Bakery", "🍞"],
    [/\b(sauce|oil|vinegar|dressing|mustard|ketchup|mayo|jam|spread|seasoning)\b/, "Condiments", "🥫"],
    [/\b(juice|soda|seltzer|drink|beverage|cider)\b/, "Beverages", "🧃"],
    [/\b(herb|spice|basil|cilantro|parsley|mint|rosemary|thyme|oregano|paprika|cumin|peppercorn)\b/, "Herbs & Spices", "🌿"],
  ];
  const matched = rules.find(([pattern]) => pattern.test(normalizedName));
  const category = matched?.[1] ?? "Other";
  return { canonicalName: name.trim(), normalizedName, category, emoji: matched?.[2] ?? categoryDefaults[category], matchType: "inferred" };
}

export function lookupFood(name: string): FoodRecord {
  const db = getDatabase();
  const normalizedName = normalizeFoodName(name);
  const exactStatement = db.prepare(`
    SELECT id, canonical_name AS canonicalName, normalized_name AS normalizedName, category, emoji
    FROM foods WHERE normalized_name = ? COLLATE NOCASE
  `);
  const aliasStatement = db.prepare(`
    SELECT f.id, f.canonical_name AS canonicalName, f.normalized_name AS normalizedName, f.category, f.emoji
    FROM food_aliases a JOIN foods f ON f.id = a.food_id
    WHERE a.alias = ? COLLATE NOCASE
  `);
  const exact = exactStatement.get(normalizedName) as Omit<FoodRecord, "matchType"> | undefined;
  if (exact) return { ...exact, category: exact.category as FoodCategory, matchType: "exact" };

  const alias = aliasStatement.get(normalizedName) as Omit<FoodRecord, "matchType"> | undefined;
  if (alias) return { ...alias, category: alias.category as FoodCategory, matchType: "alias" };

  for (const variant of foodNameVariants(normalizedName).slice(1)) {
    const variantExact = exactStatement.get(variant) as Omit<FoodRecord, "matchType"> | undefined;
    if (variantExact) return { ...variantExact, category: variantExact.category as FoodCategory, matchType: "alias" };
    const variantAlias = aliasStatement.get(variant) as Omit<FoodRecord, "matchType"> | undefined;
    if (variantAlias) return { ...variantAlias, category: variantAlias.category as FoodCategory, matchType: "alias" };
  }
  return { id: 0, ...inferFood(name) };
}

export function searchFoods(query: string, limit = 8) {
  const normalized = normalizeFoodName(query);
  const db = getDatabase();
  return db.prepare(`
    SELECT id, canonical_name AS canonicalName, category, emoji
    FROM foods
    WHERE normalized_name LIKE ? COLLATE NOCASE
    ORDER BY CASE WHEN normalized_name LIKE ? THEN 0 ELSE 1 END, canonical_name
    LIMIT ?
  `).all(`%${normalized}%`, `${normalized}%`, limit);
}

export function getEmojiOptions() {
  const db = getDatabase();
  return db.prepare(`
    SELECT emoji, category, MIN(canonical_name) AS example
    FROM foods
    GROUP BY emoji, category
    ORDER BY category, example
  `).all() as Array<{ emoji: string; category: FoodCategory; example: string }>;
}
