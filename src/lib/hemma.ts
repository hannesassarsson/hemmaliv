import { supabase } from "@/integrations/supabase";

export type Person = "Hannes" | "Elvira";
export const PERSONS: Person[] = ["Hannes", "Elvira"];

export type ListType = "gemensamt" | "hannes" | "elvira";

export type ShoppingItem = {
  id: string;
  text: string;
  qty: number;
  done: boolean;
  recurring: boolean;
  reminder: string | null;
  notified_at: string | null;
  added_by: string | null;
  completed_by: string | null;
  category: string | null;
  sort_order: number;
  created_at: string;
};

export type TodoItem = {
  id: string;
  text: string;
  qty: number;
  done: boolean;
  recurring: boolean;
  list_type: ListType;
  deadline: string | null;
  reminder: string | null;
  notified_at: string | null;
  added_by: string | null;
  completed_by: string | null;
  created_at: string;
};

export type MealPlanRow = {
  id: string;
  week_start: string;
  day: string;
  dish_text: string;
};

export type MealIdea = { id: string; text: string };

export const DAYS = [
  "måndag",
  "tisdag",
  "onsdag",
  "torsdag",
  "fredag",
  "lördag",
  "söndag",
] as const;

export const QUICK_ITEMS = [
  "Mjölk",
  "Ägg",
  "Bröd",
  "Smör",
  "Kaffe",
  "Bananer",
  "Ost",
  "Yoghurt",
  "Pasta",
  "Ris",
  "Kyckling",
  "Köttfärs",
  "Tomater",
  "Lök",
  "Vitlök",
  "Diskmedel",
  "Toapapper",
  "Havregryn",
];

export const PUSH_PUBLIC_KEY = import.meta.env["VITE_VAPID_PUBLIC_KEY"] ?? "";

/* ---------- Handlarlista ---------- */

export async function fetchShopping(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from("shopping_items")
    .select("*")
    .order("done", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ShoppingItem[];
}

export async function addShopping(text: string, addedBy: Person) {
  const { error } = await supabase
    .from("shopping_items")
    .insert({ text: text.trim(), added_by: addedBy });
  if (error) throw error;
}

export async function updateShopping(id: string, patch: Partial<ShoppingItem>) {
  const { error } = await supabase.from("shopping_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteShopping(id: string) {
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

/** Rensar avklarade varor. Återkommande varor nollställs istället för att tas bort. */
export async function clearDoneShopping(items: ShoppingItem[]) {
  const done = items.filter((i) => i.done);
  const recurring = done.filter((i) => i.recurring).map((i) => i.id);
  const removable = done.filter((i) => !i.recurring).map((i) => i.id);
  if (recurring.length) {
    const { error } = await supabase
      .from("shopping_items")
      .update({ done: false, completed_by: null, notified_at: null })
      .in("id", recurring);
    if (error) throw error;
  }
  if (removable.length) {
    const { error } = await supabase.from("shopping_items").delete().in("id", removable);
    if (error) throw error;
  }
}

/* ---------- Att göra ---------- */

export async function fetchTodos(): Promise<TodoItem[]> {
  const { data, error } = await supabase.from("todo_items").select("*");
  if (error) throw error;
  return (data ?? []) as TodoItem[];
}

export async function addTodo(text: string, listType: ListType, addedBy: Person) {
  const { error } = await supabase
    .from("todo_items")
    .insert({ text: text.trim(), list_type: listType, added_by: addedBy });
  if (error) throw error;
}

export async function updateTodo(id: string, patch: Partial<TodoItem>) {
  const { error } = await supabase.from("todo_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTodo(id: string) {
  const { error } = await supabase.from("todo_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearDoneTodos(items: TodoItem[]) {
  const done = items.filter((i) => i.done);
  const recurring = done.filter((i) => i.recurring).map((i) => i.id);
  const removable = done.filter((i) => !i.recurring).map((i) => i.id);
  if (recurring.length) {
    const { error } = await supabase
      .from("todo_items")
      .update({ done: false, completed_by: null, notified_at: null })
      .in("id", recurring);
    if (error) throw error;
  }
  if (removable.length) {
    const { error } = await supabase.from("todo_items").delete().in("id", removable);
    if (error) throw error;
  }
}

export function sortTodos(items: TodoItem[]) {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

/* ---------- Matplanering ---------- */

export async function fetchMealPlan(): Promise<MealPlanRow[]> {
  const { data, error } = await supabase
    .from("meal_plan")
    .select("*")
    .order("week_start", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MealPlanRow[];
}

export async function saveMeal(weekStart: string, day: string, dish: string) {
  const { error } = await supabase
    .from("meal_plan")
    .upsert(
      { week_start: weekStart, day, dish_text: dish, updated_at: new Date().toISOString() },
      { onConflict: "week_start,day" },
    );
  if (error) throw error;
}

export async function fetchMealIdeas(): Promise<MealIdea[]> {
  const { data, error } = await supabase.from("meal_ideas").select("*").order("text");
  if (error) throw error;
  return (data ?? []) as MealIdea[];
}

export async function saveMealIdea(text: string) {
  const clean = text.trim();
  if (clean.length < 2) return;
  const { error } = await supabase
    .from("meal_ideas")
    .upsert({ text: clean }, { onConflict: "text", ignoreDuplicates: true });
  if (error && error.code !== "23505") throw error;
}

/* ---------- Veckohjälp ---------- */

export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function formatWeekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = addDays(start, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatDeadline(value: string) {
  const d = new Date(value);
  return d.toLocaleString("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO-sträng -> värde för <input type="datetime-local"> i lokal tid */
export function toLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}
