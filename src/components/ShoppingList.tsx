import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  Check,
  Minus,
  Pencil,
  Plus,
  Repeat,
  ShoppingCart,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  QUICK_ITEMS,
  addShopping,
  clearDoneShopping,
  deleteShopping,
  fetchShopping,
  formatDeadline,
  fromLocalInput,
  toLocalInput,
  updateShopping,
  type ShoppingItem,
} from "@/lib/hemma";
import { notifyOthers } from "@/lib/notify";
import { usePerson } from "@/lib/person-context";
import { CATEGORY_LABEL, categoryIndex, normalizeCategory, type StoreCategory } from "@/lib/store-order";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export function ShoppingList() {
  const { person } = usePerson();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  const [storeMode, setStoreMode] = useState(false);
  const [sorting, setSorting] = useState(false);

  const { data: items = [] } = useQuery({ queryKey: ["shopping"], queryFn: fetchShopping });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["shopping"] });

  const add = useMutation({
    mutationFn: (value: string) => addShopping(value, person ?? "Hannes"),
    onSuccess: (_data, value) => {
      invalidate();
      notifyOthers(person, `${person ?? "Någon"} lade till "${value}" i handlarlistan`);
    },
    onError: () => toast.error("Kunde inte lägga till varan"),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ShoppingItem> }) =>
      updateShopping(id, patch),
    onSuccess: invalidate,
    onError: () => toast.error("Kunde inte spara ändringen"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteShopping(id),
    onSuccess: invalidate,
  });

  const clear = useMutation({
    mutationFn: () => clearDoneShopping(items),
    onSuccess: () => {
      invalidate();
      toast.success("Avklarade varor rensade");
    },
  });

  const submit = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    add.mutate(clean);
    setText("");
  };

  const check = (item: ShoppingItem, checked: boolean) => {
    update.mutate({
      id: item.id,
      patch: { done: checked, completed_by: checked ? (person ?? null) : null },
    });
    if (checked) {
      notifyOthers(person, `${person ?? "Någon"} bockade av "${item.text}"`, `shop-${item.id}`);
    }
  };

  const sortByStore = async () => {
    if (!items.length) return;
    setSorting(true);
    try {
      const result = { items: items.map((item) => ({ id: item.id, category: categorize(item.text) })) };
      await Promise.all(
        result.items.map((row) =>
          updateShopping(row.id, {
            category: normalizeCategory(row.category),
            sort_order: categoryIndex(row.category),
          }),
        ),
      );
      invalidate();
      toast.success("Listan är sorterad i butiksordning");
    } catch {
      toast.error("Kunde inte sortera listan just nu");
    } finally {
      setSorting(false);
    }
  };

  const doneCount = items.filter((i) => i.done).length;

  const groups = Array.from(
    items.reduce((map, item) => {
      const key = normalizeCategory(item.category);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
      return map;
    }, new Map<string, ShoppingItem[]>()),
  ).sort((a, b) => categoryIndex(a[0]) - categoryIndex(b[0]));

  if (storeMode) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setStoreMode(false)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground"
        >
          <Pencil className="size-4" />
          Lämna butiksläget
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Butiksläge: bocka av varor, inget kan ändras eller tas bort av misstag.
        </p>

        {groups.map(([key, list]) => (
          <section key={key}>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABEL[key as keyof typeof CATEGORY_LABEL] ?? "Övrigt"}
            </h2>
            <ul className="space-y-2">
              {list.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => check(item, !item.done)}
                    className={`flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left shadow-soft ${
                      item.done ? "bg-muted" : "bg-card"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex size-7 shrink-0 items-center justify-center rounded-md border-2 ${
                        item.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary"
                      }`}
                    >
                      {item.done ? <Check className="size-4" /> : null}
                    </span>
                    <span
                      className={`flex-1 text-lg ${
                        item.done ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {item.text}
                    </span>
                    {item.qty > 1 ? (
                      <span className="rounded-lg bg-muted px-2 py-1 text-sm font-medium">
                        {item.qty} st
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Listan är tom.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex gap-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Lägg till vara…"
          className="h-12 rounded-xl bg-card"
          aria-label="Ny vara"
        />
        <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-xl">
          <Plus className="size-5" />
          <span className="sr-only">Lägg till</span>
        </Button>
      </form>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStoreMode(true)}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground active:opacity-90"
        >
          <ShoppingCart className="size-4" />
          Jag är i affären
        </button>
        <button
          type="button"
          onClick={sortByStore}
          disabled={sorting || items.length === 0}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm text-secondary-foreground active:bg-accent disabled:opacity-50"
        >
          <Sparkles className="size-4" />
          {sorting ? "Sorterar…" : "Sortera i butiksordning"}
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-2 pb-1">
          {QUICK_ITEMS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm text-secondary-foreground shadow-soft active:bg-accent"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {groups.map(([key, list]) => (
        <section key={key}>
          {groups.length > 1 ? (
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABEL[key as keyof typeof CATEGORY_LABEL] ?? "Övrigt"}
            </h2>
          ) : null}
          <ul className="space-y-2">
            {list.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) => check(item, Boolean(checked))}
                    className="mt-1 size-6 rounded-md"
                    aria-label={`Bocka av ${item.text}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-base ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {item.text}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tillagd av {item.added_by ?? "okänd"}
                      {item.completed_by ? ` · bockad av ${item.completed_by}` : ""}
                    </p>
                    {item.reminder ? (
                      <p className="mt-1 text-xs text-clay">
                        Påminnelse {formatDeadline(item.reminder)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-xl bg-muted p-1">
                    <button
                      type="button"
                      aria-label="Minska antal"
                      onClick={() =>
                        update.mutate({ id: item.id, patch: { qty: Math.max(1, item.qty - 1) } })
                      }
                      className="flex size-8 items-center justify-center rounded-lg text-foreground active:bg-accent"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                    <button
                      type="button"
                      aria-label="Öka antal"
                      onClick={() => update.mutate({ id: item.id, patch: { qty: item.qty + 1 } })}
                      className="flex size-8 items-center justify-center rounded-lg text-foreground active:bg-accent"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      update.mutate({ id: item.id, patch: { recurring: !item.recurring } })
                    }
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                      item.recurring
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    <Repeat className="size-3.5" />
                    Återkommande
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderFor(reminderFor === item.id ? null : item.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                      item.reminder
                        ? "bg-accent text-accent-foreground"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {item.reminder ? (
                      <Bell className="size-3.5" />
                    ) : (
                      <BellOff className="size-3.5" />
                    )}
                    Påminnelse
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(item.id)}
                    aria-label={`Ta bort ${item.text}`}
                    className="ml-auto flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {reminderFor === item.id ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Input
                      type="datetime-local"
                      defaultValue={toLocalInput(item.reminder)}
                      onChange={(e) =>
                        update.mutate({
                          id: item.id,
                          patch: { reminder: fromLocalInput(e.target.value), notified_at: null },
                        })
                      }
                      className="h-11 flex-1 rounded-xl"
                      aria-label="Påminnelsetid"
                    />
                    {item.reminder ? (
                      <Button
                        variant="ghost"
                        className="h-11 rounded-xl"
                        onClick={() => update.mutate({ id: item.id, patch: { reminder: null } })}
                      >
                        Ta bort
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Listan är tom — lägg till något ovan.
        </p>
      ) : null}

      {doneCount > 0 ? (
        <Button
          variant="secondary"
          className="h-12 w-full rounded-xl"
          onClick={() => clear.mutate()}
        >
          Rensa {doneCount} avklarade (återkommande nollställs)
        </Button>
      ) : null}
    </div>
  );
}

function categorize(text: string): StoreCategory {
  const value = text.toLowerCase();
  if (/banan|tomat|lök|vitlök|frukt|grönsak|potatis|äpple|citron/.test(value)) return "frukt";
  if (/bröd|bulle|kaka/.test(value)) return "brod";
  if (/mjölk|ägg|smör|ost|yoghurt|grädde|kött|kyckling|lax|fisk/.test(value)) return "kyl";
  if (/fryst|glass/.test(value)) return "frys";
  if (/disk|toa|tvätt|schampo|tand|papper/.test(value)) return "hygien";
  if (/pasta|ris|kaffe|havre|mjöl|konserv|krydda|olja/.test(value)) return "kolonial";
  return "ovrigt";
}
