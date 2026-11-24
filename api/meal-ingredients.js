import { requireMember } from "./_auth.js";
import { geminiJson } from "./_gemini.js";

const CATEGORIES = ["frukt", "brod", "kyl", "frys", "kolonial", "hygien", "ovrigt"];

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          category: { type: "string", enum: CATEGORIES },
          dishes: { type: "array", items: { type: "string" } },
        },
        required: ["text", "category"],
      },
    },
  },
  required: ["items"],
};

const prompt = (dishes, existing) => `Du hjälper ett svenskt hushåll för två personer att handla till veckans middagar.

Middagar:
${dishes.map((d) => `- ${d}`).join("\n")}

Redan på handlarlistan (lägg inte till dessa igen):
${existing.length ? existing.map((e) => `- ${e}`).join("\n") : "- (tom)"}

Svara ENDAST med JSON enligt schemat. Lista ingredienserna som behöver köpas:
- text: kort varunamn på svenska med ungefärlig mängd för två, t.ex. "Laxfilé 400 g" eller "Gul lök 2 st". Slå ihop samma vara från flera rätter.
- category: en av ${CATEGORIES.map((c) => `"${c}"`).join(", ")} (frukt = frukt & grönt, kyl = kyl & mejeri & kött, kolonial = torrvaror & konserver & kryddor).
- dishes: vilka av middagarna varan behövs till.
Hoppa över basvaror som nästan alla har hemma: salt, peppar, vatten, matolja, socker, vetemjöl.`;

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  if (!(await requireMember(request, response))) return;

  const { dishes, existing } = request.body ?? {};
  const cleanDishes = Array.isArray(dishes)
    ? dishes.map((d) => String(d).trim()).filter(Boolean).slice(0, 14)
    : [];
  const cleanExisting = Array.isArray(existing)
    ? existing.map((e) => String(e).trim()).filter(Boolean).slice(0, 100)
    : [];
  if (!cleanDishes.length) return response.status(400).json({ error: "Inga middagar att handla till" });

  try {
    const result = await geminiJson([{ type: "text", text: prompt(cleanDishes, cleanExisting) }], SCHEMA);
    const items = (result.items ?? [])
      .filter((i) => i && typeof i.text === "string" && i.text.trim())
      .map((i) => ({
        text: i.text.trim().slice(0, 80),
        category: CATEGORIES.includes(i.category) ? i.category : "ovrigt",
        dishes: Array.isArray(i.dishes) ? i.dishes.map(String).slice(0, 7) : [],
      }))
      .slice(0, 60);
    return response.status(200).json({ items });
  } catch (error) {
    console.error("meal-ingredients failed", error);
    return response.status(502).json({ error: "Kunde inte ta fram ingredienser just nu" });
  }
}
