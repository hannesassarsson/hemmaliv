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
| `SUPABASE_SERVICE_ROLE_KEY` | Serverhemlighet för `api/`-funktionerna |
| `GEMINI_API_KEY` | Serverhemlighet för dokumenttolkning och ingredienser från matsedeln |

Byggkommandot är `npm run build` och katalogen för resultatet är `dist`.

## Data och säkerhet

Om samma Supabase-projekt används läser appen samma tabeller (`shopping_items`, `todo_items`, `meal_plan`, `meal_ideas`) och befintlig data blir kvar. Den här MVP:n ändrar inte databasen och kör inga migrationer.

Inloggning sker med Supabase Auth (e-post och lösenord). Ett konto får bara tillgång till appen när det finns i tabellen `hemma_members`, som kopplar kontot till Hannes eller Elvira. E-postadresser i `hemma_invites` kopplas automatiskt när kontot skapas och e-posten är bekräftad.

Migrationen `20261124120200_lock_down_rls.sql` stänger databasen och dokumentlagringen för alla som inte är medlemmar. Serverfunktionerna under `api/` kräver en inloggad medlem (utom `/api/notifications`, som skyddas av `CRON_SECRET`).

## Push-notiser

`/api/notifications` kontrollerar förfallna deadlines var femte minut och skickar web push till registrerade enheter. För att aktivera den, lägg in `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY` och `CRON_SECRET` i Vercel. Alla utom den första är serverhemligheter och får aldrig börja med `VITE_`.

Vercels gratisplan kör bara cron en gång per dygn, så GitHub Actions-flödet `.github/workflows/notifications.yml` anropar endpointen var femte minut. Lägg in samma `CRON_SECRET` som repo-hemlighet under **Settings → Secrets and variables → Actions**. Om appen byter adress, sätt variabeln `APP_URL` där. Flödet kan köras manuellt under **Actions → Påminnelser → Run workflow** för att testa.
