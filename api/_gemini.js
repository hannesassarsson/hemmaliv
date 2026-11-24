// Google replaced the old generateContent endpoint with the Interactions
// API during 2026. gemini-3.5-flash is the cheapest current model that's
// confirmed to still accept image/PDF input (the flash-lite tier is
// text-only).
const MODEL = "gemini-3.5-flash";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Skickar `input` till Gemini och returnerar svaret tolkat enligt JSON-schemat. */
export async function geminiJson(input, schema) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY saknas");

  let res;
  // Gemini svarar 503 vid hög belastning; ett nytt försök brukar räcka.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: MODEL,
        input,
        response_format: { type: "text", mime_type: "application/json", schema },
      }),
    });
    if (res.status !== 503 && res.status !== 429) break;
    await sleep(1500 * (attempt + 1));
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini svarade ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  if (data.status && data.status !== "completed") {
    throw new Error(`Gemini-status ${data.status}: ${JSON.stringify(data).slice(0, 500)}`);
  }
  const modelStep = [...(data.steps ?? [])].reverse().find((s) => s.type === "model_output");
  const text = modelStep?.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error(`Inget svar från Gemini: ${JSON.stringify(data).slice(0, 500)}`);
  return JSON.parse(text);
}
