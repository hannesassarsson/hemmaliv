import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Repeat, Trash2, UserRoundPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  addTodo,
  clearDoneTodos,
  deleteTodo,
  fetchTodos,
  formatDeadline,
  fromLocalInput,
  sortTodos,
  toLocalInput,
  updateTodo,
  type ListType,
  type TodoItem,
} from "@/lib/hemma";
import { notifyOthers } from "@/lib/notify";
import { usePerson } from "@/lib/person-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const TABS: { key: ListType; label: string }[] = [
  { key: "gemensamt", label: "Gemensamt" },
  { key: "hannes", label: "Hannes" },
  { key: "elvira", label: "Elvira" },
];

export function TodoLists() {
  const { person } = usePerson();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ListType>("gemensamt");
  const [text, setText] = useState("");
  const [deadlineFor, setDeadlineFor] = useState<string | null>(null);

  useEffect(() => {
    if (person === "Hannes") setActive("hannes");
    else if (person === "Elvira") setActive("elvira");
  }, [person]);

  const { data: all = [] } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["todos"] });

  const listLabel = (t: ListType) =>
    t === "gemensamt" ? "gemensamma listan" : `${t === "hannes" ? "Hannes" : "Elviras"} lista`;

  const add = useMutation({
    mutationFn: (value: string) => addTodo(value, active, person ?? "Hannes"),
    onSuccess: (_data, value) => {
      invalidate();
      notifyOthers(
        person,
        `${person ?? "Någon"} lade till "${value}" i ${listLabel(active)}`,
      );
    },
    onError: () => toast.error("Kunde inte lägga till punkten"),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TodoItem> }) =>
      updateTodo(id, patch),
    onSuccess: invalidate,
    onError: () => toast.error("Kunde inte spara ändringen"),
  });
  const remove = useMutation({ mutationFn: deleteTodo, onSuccess: invalidate });

  const items = sortTodos(all.filter((i) => i.list_type === active));
  const doneCount = items.filter((i) => i.done).length;

  const clear = useMutation({
    mutationFn: () => clearDoneTodos(items),
    onSuccess: () => {
      invalidate();
      toast.success("Avklarade punkter rensade");
    },
  });

  const now = Date.now();

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-2xl bg-muted p-1">
        {TABS.map((tab) => {
          const count = all.filter((i) => i.list_type === tab.key && !i.done).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex-1 rounded-xl px-2 py-3 text-sm font-medium transition-colors ${
                active === tab.key
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground"
              }`}
            >
              {tab.label}
              {count > 0 ? <span className="ml-1 text-xs opacity-70">{count}</span> : null}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          add.mutate(text.trim());
          setText("");
        }}
        className="flex gap-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ny punkt…"
          className="h-12 rounded-xl bg-card"
          aria-label="Ny att göra-punkt"
        />
        <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-xl">
          <Plus className="size-5" />
          <span className="sr-only">Lägg till</span>
        </Button>
      </form>

      <ul className="space-y-2">
        {items.map((item) => {
          const overdue =
            !item.done && item.deadline && new Date(item.deadline).getTime() < now;
          return (
            <li
              key={item.id}
              className={`rounded-2xl border bg-card p-3 shadow-soft ${
                overdue ? "border-destructive/60" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item.done}
                  onCheckedChange={(checked) => {
                    update.mutate({
                      id: item.id,
                      patch: {
                        done: Boolean(checked),
                        completed_by: checked ? (person ?? null) : null,
                      },
                    });
                    if (checked)
                      notifyOthers(
                        person,
                        `${person ?? "Någon"} klarade "${item.text}"`,
                        `todo-${item.id}`,
                      );
                  }}
                  className="mt-1 size-6 rounded-md"
                  aria-label={`Bocka av ${item.text}`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-base ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                  >
                    {item.text}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tillagd av {item.added_by ?? "okänd"}
                    {item.completed_by ? ` · klar av ${item.completed_by}` : ""}
                  </p>
                  {item.deadline ? (
                    <p
                      className={`mt-1 flex items-center gap-1 text-xs ${
                        overdue ? "font-medium text-destructive" : "text-clay"
                      }`}
                    >
                      <CalendarClock className="size-3.5" />
                      {formatDeadline(item.deadline)}
                      {overdue ? " · förfallet" : ""}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(item.id)}
                  aria-label={`Ta bort ${item.text}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
                >
                  <Trash2 className="size-4" />
                </button>
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
                  onClick={() => setDeadlineFor(deadlineFor === item.id ? null : item.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                    item.deadline
                      ? "bg-accent text-accent-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  <CalendarClock className="size-3.5" />
                  Deadline
                </button>
                {item.list_type === "gemensamt" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        {
                          update.mutate({ id: item.id, patch: { list_type: "hannes" } });
                          notifyOthers(
                            person,
                            `${person ?? "Någon"} delegerade "${item.text}" till Hannes`,
                          );
                        }
                      }
                      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      <UserRoundPlus className="size-3.5" />
                      Till Hannes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        {
                          update.mutate({ id: item.id, patch: { list_type: "elvira" } });
                          notifyOthers(
                            person,
                            `${person ?? "Någon"} delegerade "${item.text}" till Elvira`,
                          );
                        }
                      }
                      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      <UserRoundPlus className="size-3.5" />
                      Till Elvira
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      update.mutate({ id: item.id, patch: { list_type: "gemensamt" } })
                    }
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    Till gemensamt
                  </button>
                )}
              </div>

              {deadlineFor === item.id ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Input
                    type="datetime-local"
                    defaultValue={toLocalInput(item.deadline)}
                    onChange={(e) =>
                      update.mutate({
                        id: item.id,
                        patch: { deadline: fromLocalInput(e.target.value), notified_at: null },
                      })
                    }
                    className="h-11 flex-1 rounded-xl"
                    aria-label="Deadline"
                  />
                  {item.deadline ? (
                    <Button
                      variant="ghost"
                      className="h-11 rounded-xl"
                      onClick={() => update.mutate({ id: item.id, patch: { deadline: null } })}
                    >
                      Ta bort
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Inget att göra här just nu.
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
