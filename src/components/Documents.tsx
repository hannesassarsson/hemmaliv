import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Loader2, Plus, Trash2 } from "lucide-react";

import {
  CATEGORY_LABELS,
  deleteDocument,
  fetchDocuments,
  formatAmount,
  formatDocDate,
  getDocumentUrl,
  uploadDocument,
  type DocumentCategory,
  type DocumentRow,
} from "@/lib/documents";
import { usePerson } from "@/lib/person-context";

const FILTERS: (DocumentCategory | "alla")[] = ["alla", "kvitto", "forsakring", "garanti", "kontrakt", "ovrigt"];

export function Documents() {
  const { person } = usePerson();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<DocumentCategory | "alla">("alla");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((d) => d.ai_status === "pending") ? 3000 : false,
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadDocument(file, person ?? "Hannes"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const remove = useMutation({
    mutationFn: (doc: DocumentRow) => deleteDocument(doc),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (file) upload.mutate(file);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleOpen = async (doc: DocumentRow) => {
    setOpeningId(doc.id);
    try {
      const url = await getDocumentUrl(doc.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningId(null);
    }
  };

  const shown = documents.filter((d) => filter === "alla" || d.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg text-foreground">
          <FileText className="size-5" />
          Dokument
        </h2>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={upload.isPending}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
        >
          {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Lägg till
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Kvitton, försäkringsbrev, garantier och andra dokument — foto eller PDF. En AI läser av dokumentet
        automatiskt och fyller i titel, datum och belopp.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {f === "alla" ? "Alla" : CATEGORY_LABELS[f]}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Hämtar dokument…</p>}
      {!isLoading && shown.length === 0 && (
        <p className="text-sm text-muted-foreground">Inga dokument här ännu.</p>
      )}

      <ul className="space-y-2">
        {shown.map((doc) => (
          <li
            key={doc.id}
            className="rounded-2xl border border-border bg-card p-3 shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => handleOpen(doc)}
                disabled={openingId === doc.id}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-medium text-foreground">
                    {doc.title ?? doc.original_filename ?? "Dokument"}
                  </p>
                  {openingId === doc.id ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {CATEGORY_LABELS[doc.category]}
                  {doc.issuer ? ` · ${doc.issuer}` : ""}
                  {formatDocDate(doc.document_date) ? ` · ${formatDocDate(doc.document_date)}` : ""}
                </p>
                {doc.summary && <p className="mt-1 text-sm text-muted-foreground">{doc.summary}</p>}
                {doc.ai_status === "pending" && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Tolkar dokumentet…
                  </p>
                )}
                {doc.ai_status === "failed" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Kunde inte tolkas automatiskt.
                    {doc.ai_error ? ` (${doc.ai_error})` : ""}
                  </p>
                )}
              </button>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {formatAmount(doc.amount) && (
                  <span className="text-sm font-medium text-foreground">{formatAmount(doc.amount)}</span>
                )}
                <button
                  type="button"
                  onClick={() => remove.mutate(doc)}
                  aria-label="Ta bort"
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
