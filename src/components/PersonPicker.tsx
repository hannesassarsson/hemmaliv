import { usePerson } from "@/lib/person-context";
import { PERSONS } from "@/lib/hemma";

export function PersonPicker() {
  const { setPerson } = usePerson();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <p className="font-display text-sm tracking-[0.3em] text-muted-foreground uppercase">
          Välkommen till
        </p>
        <h1 className="mt-2 text-5xl text-foreground">Hemma</h1>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">
          Vår gemensamma handlarlista, att göra-listor och matplanering. Vem är du?
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {PERSONS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPerson(p)}
            className="w-full rounded-2xl border border-border bg-card px-6 py-5 text-left shadow-soft transition-colors active:bg-accent"
          >
            <span className="font-display text-2xl text-foreground">{p}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Visar {p === "Hannes" ? "Hannes" : "Elviras"} personliga lista som standard
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
