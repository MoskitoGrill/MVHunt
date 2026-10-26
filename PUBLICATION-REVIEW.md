# Příprava testovacího nasazení – bod 1

Navazující krok 6 (26. 10. 2026): uživatel zadal odeslání připravených změn do GitHubu. `git fetch origin` proběhl, vzdálená main odpovídala místní revizi 7fe59f9; GitHub API potvrdilo private repozitář a právo push/admin. Opakovaný audit nezjistil detekované formáty tajemství. Commit/push se připravuje jako samostatný navazující krok; public přepnutí čeká na výslovné rozhodnutí o e-mailu autora v historii. Původní výsledek kontroly níže je historický stav bodu 1.

Kontrola provedena 26. 10. 2026. Technická příprava bodu 1 dokončena; žádný commit, push, změna viditelnosti, nasazení ani účet nebyly provedeny.

## Výsledek kontroly zveřejňovaných souborů a lokální historie

- Prohledány všechny aktuální verzované a neignorované soubory a všech 165 lokálně dostupných historických blobů ze dvou commitů (`96eecb3`, `7fe59f9`). Git object scan zahrnuje i případné nedosažitelné objekty, nikoli jen poslední revizi. Nevypisuje nalezené hodnoty.
- Heuristický scan nenašel PEM soukromé klíče, service-account JSON, známé GitHub/Google OAuth/AWS/Slack tokeny, Google API klíče, JWT ani URL s vloženým heslem. Jde o kontrolu uvedených formátů, ne o důkaz nepřítomnosti libovolného tajemství. Závislosti, ignorované runtime nástroje a lokální logy nejsou součástí zveřejňovaného zdrojového stromu.
- Ručně prohlédnuto šest screenshotů E1–E7 a dvě ikony. Historické binární objekty odpovídají aktuálním souborům (žádná další historická binární verze). Screenshoty obsahují lokální syntetické identity a v E5 syntetický bod 50.001/14.002 doložený předáním; nejsou v nich viditelné obnovovací kódy nebo skutečné trasy účastníků. Testové souřadnice ve zdrojích jsou ve fixtures/testech. Klient nepřebírá konfiguraci referenčního webu.
- **Nález k soukromí:** autor/committer stávajících commitů používá jednu e-mailovou adresu mimo `@users.noreply.github.com`. Public repozitář ji zpřístupní. Konkrétní adresu tento report neopakuje. Dokumentace také obsahuje místní cestu s uživatelským jménem a veřejný GitHub účet. Před změnou viditelnosti rozhodnout, zda je to přijatelné; případné přepsání historie je samostatná změna a nebylo provedeno. Nastavení noreply e-mailu pro budoucí commity nezmění staré commity.
- Ignorování zahrnuje `.env`, `.env.*` kromě `.env.example`, `*.local`, běžné service-account názvy, logy, `.tools`, `node_modules` a `dist`. Arbitrárně pojmenovaný JSON klíč může stále uniknout; skutečný ADC klíč ukládat mimo repo a na hostingu jen jako secret file. Git historii ani metadata nelze vyčistit pouhým přidáním `.gitignore`.

Opakování po dalších změnách: `pnpm audit:public`. Audit vypíše pouze typ nálezu a cestu/hash objektu. Pracuje s lokálně dostupnou historií; před skutečným zveřejněním ověřit i případné další vzdálené větve, které zde nejsou stažené. Nové přihlašovací údaje ani skutečné GPS body do repozitáře nevkládat.

## Hotová úprava API

- `LOBBY_EMULATORS=true`: naslouchá jen `127.0.0.1`, zachováno místní chování.
- Produkční režim: naslouchá `0.0.0.0` na `PORT` poskytnutém hostingem (výchozí 8787). PORT se validuje, start log uvádí skutečnou adresu/port.
- `GET /healthz` vrací HTTP 200 a `{"status":"ok"}`; `HEAD` vrací prázdné tělo. Odpověď má `Cache-Control: no-store`, nečte Firebase, nevrací klíče/konfiguraci/herní data. Je to **liveness procesu**, nikoli ověření Firebase přihlašovacích údajů, rules nebo dostupnosti DB.
- Ostatní metody `/healthz` nezpřístupňuje. Herní API nadále vyžaduje Firebase token a správný CORS origin. Žádná změna dat, rules, rolí, GPS nebo herních pravidel.
- Ruční Pages workflow nyní kromě předchozích kontrol spouští audit a HTTP testy. Workflow zatím nebylo spuštěno na GitHubu; změny jsou připravené lokálně.

## Kontroly

- `pnpm audit:public`: žádný nález detekovaných formátů tajemství; nález metadat e-mailu výše.
- `pnpm lint`, `pnpm typecheck`: prošly.
- `pnpm test`: 60/60.
- `pnpm test:server`: 2/2; skutečné child-process HTTP testy lokálního i veřejného naslouchání, GET/HEAD/POST health, no-store, odmítnutí neautentizované akce a cizího CORS originu. Produkční režim testovaný pouze s demo ID bez credentials a bez přístupu k externí databázi.
- `pnpm test:rules:isolated`: 32/32 proti skutečným lokálním Auth/RTDB emulátorům, včetně rozšířeného HTTP testu health a původního ověření Auth tokenu/idempotence.
- Build s `MVHUNT_BASE=/MVHunt/` prošel; zůstává známé upozornění JS chunku přes 500 kB, optimalizace O1.
- První HTTP běh skončil EACCES a emulátory timeoutem portu hubu v sandboxu; povolené opakování mimo sandbox prošlo. Testy původních uživatelských procesů nebyly ukončovány.

## Přesný další krok

Uživatel může pokračovat založením vlastního Firebase Spark projektu, anonymous Auth, uzamčené RTDB a získáním veřejné web konfigurace (kroky 2–4 předchozího návodu). Před zveřejněním vyřešit přijatelnost e-mailu v historii a případné další vzdálené větve. Pak zkontrolované změny commitnout/odeslat, nastavit služby a spustit ruční deployment. Žádné placení není nutné aktivovat při této lokální přípravě.

Pro navržený **testovací** Render Free: Node 24, Build `npx --yes pnpm@11.25.0 install --frozen-lockfile`, Start `node server/index.mjs`, Health Check Path **`/healthz`**. Environment: `LOBBY_EMULATORS=false`, `GOOGLE_CLOUD_PROJECT`, `LOBBY_DATABASE_URL`, `LOBBY_ORIGIN=https://moskitogrill.github.io`, `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-admin.json`; ADC JSON pouze secret file. PORT poskytne hosting. Render kompatibilita, free limity, skutečné credentials a API operace musí být ověřeny při nasazení; lokální test neznamená funkční veřejnou službu. Před hrou probudit uspávaný server a načíst `/healthz`, poté ověřit skutečnou hru. Health endpoint nesmí sloužit k umělému obcházení uspávání.

Telefonní test po HTTPS deploymentu podle `src/pwa/README.md` a `server/ROUND.md` stále čeká: instalace, GPS/odhalení/chycení, offline/uspání a návrat, kapesní dotyky, ztráta Wake Lock a aktualizace. GPS při systémovém zamčení není garantovaná. E3–E7 zůstávají ČEKÁ NA OVĚŘENÍ, E8 se tím neimplementuje.
