# HemmaLiv

En fristående, mobilförst hushållsapp för en delad handlarlista, personliga och gemensamma att-göra-listor samt veckans matplanering.

## Vad som ingår

- Delad handlarlista, snabbval, mängd, återkommande varor och butiksläge
- Tre att-göra-listor, deadline, delegering och återkommande punkter
- Veckobaserad matsedel med sparade middagsidéer och återanvändning från arkivet
- Realtidssynk via Supabase och val av person i den egna webbläsaren
- Ljust och mörkt läge

Butikssortering är regelbaserad och körs i webbläsaren. Appen har därmed inget beroende av Lovable eller en AI-tjänst.

## Lokal körning

1. Kopiera `.env.example` till `.env.local`.
2. Fyll i `VITE_SUPABASE_URL` och `VITE_SUPABASE_PUBLISHABLE_KEY` för det befintliga Supabase-projektet.
3. Kör `npm install` och därefter `npm run dev`.

## Vercel

Importera ett nytt, tomt GitHub-repo i Vercel. Vercel känner igen Vite-konfigurationen. Lägg in följande i **Production**, **Preview** och **Development**:

| Namn | Värde |
| --- | --- |
| `VITE_SUPABASE_URL` | URL:en för Supabase-projektet |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabases publishable/anon-nyckel |
| `VITE_VAPID_PUBLIC_KEY` | Valfri; behövs först när web push aktiveras |

Byggkommandot är `npm run build` och katalogen för resultatet är `dist`.

## Data och säkerhet

Om samma Supabase-projekt används läser appen samma tabeller (`shopping_items`, `todo_items`, `meal_plan`, `meal_ideas`) och befintlig data blir kvar. Den här MVP:n ändrar inte databasen och kör inga migrationer.

Originalprojektet använder öppna RLS-regler och en lokal personväljare, inte riktig inloggning. Det innebär att det inte är en tillräcklig säkerhetsmodell om projektets publika nyckel eller URL sprids. Innan appen delas utanför hushållet bör nästa steg vara Supabase Auth, hushållsmedlemskap och begränsade RLS-regler. Gör inte den förändringen utan en kontrollerad datamigrering.

## Push-notiser

En Vercel Cron-funktion kontrollerar förfallna deadlines var femte minut och skickar web push till registrerade enheter. För att aktivera den, lägg in `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY` och `CRON_SECRET` i Vercel. Alla utom den första är serverhemligheter och får aldrig börja med `VITE_`.
