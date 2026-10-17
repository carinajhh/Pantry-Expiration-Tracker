"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { RecipeSuggestResponse, RecipeSuggestion } from "../lib/recipe-types";
import type { PantryItem, StorageLocation as Location } from "../lib/pantry-types";

type FoodLookup = { canonicalName: string; category: string; emoji: string; matchType: "exact" | "alias" | "inferred" };

const DAY = 86_400_000;
const categoryEmoji: Record<string, string> = { Produce: "🥬", Dairy: "🥛", Protein: "🍗", Grains: "🍚", Bakery: "🍞", Condiments: "🥫", Beverages: "🧃", "Herbs & Spices": "🌿", Other: "🍽️" };
const generalEmojiOptions = [
  { emoji: "🍎", label: "Fruit" },
  { emoji: "🥦", label: "Vegetables" },
  { emoji: "🍗", label: "Protein" },
  { emoji: "🐟", label: "Seafood" },
  { emoji: "🥛", label: "Dairy" },
  { emoji: "🍚", label: "Grains" },
  { emoji: "🍞", label: "Bakery" },
  { emoji: "🧃", label: "Beverages" },
  { emoji: "🥫", label: "Condiments" },
  { emoji: "🌿", label: "Herbs & spices" },
  { emoji: "🍿", label: "Snacks" },
  { emoji: "🍨", label: "Desserts" },
  { emoji: "🍽️", label: "Other food" },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateFromToday(days: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

function formatDateValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarPicker({ value, onChange, onClose }: { value: string; onChange: (value: string) => void; onClose: () => void }) {
  const selectedDate = parseDateValue(value);
  const initialDate = selectedDate ?? new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const today = new Date();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const currentYear = today.getFullYear();
  const minimumYear = Math.min(currentYear - 10, selectedDate?.getFullYear() ?? currentYear);
  const maximumYear = Math.max(currentYear + 75, selectedDate?.getFullYear() ?? currentYear);
  const yearOptions = Array.from({ length: maximumYear - minimumYear + 1 }, (_, index) => minimumYear + index);

  function moveMonth(direction: number) {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function chooseDate(day: number) {
    onChange(formatDateValue(viewYear, viewMonth, day));
    onClose();
  }

  function chooseToday() {
    onChange(formatDateValue(today.getFullYear(), today.getMonth(), today.getDate()));
    onClose();
  }

  return <div className="calendar-popover" role="dialog" aria-label="Choose expiration date">
    <div className="calendar-heading"><div><span>EXPIRATION DATE</span><strong>Choose a date</strong></div><button type="button" onClick={onClose} aria-label="Close calendar">×</button></div>
    <div className="calendar-navigation">
      <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button>
      <select value={viewMonth} onChange={(event) => setViewMonth(Number(event.target.value))} aria-label="Calendar month">{MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}</select>
      <select value={viewYear} onChange={(event) => setViewYear(Number(event.target.value))} aria-label="Calendar year">{yearOptions.map((year) => <option key={year}>{year}</option>)}</select>
      <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">›</button>
    </div>
    <div className="calendar-weekdays">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid" role="grid" aria-label={`${MONTHS[viewMonth]} ${viewYear}`}>
      {calendarCells.map((day, index) => day ? <button
        type="button"
        role="gridcell"
        key={`${viewYear}-${viewMonth}-${day}`}
        className={`${selectedDate?.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day ? "selected" : ""} ${today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day ? "today" : ""}`}
        aria-label={`${MONTHS[viewMonth]} ${day}, ${viewYear}`}
        aria-selected={selectedDate?.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day}
        onClick={() => chooseDate(day)}>{day}</button> : <span key={`empty-${index}`} />)}
    </div>
    <div className="calendar-footer"><button type="button" onClick={chooseToday}>Today</button><span>{selectedDate ? selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date selected"}</span></div>
  </div>;
}

function StorageSymbol({ symbol }: { symbol: string }) {
  if (symbol === "kitchen") return <svg className="storage-glyph kitchen-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 2.75a.75.75 0 0 1 1.5 0V7.5h1.25V2.75a.75.75 0 0 1 1.5 0V7.5H9.5V2.75a.75.75 0 0 1 1.5 0V7.5h1.25V2.75a.75.75 0 0 1 1.5 0v6.1c0 2.43-1.55 4.5-3.72 5.28V21a1.53 1.53 0 0 1-3.06 0v-6.87a5.61 5.61 0 0 1-3.72-5.28v-6.1A.75.75 0 0 1 4 2.75Z" />
    <path d="M19.3 2.12C17.48 4.8 16 8.84 16 12.08c0 2.05.9 3.8 2.35 4.77V21a1.53 1.53 0 0 0 3.06 0V3.17c0-1.18-1.44-2.02-2.11-1.05Z" />
  </svg>;
  if (symbol === "fridge") return <span className="storage-glyph fridge-glyph"><i /><i /></span>;
  if (symbol === "basket") return <span className="storage-glyph basket-glyph" />;
  return <span className="storage-text-glyph">{symbol}</span>;
}

const KITCHEN_ID_KEY = "freshly-kitchen-id";

function getKitchenId() {
  let id = window.localStorage.getItem(KITCHEN_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KITCHEN_ID_KEY, id);
  }
  return id;
}

function pantryRequest(init?: RequestInit, suffix = "") {
  const headers = new Headers(init?.headers);
  headers.set("x-kitchen-id", getKitchenId());
  if (init?.body) headers.set("Content-Type", "application/json");
  return fetch(`/api/pantry${suffix}`, { ...init, headers });
}

function daysUntil(date: string) {
  const target = new Date(`${date}T12:00:00Z`);
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / DAY);
}

function expiryInfo(date: string) {
  const days = daysUntil(date);
  if (days < 0) return { tone: "expired", label: `Expired ${Math.abs(days)}d ago`, rank: 0 };
  if (days === 0) return { tone: "urgent", label: "Expires today", rank: 1 };
  if (days === 1) return { tone: "urgent", label: "Expires tomorrow", rank: 2 };
  if (days <= 5) return { tone: "soon", label: `${days} days left`, rank: days + 2 };
  return { tone: "fresh", label: `${days} days left`, rank: days + 10 };
}

function RecipeInstructions({ recipe, onBack }: { recipe: RecipeSuggestion; onBack: () => void }) {
  return <div className="recipe-detail">
    <button type="button" className="recipe-back" onClick={onBack}><span aria-hidden="true">←</span> Recipe results</button>
    <header className="recipe-detail-hero">
      {recipe.imageUrl ? <img src={recipe.imageUrl} alt={recipe.title} /> : <div className="recipe-detail-image-placeholder" aria-hidden="true">🍳</div>}
      <div><p className="eyebrow">COOKING MODE</p><h2>{recipe.title}</h2><div className="recipe-detail-meta"><span>{recipe.cuisine}</span><span>{recipe.time ? `${recipe.timeEstimated ? "About " : ""}${recipe.time} minutes` : "Time not listed"}</span><span>{recipe.ingredients.length} ingredients</span></div><p className="recipe-detail-description">{recipe.description}</p></div>
    </header>
    <div className="recipe-detail-content">
      <aside className="recipe-ingredients-panel">
        <div className="recipe-section-heading"><span>01</span><div><p>GET READY</p><h3>Ingredients</h3></div></div>
        <ul className="recipe-ingredient-list">{recipe.ingredients.map((ingredient, index) => <li key={`${ingredient.name}-${index}`}><strong>{ingredient.name}</strong>{ingredient.measure && <span>{ingredient.measure}</span>}</li>)}</ul>
      </aside>
      <section className="recipe-steps-panel">
        <div className="recipe-section-heading"><span>02</span><div><p>LET’S COOK</p><h3>Instructions</h3></div></div>
        {recipe.steps.length ? <ol>{recipe.steps.map((step, index) => <li key={`${index}-${step.slice(0, 20)}`}><span>{index + 1}</span><p>{step}</p></li>)}</ol> : <p className="recipe-no-steps">Instructions were not included for this recipe. Use the source link below to view the original details.</p>}
      </section>
    </div>
    <footer className="recipe-detail-footer"><span>Recipe information provided by TheMealDB.</span>{recipe.sourceUrl && <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">View on TheMealDB <span aria-hidden="true">↗</span></a>}</footer>
  </div>;
}

export default function Home() {
  const expirationInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [filter, setFilter] = useState<"All" | Location>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<RecipeSuggestion | null>(null);
  const [recipeStatus, setRecipeStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [recipeMessage, setRecipeMessage] = useState("");
  const [recipeNotice, setRecipeNotice] = useState("");
  const [recipeMode, setRecipeMode] = useState<RecipeSuggestResponse["mode"] | null>(null);
  const [toast, setToast] = useState("");
  const [foodName, setFoodName] = useState("");
  const [foodCategory, setFoodCategory] = useState("Produce");
  const [foodEmoji, setFoodEmoji] = useState("🥬");
  const [catalogMatch, setCatalogMatch] = useState<FoodLookup | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [expirationDate, setExpirationDate] = useState(dateFromToday(5));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [unitError, setUnitError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPantry() {
      try {
        const legacy = window.localStorage.getItem("freshly-pantry");
        const migrated = window.localStorage.getItem("freshly-pantry-migrated") === "yes";
        let response: Response;
        if (legacy && !migrated) {
          let legacyItems: unknown = null;
          try { legacyItems = JSON.parse(legacy); } catch { window.localStorage.removeItem("freshly-pantry"); }
          response = Array.isArray(legacyItems) && legacyItems.length
            ? await pantryRequest({ method: "POST", body: JSON.stringify({ items: legacyItems }) })
            : await pantryRequest();
          if (response.ok) {
            window.localStorage.setItem("freshly-pantry-migrated", "yes");
            window.localStorage.removeItem("freshly-pantry");
          }
        } else {
          response = await pantryRequest();
        }
        const data = await response.json() as { items?: PantryItem[]; error?: string };
        if (!response.ok || !data.items) throw new Error(data.error || "Your pantry could not be loaded.");
        if (active) setItems(data.items);
      } catch (error) {
        if (active) setToast(error instanceof Error ? error.message : "Your pantry could not be loaded.");
      }
    }
    loadPantry();
    return () => { active = false; };
  }, []);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(""), 2400); return () => window.clearTimeout(id); }, [toast]);
  useEffect(() => {
    const name = foodName.trim();
    if (!showAdd || name.length < 2) {
      setCatalogMatch(null);
      setCatalogStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCatalogStatus("loading");
      try {
        const response = await fetch(`/api/foods?name=${encodeURIComponent(name)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Food lookup failed");
        const data = await response.json() as { food: FoodLookup };
        setCatalogMatch(data.food);
        const isOriginalUnknownItem = data.food.matchType === "inferred" && editingItem && name.toLocaleLowerCase() === editingItem.name.trim().toLocaleLowerCase();
        if (!isOriginalUnknownItem) {
          setFoodCategory(data.food.category);
          setFoodEmoji(data.food.emoji);
        }
        setCatalogStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setCatalogStatus("unavailable");
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [foodName, showAdd, editingItem]);

  const visibleItems = useMemo(() => items
    .filter((item) => filter === "All" || item.location === filter)
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => expiryInfo(a.expiresOn).rank - expiryInfo(b.expiresOn).rank), [items, filter, search]);
  const urgentCount = items.filter((item) => daysUntil(item.expiresOn) <= 3).length;
  const selectedItems = items.filter((item) => selected.includes(item.id));
  const isCatalogLocked = catalogMatch?.matchType === "exact" || catalogMatch?.matchType === "alias";
  const isFoodEditable = catalogMatch?.matchType === "inferred" || catalogStatus === "unavailable";
  const storageView = {
    All: { className: "overview-theme", icon: "kitchen", title: "My kitchen", detail: "3 storage zones", footerIcon: "kitchen", footer: "All food · sorted by urgency" },
    Fridge: { className: "fridge-theme", icon: "fridge", title: "My fridge", detail: "38°F", footerIcon: "fridge", footer: "Chilled freshness · sorted by urgency" },
    Freezer: { className: "freezer-theme", icon: "❄", title: "My freezer", detail: "0°F", footerIcon: "❄", footer: "Frozen storage · sorted by urgency" },
    Pantry: { className: "pantry-theme", icon: "basket", title: "My pantry", detail: "Cool & dry", footerIcon: "basket", footer: "Shelf storage · sorted by urgency" },
  }[filter];

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  }

  function openAddForm() {
    setEditingItem(null);
    setFoodName("");
    setFoodCategory("Produce");
    setFoodEmoji("🥬");
    setCatalogMatch(null);
    setCatalogStatus("idle");
    setExpirationDate(dateFromToday(5));
    setCalendarOpen(false);
    setUnitError("");
    setShowAdd(true);
  }

  function openEditForm(item: PantryItem) {
    setEditingItem(item);
    setFoodName(item.name);
    setFoodCategory(item.category);
    setFoodEmoji(item.emoji);
    setCatalogMatch(null);
    setCatalogStatus("idle");
    setExpirationDate(item.expiresOn);
    setCalendarOpen(false);
    setUnitError("");
    setShowAdd(true);
  }

  function closeItemForm() {
    setShowAdd(false);
    setEditingItem(null);
    setCalendarOpen(false);
    setUnitError("");
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const unit = String(form.get("unit")).trim();
    if (/\d/.test(unit)) {
      setUnitError("Add quantities or numbers to the Quantity area.");
      (event.currentTarget.elements.namedItem("unit") as HTMLInputElement | null)?.focus();
      return;
    }
    setUnitError("");
    const item: PantryItem = { id: editingItem?.id ?? "", name: foodName.trim(), quantity: Number(form.get("quantity")), unit, category: foodCategory, location: String(form.get("location")) as Location, expiresOn: expirationDate, emoji: foodEmoji };
    try {
      const response = await pantryRequest({ method: editingItem ? "PUT" : "POST", body: JSON.stringify(item) });
      const data = await response.json() as { item?: PantryItem; error?: string };
      if (!response.ok || !data.item) throw new Error(data.error || "The pantry item could not be saved.");
      const saved = data.item;
      setItems((current) => editingItem ? current.map((candidate) => candidate.id === editingItem.id ? saved : candidate) : [...current, saved]);
      setShowAdd(false);
      setEditingItem(null);
      setCalendarOpen(false);
      setToast(editingItem ? `${saved.name} updated.` : `${saved.name} added to your ${saved.location.toLowerCase()}.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The pantry item could not be saved.");
    }
  }

  async function removeItem(item: PantryItem, used = false) {
    try {
      const response = await pantryRequest({ method: "DELETE" }, `?id=${encodeURIComponent(item.id)}`);
      const data = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok || !data.deleted) throw new Error(data.error || "The pantry item could not be removed.");
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setSelected((current) => current.filter((id) => id !== item.id));
      setToast(used ? `Nice! ${item.name} was marked as used.` : `${item.name} removed.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The pantry item could not be removed.");
    }
  }

  async function requestRecipes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setRecipeStatus("loading");
    setRecipeMessage("");
    setRecipeNotice("");
    try {
      const response = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: selectedItems.map((item) => ({ name: item.name, expiresOn: item.expiresOn, daysUntilExpiration: daysUntil(item.expiresOn) })),
          preferences: {
            cuisine: String(form.get("cuisine")),
            mealType: String(form.get("mealType")),
            maximumTime: Number(form.get("maximumTime")),
            diet: String(form.get("diet")),
            allowExtras: form.get("allowExtras") === "on",
          },
        }),
      });
      const data = await response.json() as RecipeSuggestResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "We couldn't find recipes right now.");
      setRecipes(data.recipes);
      setRecipeMode(data.mode);
      setRecipeMessage(data.message);
      setRecipeNotice(data.notice ?? "");
      setRecipeStatus("ready");
    } catch (error) {
      setRecipeStatus("error");
      setRecipeNotice("");
      setRecipeMessage(error instanceof Error ? error.message : "We couldn't find recipes right now.");
    }
  }

  const openRecipes = () => { setRecipes([]); setActiveRecipe(null); setRecipeStatus("idle"); setRecipeMessage(""); setRecipeNotice(""); setRecipeMode(null); setShowRecipe(true); };

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <a className="brand" href="#top"><span className="brand-mark">F</span><span>freshly<span className="brand-dot">.</span></span></a>
        <nav className="nav-list" aria-label="Main navigation">
          <a className="nav-link active" href="#pantry"><span>▦</span> My fridge</a>
          <button className="nav-link" disabled={!selected.length} onClick={openRecipes}><span>⌁</span> Recipe lab</button>
          <a className="nav-link" href="#impact"><span>↗</span> My impact</a>
        </nav>
        <section className="waste-card" id="impact"><span className="mini-label">THIS MONTH</span><strong>12 items saved</strong><div className="progress"><span /></div><p>You’re 3 items away from your goal.</p></section>
        <div className="profile-chip"><div className="avatar">C</div><div><strong>My kitchen</strong><span>Local pantry</span></div><button aria-label="Open settings">•••</button></div>
      </aside>

      <section className="content" id="top">
        <header className="topbar">
          <div><p className="eyebrow">YOUR KITCHEN, AT A GLANCE</p><h1>Good afternoon <span>👋</span></h1><p className="subtitle">Let’s use what you have, before it goes bad.</p></div>
          <button className="primary-button" onClick={openAddForm}><span>＋</span> Add an item</button>
        </header>

        <section className="summary-grid">
          <article className="summary-card urgent-summary"><div className="summary-icon">!</div><div><span>USE THESE FIRST</span><strong>{urgentCount} items</strong><p>expiring within 3 days</p></div><button onClick={() => setFilter("All")}>View →</button></article>
          <article className="summary-card"><div className="summary-icon green">✓</div><div><span>IN YOUR KITCHEN</span><strong>{items.length} items</strong><p>across 3 storage areas</p></div></article>
          <article className="summary-card recipe-summary"><div className="summary-icon amber">✦</div><div><span>READY TO COOK?</span><strong>{selected.length || "Pick items"}</strong><p>{selected.length ? "ingredients selected" : "for personalized recipes"}</p></div><button disabled={!selected.length} onClick={openRecipes}>Go →</button></article>
        </section>

        <section className={`fridge ${storageView.className}`} id="pantry">
          <div className="fridge-top"><div><span className="storage-icon" aria-hidden="true"><StorageSymbol symbol={storageView.icon} /></span><span className="temperature-light" /><strong>{storageView.title}</strong><span className="temperature">{storageView.detail}</span></div><div className="fridge-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an item..." aria-label="Find a pantry item" /></div></div>
          <div className="fridge-toolbar"><div className="filters">{(["All", "Fridge", "Freezer", "Pantry"] as const).map((label) => <button key={label} className={filter === label ? "selected" : ""} onClick={() => setFilter(label)}>{label}</button>)}</div><p><span className="selection-dot" /> Select ingredients to request a recipe</p></div>
          <div className="fridge-interior">
            {filter === "Freezer" && <div className="snowflake-field" aria-hidden="true">{Array.from({ length: 30 }, (_, index) => <span key={index}>{index % 3 === 1 ? "❅" : "❄"}</span>)}</div>}
            <div className="cool-glow glow-one" /><div className="cool-glow glow-two" />
            <div className="item-grid">
              {visibleItems.map((item) => {
                const expiry = expiryInfo(item.expiresOn); const isSelected = selected.includes(item.id);
                return <article className={`food-card ${isSelected ? "chosen" : ""}`} key={item.id}>
                  <button className="select-box" onClick={() => toggleSelected(item.id)} aria-label={`${isSelected ? "Deselect" : "Select"} ${item.name}`}>{isSelected ? "✓" : ""}</button>
                  <div className="food-emoji">{item.emoji}</div><div className="food-copy"><span className={`expiry-pill ${expiry.tone}`}><i />{expiry.label}</span><h3>{item.name}</h3><p>{item.quantity} {item.unit} · {item.location}</p></div>
                  <div className="card-actions"><button type="button" className="edit-button" onClick={() => openEditForm(item)}>✎ Edit</button><button type="button" onClick={() => removeItem(item, true)}>Used</button><button type="button" className="delete-button" onClick={() => removeItem(item)} aria-label={`Delete ${item.name}`}>×</button></div>
                </article>;
              })}
              {!visibleItems.length && <div className="empty-state"><span>🧺</span><h3>No items found</h3><p>Try another filter or add something new.</p><button className="primary-button" onClick={openAddForm}>Add an item</button></div>}
            </div><div className="glass-shelf" />
          </div>
          <div className="fridge-footer"><p><span className="footer-storage-icon" aria-hidden="true"><StorageSymbol symbol={storageView.footerIcon} /></span> {storageView.footer}</p><button disabled={!selected.length} onClick={openRecipes}><span>✦</span> Request recipes {selected.length > 0 && <b>{selected.length}</b>}</button></div><div className="fridge-handle" />
        </section>
      </section>

      {showAdd && <div className="modal-backdrop" onMouseDown={closeItemForm}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="item-form-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={closeItemForm} aria-label="Close item form">×</button><p className="eyebrow">{editingItem ? "UPDATE YOUR KITCHEN" : "STOCK YOUR KITCHEN"}</p><h2 id="item-form-title">{editingItem ? "Edit item" : "Add a new item"}</h2><p className="modal-intro">{editingItem ? "Correct any details and save your changes." : "A little detail now means less food forgotten later."}</p>
        <form key={editingItem?.id ?? "new-item"} onSubmit={addItem} className="item-form">
          <label className="full-field">Item name<div className="food-name-field"><span>{foodEmoji}</span><input name="name" value={foodName} onChange={(event) => { setFoodName(event.target.value); setCatalogMatch(null); setCatalogStatus("idle"); }} placeholder="e.g. Baby spinach" required autoFocus /></div></label>
          <div className={`catalog-status full-field ${catalogStatus}`}>
            {catalogStatus === "idle" && "Type a food name and the catalog will assign it automatically."}
            {catalogStatus === "loading" && "Checking the food catalog…"}
            {catalogStatus === "ready" && catalogMatch && <><strong>{catalogMatch.matchType === "inferred" ? "Item not in catalog — customize it below" : `Matched ${catalogMatch.canonicalName} — locked`}</strong><span>{catalogMatch.emoji} {catalogMatch.category} · case-insensitive</span></>}
            {catalogStatus === "unavailable" && "Item could not be matched — customize its category and emoji below."}
          </div>
          {isFoodEditable && <div className="customization-note full-field"><span>✎</span><div><strong>Make this item match</strong><p>We don’t recognize this food yet. You can change its category and choose the best emoji for this pantry item.</p></div></div>}
          <label>Quantity<input name="quantity" type="number" min="0.1" step="0.1" defaultValue={editingItem?.quantity ?? 1} required /></label><label>Unit (bags, cups, lbs...)<input className={unitError ? "input-error" : ""} name="unit" placeholder="e.g., bags, cups, lbs" defaultValue={editingItem?.unit ?? ""} aria-label="Unit, such as bags, cups, or pounds" aria-invalid={Boolean(unitError)} aria-describedby={unitError ? "unit-error" : undefined} onChange={() => setUnitError("")} required />{unitError && <span className="form-error" id="unit-error" role="alert">{unitError}</span>}</label>
          <label>Category {isCatalogLocked && <span className="locked-label">🔒 Catalog assigned</span>}{isFoodEditable && <span className="editable-label">✎ You can edit this</span>}<select className={isCatalogLocked ? "locked-category" : ""} name="category" value={foodCategory} disabled={isCatalogLocked} aria-describedby={isCatalogLocked ? "category-lock-note" : undefined} onChange={(event) => { const category = event.target.value; setFoodCategory(category); setFoodEmoji(categoryEmoji[category] ?? "🍽️"); }}>{Object.keys(categoryEmoji).map((category) => <option key={category}>{category}</option>)}</select>{isCatalogLocked && <span id="category-lock-note" className="field-note">Category and emoji are protected for catalog matches.</span>}</label>
          {isFoodEditable && <label>Item emoji <span className="editable-label">✎ Choose a general food type</span><select className="emoji-picker" name="emoji" value={foodEmoji} onChange={(event) => setFoodEmoji(event.target.value)}>{!generalEmojiOptions.some((option) => option.emoji === foodEmoji) && <option value={foodEmoji}>{foodEmoji} Suggested</option>}{generalEmojiOptions.map((option) => <option key={option.label} value={option.emoji}>{option.emoji} {option.label}</option>)}</select><span className="field-note">Choose the closest general food type for this item.</span></label>}
          <label>Stored in<select name="location" defaultValue={editingItem?.location ?? "Fridge"}><option>Fridge</option><option>Freezer</option><option>Pantry</option></select></label><label className="full-field">Expiration date<div className="date-field"><input ref={expirationInputRef} name="expiresOn" type="text" inputMode="numeric" placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}" value={expirationDate} onChange={(event) => { setExpirationDate(event.target.value); event.target.setCustomValidity(""); }} onBlur={(event) => event.target.setCustomValidity(parseDateValue(event.target.value) ? "" : "Enter a valid date in YYYY-MM-DD format.")} required /><button type="button" onClick={() => setCalendarOpen((current) => !current)} aria-label="Open expiration date calendar" aria-expanded={calendarOpen} title="Choose a date">📅</button>{calendarOpen && <CalendarPicker value={expirationDate} onChange={(value) => { setExpirationDate(value); expirationInputRef.current?.setCustomValidity(""); }} onClose={() => setCalendarOpen(false)} />}</div><span className="field-note">Click the calendar to choose the expiration date.</span></label><div className="form-actions full-field"><button type="button" className="secondary-button" onClick={closeItemForm}>Cancel</button><button className="primary-button">{editingItem ? "Save changes" : "Add to my kitchen"}</button></div>
        </form>
      </section></div>}

      {showRecipe && <div className="modal-backdrop" onMouseDown={() => setShowRecipe(false)}><section className={`modal recipe-modal ${activeRecipe ? "recipe-detail-modal" : ""}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={() => setShowRecipe(false)} aria-label="Close recipe lab">×</button>
        {activeRecipe ? <RecipeInstructions recipe={activeRecipe} onBack={() => setActiveRecipe(null)} /> : <><p className="eyebrow">RECIPE LAB</p><h2>Turn your ingredients into dinner</h2><p className="modal-intro">We’ll prioritize what expires first, then minimize what you still need to buy.</p><div className="ingredient-strip">{selectedItems.map((item) => <span className={daysUntil(item.expiresOn) <= 3 ? "urgent-ingredient" : ""} key={item.id}>{item.emoji} {item.name}{daysUntil(item.expiresOn) <= 3 && <b>use soon</b>}</span>)}</div>
        {!recipes.length ? <form onSubmit={requestRecipes} className="recipe-form">
          <label>Cuisine<select name="cuisine"><option>Any cuisine</option><option>Italian</option><option>Mexican</option><option>Mediterranean</option><option>Indian</option><option>Japanese</option><option>Thai</option><option>Chinese</option><option>Korean</option><option>French</option><option>Middle Eastern</option></select></label>
          <label>Meal type<select name="mealType"><option>Any meal</option><option>Dinner</option><option>Lunch</option><option>Breakfast</option><option>Snack</option><option>Dessert</option></select></label>
          <label>Maximum time<select name="maximumTime" defaultValue="45"><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select><span className="field-note">when listed</span></label>
          <label>Dietary preference<select name="diet"><option>None</option><option>Vegetarian</option><option>Vegan</option><option>Dairy-free</option><option>Gluten-free</option></select><span className="field-note">Preference filter—not an allergy guarantee.</span></label>
          <label className="extras-choice"><input type="checkbox" name="allowExtras" defaultChecked /><span><strong>Allow a few extra ingredients</strong><small>Basic additions like garlic, oil, or herbs are okay.</small></span></label>
          <div className="recipe-promise"><span>✦</span><p><strong>Real recipes, no paid AI required</strong> We search TheMealDB, then rank the results locally by ingredient coverage and expiration urgency.</p></div>
          {recipeStatus === "error" && <div className="recipe-error" role="alert"><span>!</span><p><strong>Recipe search didn’t finish</strong>{recipeMessage}</p></div>}
          <button className="primary-button wide" disabled={recipeStatus === "loading"}>{recipeStatus === "loading" ? <><span className="button-spinner" /> Searching and ranking recipes…</> : <>Find my top 3 recipes <span aria-hidden="true">→</span></>}</button>
        </form>
        : <div className="recipe-results">
          <div className="results-heading"><div><span className="source-status live">Live · locally ranked</span><p>{recipeMessage}</p></div><button onClick={() => { setRecipes([]); setActiveRecipe(null); setRecipeStatus("idle"); setRecipeMessage(""); setRecipeNotice(""); }}>Change preferences</button></div>
          {recipeNotice && <div className="recipe-match-note" role="note"><span aria-hidden="true">i</span><p><strong>Limited cuisine matches</strong>{recipeNotice}</p></div>}
          {recipes.map((recipe, index) => <article className="recipe-card" key={recipe.id}>
            <div className="recipe-rank">{index + 1}</div>
            {recipe.imageUrl ? <img className="recipe-image" src={recipe.imageUrl} alt="" /> : <div className="recipe-image recipe-image-placeholder" aria-hidden="true">🍳</div>}
            <div className="recipe-copy"><span>{recipe.cuisine} · {recipe.time ? `${recipe.timeEstimated ? "~" : ""}${recipe.time} min` : "Time not listed"} · {recipe.sourceName}</span><h3>{recipe.title}</h3><p>{recipe.description}</p><p className="recipe-reason"><strong>Why this fits:</strong> {recipe.reason}</p><div className="recipe-tags"><span className="uses-tag">✓ Uses {recipe.uses.join(", ")}</span>{recipe.urgentUses.length > 0 && <span className="urgent-tag">⏱ Uses soon: {recipe.urgentUses.join(", ")}</span>}<span>＋ Needs {recipe.missing.length ? recipe.missing.join(", ") : "nothing extra"}</span></div><button type="button" className="recipe-link recipe-instructions-button" onClick={() => setActiveRecipe(recipe)}>View instructions <span aria-hidden="true">→</span></button></div>
            <div className="match-score"><strong>{recipe.match}%</strong><span>match</span></div>
          </article>)}
        </div>}</>}
      </section></div>}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
