# MVHunt · E7

Český klasický lov nad Firebase a důvěryhodným API: čekárna/správa, GPS a společná odhalení, potvrzované chycení, opravy, výsledky a další kolo bez mazání předchozího. E7 přidává PWA, statickou cache a čekající aktualizace, kapesní zámek s podržením/potvrzením a Screen Wake Lock se sledováním ztráty. Bez konfigurace se hra nesimuluje. Produkční infrastruktura a fyzické telefony zatím nejsou ověřené; push navazuje v E8. Pravidla E6: [server/ROUND.md](server/ROUND.md). **PWA kontrakt, HTTPS konfigurace, čekající telefonní scénář a předání E8: [src/pwa/README.md](src/pwa/README.md).** Lokální PWA build/preview: `.\mvhunt.cmd pwa`, pak `http://127.0.0.1:4188/MVHunt/`; Vite dev PWA neregistruje. GPS při systémovém zamčení není garantovaná.

**E4 lokálně potřebuje tři procesy:** `pnpm emulators`, v dalším terminálu `$env:LOBBY_EMULATORS='true'` a `pnpm lobby:server`, ve třetím `pnpm dev --port 5173 --strictPort`. Veřejnou emulátorovou konfiguraci uvádí sekce níže. Úplný kontrakt, postup dvou profilů/telefonů, role, obnova a externí konfigurace jsou v [server/README.md](server/README.md). Níže uvedená diagnostika E3 je historický scénář; současné UI už hry zakládá přes server. Při běžících emulátorech testy mažou syntetickou DB, proto je nespouštějte souběžně s ručním průchodem.

## Spuštění

Na tomto počítači lze bez nastavování PATH použít `mvhunt.cmd`: v prvním PowerShellu `& 'C:\Users\moski\Documents\Prográmky\MVHunt\mvhunt.cmd' emulators`, ve druhém stejná cesta s `server`, ve třetím s `web`. Spouštěč sám nastaví pracovní složku, bundlované Node/pnpm a Javu z `.tools` pouze pro daný proces. Režim `web` výslovně nastavuje syntetickou lokální konfiguraci demo-mvhunt, nezasahuje do `.env.local` ani systémového PATH. Kontrola cest/verzí: stejná cesta s `check`. Otevřít http://localhost:5173. Všechna tři okna ponechat běžet.

