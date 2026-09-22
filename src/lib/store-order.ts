/** Butikskategorier i den ordning man normalt går genom affären. */
export const STORE_CATEGORIES = [
  "frukt",
  "brod",
  "kyl",
  "frys",
  "kolonial",
  "hygien",
  "ovrigt",
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<StoreCategory, string> = {
  frukt: "Frukt & grönt",
  brod: "Bröd",
  kyl: "Kyl & mejeri",
  frys: "Frys",
  kolonial: "Kolonial & torrvaror",
  hygien: "Hygien & hushåll",
  ovrigt: "Övrigt",
};

export function categoryIndex(category: string | null | undefined) {
  const i = STORE_CATEGORIES.indexOf((category ?? "ovrigt") as StoreCategory);
  return i === -1 ? STORE_CATEGORIES.length : i;
}

export function normalizeCategory(value: string | null | undefined): StoreCategory {
  const clean = (value ?? "").trim().toLowerCase();
  return (STORE_CATEGORIES as readonly string[]).includes(clean)
    ? (clean as StoreCategory)
    : "ovrigt";
}
