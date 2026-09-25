import { supabase } from "@/integrations/supabase";
import type { Person } from "./hemma";

export type DocumentCategory = "kvitto" | "forsakring" | "garanti" | "kontrakt" | "ovrigt";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  kvitto: "Kvitto",
  forsakring: "Försäkring",
  garanti: "Garanti",
  kontrakt: "Kontrakt",
  ovrigt: "Övrigt",
};

export type DocumentRow = {
  id: string;
  storage_path: string;
  file_type: "image" | "pdf";
  original_filename: string | null;
  uploaded_by: string | null;
  category: DocumentCategory;
  title: string | null;
  document_date: string | null;
  amount: number | null;
  issuer: string | null;
  summary: string | null;
  ai_status: "pending" | "done" | "failed";
  created_at: string;
};

export async function fetchDocuments(): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentRow[];
}

function extForMime(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

export async function uploadDocument(file: File, uploadedBy: Person): Promise<void> {
  const fileType: "image" | "pdf" = file.type === "application/pdf" ? "pdf" : "image";
  const storagePath = `${crypto.randomUUID()}.${extForMime(file.type)}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      storage_path: storagePath,
      file_type: fileType,
      original_filename: file.name,
      uploaded_by: uploadedBy,
      ai_status: "pending",
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  // Fire-and-forget: let the serverless function read the file back and
  // extract structured data. The row already exists so the UI can show a
  // "tolkar..." state immediately regardless of how this call goes.
  void fetch("/api/parse-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: data.id, storagePath, mimeType: file.type }),
  }).catch(() => {
    /* surfaced via ai_status staying "pending"/"failed" on refetch */
  });
}

export async function getDocumentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(doc: Pick<DocumentRow, "id" | "storage_path">) {
  await supabase.storage.from("documents").remove([doc.storage_path]);
  const { error } = await supabase.from("documents").delete().eq("id", doc.id);
  if (error) throw error;
}

export function formatAmount(amount: number | null) {
  if (amount === null) return null;
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(
    amount,
  );
}

export function formatDocDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
}
