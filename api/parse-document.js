import { createClient } from "@supabase/supabase-js";

const json = (response, status, body) => response.status(status).json(body);

const CATEGORIES = ["kvitto", "forsakring", "garanti", "kontrakt", "ovrigt"];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: CATEGORIES },
    title: { type: "string" },
    document_date: { type: "string", nullable: true },
    amount: { type: "number", nullable: true },
    issuer: { type: "string", nullable: true },
    summary: { type: "string" },
  },
  required: ["category", "title", "summary"],
};

const PROMPT = `Du tittar på ett foto eller en PDF av ett dokument som hör hemma i ett svenskt hushålls arkiv (kvitton, försäkringsbrev, garantibevis, kontrakt eller övrigt).

Läs dokumentet och svara ENDAST med ett JSON-objekt enligt schemat:
- category: en av "kvitto", "forsakring", "garanti", "kontrakt", "ovrigt" — välj det som passar bäst.
- title: en kort svensk titel (max ~6 ord), t.ex. "ICA Kvantum" eller "Hemförsäkring Folksol".
- document_date: datumet på dokumentet i formatet YYYY-MM-DD, eller null om inget hittas.
- amount: totalbelopp i kronor som ett tal (utan "kr" eller mellanslag), eller null om dokumentet inte har ett belopp.
- issuer: butik, företag eller avsändare, eller null.
- summary: en kort mening (max ~15 ord) som sammanfattar vad dokumentet är.

Om det är ett kvitto, sätt category till "kvitto" och amount till totalsumman. Gissa aldrig vilt — sätt null när du är osäker.`;

async function callGemini(base64, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY saknas");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini svarade ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Inget svar från Gemini");
  return JSON.parse(text);
}

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });

  const { id, storagePath, mimeType } = request.body ?? {};
  if (!id || !storagePath || !mimeType) {
    return json(response, 400, { error: "id, storagePath och mimeType krävs" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json(response, 500, { error: "Saknar Supabase-konfiguration" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);
    if (downloadError) throw downloadError;

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const extracted = await callGemini(base64, mimeType);

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        ai_status: "done",
        category: extracted.category ?? "ovrigt",
        title: extracted.title ?? null,
        document_date: extracted.document_date ?? null,
        amount: extracted.amount ?? null,
        issuer: extracted.issuer ?? null,
        summary: extracted.summary ?? null,
        raw_ai: extracted,
      })
      .eq("id", id);
    if (updateError) throw updateError;

    return json(response, 200, { ok: true, extracted });
  } catch (error) {
    console.error("Kunde inte tolka dokumentet", error);
    await supabase.from("documents").update({ ai_status: "failed" }).eq("id", id);
    return json(response, 502, { error: "Kunde inte tolka dokumentet" });
  }
}