Potřebujete Node.js 22.12+ (ověřeno 24.22.1) a pnpm 11.25.0. Pokud pnpm nemáte, po instalaci Node.js s npm spusťte `npm install --global pnpm@11.25.0`.
V PowerShellu v této složce:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Otevřete adresu vypsanou Vite (obvykle http://localhost:5173). Server ukončíte Ctrl+C.
Výchozí obrazovka vysvětlí chybějící konfiguraci. Tlačítko „Otevřít místní demonstraci“ výslovně otevře lokální ukázku. Reload vrátí výchozí stav; data se neukládají.

V prostředí Codex, kde není pnpm v PATH, funguje místo `pnpm`:

```powershell
& 'C:\Users\moski\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' dev
```

Stejným způsobem nahraďte pnpm i u ostatních příkazů. Jde o lokální cestu tohoto počítače, pro běžnou instalaci není potřebná.
Pokud na tomto počítači instalace hlásí `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, v PowerShellu před instalací nastavte `$env:NODE_USE_SYSTEM_CA='1'`. Tím Node použije také důvěryhodné certifikáty Windows; ověřování TLS se nevypíná.

## Kontroly a produkční sestavení

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

Build vzniká v `dist/`, preview obvykle na http://localhost:4173. `pnpm test:watch` je průběžné testování. Čistou instalaci ověřte v nové kopii zdrojů bez node_modules a dist příkazem `pnpm install --frozen-lockfile`, poté kontrolami výše. Používejte pnpm-lock.yaml, nemíchejte správce balíčků.

## Konfigurace

Pro E1 není `.env.local` potřeba. Volitelně zkopírujte `.env.example` do `.env.local`. Prázdný `VITE_DATA_MODE` nebo `production` zobrazí diagnostiku; `demo` zapne označenou demonstraci. Neplatný režim zobrazí chybu. Po změně prostředí restartujte server. Úplná Firebase konfigurace zobrazí tlačítko připojení a diagnostiku. Po připojení lze ověřit UID a načíst metadata známé hry, do níž má identita členství.

Pro produkční připojení je potřeba výhradně nový vlastní Firebase Spark projekt; v tomto chatu nebyl založen. Nikdy nepoužívejte konfiguraci reference. Všechny `VITE_*` hodnoty jsou součástí veřejného klienta; serverová tajemství, obnovovací kódy a push klíče sem nepatří. Ignorování .env není náhradou kontroly obsahu před commitem.

## Rozdělení kódu

- `src/game`: deterministický model, rozvrh, předávané hodiny a testy; přesný kontrakt v `src/game/README.md`.
- `src/data`: demo, diagnostika a skutečný Firebase adaptér; kontrakt, pravidla a externí konfigurace v src/data/README.md.
- `src/location`: kontrakt měření, bez spuštění GPS.
- `src/map`: textový zástupný stav, bez dlaždic.
- `src/push`: vyhrazené místo pro E8.
- `src/ui`: úvodní obrazovka a výslovné otevření demonstrace.

## Volba technologií (ověřeno 24. 10. 2026)

React + TypeScript + Vite umožňují statické sestavení a oddělený model testovaný Vitestem. [Vite vyžaduje Node 20.19+ nebo 22.12+](https://vite.dev/guide/); projekt používá minimálně 22.12. Leaflet zůstává volbou pro E5 ([stabilní verze 1.9.4](https://leafletjs.com/download.html)); poskytovatel dlaždic zatím není vybrán a knihovna není mapový hosting.

Firebase anonymní Auth + RTDB Spark je lokálně ověřený základ E3. Oficiální free limity, kapacitní odhad, bezpečnostní kontrakt a konkrétní návrh E8 (Cloudflare Workers Free + FCM) jsou v [datovém kontraktu](src/data/README.md). Externí nasazení ani skutečné push nebyly provedeny.
## Ruční kontrola v prohlížeči a na telefonu

1. Bez prostředí otevřete aplikaci: musí být vidět chybějící konfigurace, žádná online hra.
2. Otevřete demonstraci: musí být jasně označená, bez hráčů a přenosu polohy. Zavřete ji a obnovte stránku.
3. Na telefonu ve stejné důvěryhodné Wi-Fi otevřete síťovou URL vypsanou `pnpm dev`. Je-li spojení blokováno, zkontrolujte firewall pro místní síť; nevystavujte vývojový server internetu.
4. Ověřte čitelnost na výšku/šířku a ovládání tlačítek. Zaznamenejte model telefonu, OS, prohlížeč a výsledek.

HTTP po LAN stačí jen pro tuto úvodní obrazovku. Skutečná GPS, Wake Lock a PWA budou vyžadovat odpovídající HTTPS testování v pozdějších etapách. E1 neověřuje chování na pozadí ani baterii.

## Ruční ověření simulace E2

Spusťte `pnpm dev`, otevřete adresu vypsanou serverem a „Otevřít místní demonstraci“. Není potřeba žádná služba ani .env. Nastavte předstih 10, interval lovu 5 a délku lovu 20 minut. Potvrďte místní start: předstih, další odhalení 5 min, konec 30 min. Třikrát stiskněte +12 minut: v 12 min lov / poslední 10 / další 15; v 24 min poslední 20 / další 25; v 36 min ukončeno / poslední 25 / další žádné. Na konci 30 min se neodhaluje.

Resetujte a zvolte vlastní interval předstihu 3: plán 3,6,9,10,15,20,25. Vypnuto: 10,15,20,25. Předstih 0: vypuštění v 0 bez odhalení, další v 5 min, konec 20 bez odhalení. Neplatný či nulový interval zablokuje start s konkrétní chybou. Po startu je nastavení zamčené. Reset/reload místní simulaci zahodí; obnova serializovaného modelu se testuje automaticky, nikoli jako persistence UI. Tlačítko +12 minut simuluje časový skok, ne skutečné uspání operačním systémem.

Stejný scénář lze provést na telefonu ve stejné Wi-Fi přes síťovou adresu Vite. Zaznamenejte zařízení/OS/prohlížeč; fyzický průchod E2 dosud nebyl proveden. Neměňte kvůli testu systémové hodiny. Technická pravidla a návrh GPS oken: `src/game/README.md`.

## Emulátory a bezpečnostní testy E3

Potřebujete Java 21+ v PATH (`java -version`). V tomto počítači byla pro testy stažena přenosná Eclipse Temurin JRE 21 do ignorované `.tools/`; nejde o systémovou instalaci. V PowerShellu ji lze zpřístupnit jen pro danou relaci:

```powershell
$taskJava = Get-ChildItem .tools -Directory | Select-Object -First 1
$env:PATH = (Join-Path $taskJava.FullName 'bin') + ';' + $env:PATH
pnpm install --frozen-lockfile
pnpm test
pnpm test:rules
```

`test:rules` samo spustí a ukončí Auth 9099 a RTDB 9000 na 127.0.0.1, používá projekt demo-mvhunt a syntetická data. Pokud porty používá jiný emulátor, nejprve jej ukončete. První běh stahuje JAR. Firebase login ani služební účet nejsou pro testy nutné. Produkce se netestuje. `pnpm-workspace.yaml` explicitně zakazuje nepotřebné instalační skripty @firebase/util, protobufjs a re2; pro používané SDK/CLI a emulátory testy prošly. Nezapínejte hromadné povolení skriptů.

Ruční lokální diagnostika: `pnpm emulators`, v druhém terminálu `pnpm dev`. `.env.local` pro **lokální** test obsahuje VITE_USE_EMULATORS=true, VITE_FIREBASE_PROJECT_ID=demo-mvhunt, VITE_FIREBASE_API_KEY=fake-api-key, VITE_FIREBASE_AUTH_DOMAIN=demo-mvhunt.firebaseapp.com, VITE_FIREBASE_DATABASE_URL=https://demo-mvhunt.firebaseio.com a VITE_FIREBASE_APP_ID=demo-app. Po restartu Vite otevřete localhost, připojte Firebase, zapište UID a proveďte reload + připojení: UID má zůstat stejné. Druhý profil prohlížeče má mít jiné UID. Čekárna E4 zakládá hry přes samostatné lokální API; spusťte jej podle server/README.md. Automatické API scénáře ověřuje test:rules. Emulátory nepoužívejte na telefonu přes LAN: localhost ukazuje na telefon a služby jsou záměrně vázány na loopback.

Pro fyzický test je nutný vlastní Firebase Spark projekt a nasazená pravidla podle src/data/README.md, skutečný HTTPS origin a veřejné hodnoty prostředí (VITE_USE_EMULATORS=false). Na dvou telefonech ověřte rozdílná UID, po reloadu zachování každého UID, konkrétní chybu při ztrátě připojení. Čekárnu na telefonu ověřte podle server/README.md po nasazení API. Zaznamenejte model/OS/prohlížeč/origin; žádný fyzický test E3 zatím nebyl proveden. Syntetické testovací body nepovažujte za fyzickou GPS.

## E5 – GPS a mapa
Jeden GPS proud, mapa lovce, přehled uprchlíka a bezpečné sloty jsou implementované a lokálně ověřené. Fyzické telefony/HTTPS GPS čekají. Kontrakt, GPS politika, přesné spuštění i ruční dvoutelefonový scénář: [src/location/README.md](src/location/README.md). Pro regresní testy vedle běžících ručních emulátorů použijte `pnpm test:rules:isolated` (Java 21+), nikoli druhý běh základních portů.
