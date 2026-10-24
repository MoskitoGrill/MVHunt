# MVHunt – zadání, aktuální stav a předání mezi chaty

Tento soubor je společná paměť projektu. Každý vývojový chat jej před prací přečte a před ukončením aktualizuje. Rozpis etap je v `PLAN.md`; kopírovatelná zadání v `PROMPTS.md`; pravidla práce v `AGENTS.md`.

## Aktuální stav
- E1 – HOTOVO: implementován a lokálně ověřen základ React + TypeScript + Vite přímo v kořeni. Výsledky viz poslední deník předání.
- Připraveno: česká úvodní obrazovka, diagnostika konfigurace, explicitní místní demo adaptér, oddělení modulů a vývojové kontroly.
- Další etapa: E2 – Pravidla a společný čas; herní pravidla dosud nejsou implementovaná.
- Není vybrán ani založen nový Firebase projekt, hosting nebo push infrastruktura. Neexistuje konfigurace pro nasazení.
- Provedeny lokální kontroly a prohlížečový průchod E1 (viz deník). Fyzické telefony a výdrž baterie nejsou ověřené.

## Účel a prostředí
Česká mobilní hra do města pro klub dorostu a mládeže. Týmy lovců a uprchlíků, každý 1 až více hráčů. Uprchlíci mají předstih, lovci vidí jejich polohu jen při společných odhaleních. Priorita: funkčnost, férové časování, spolehlivost v terénu, zdarma pro malou skupinu a přibližně 2–3 souběžné hry. Vývoj v této složce ve VS Code, vzhled až samostatně. Uživatel má dva telefony pro první test.

Původní reference: https://mvhuntmv.netlify.app/ . Nemáme oprávnění k jejímu projektu. Nová aplikace vzniká od začátku; nepřipojovat se k původní databázi. Veřejný prototyp obsahuje Leaflet a Firebase, osobní časovače od první GPS, globální hráče pod přezdívkami. Tyto nedostatky nepřebírat.

## Odsouhlasená pravidla
### Založení a čekárna
- Každá hra má vlastní interní ID už od začátku; nová hra nikdy nevyžaduje smazání staré.
- Zpočátku lze zobrazovat jednu aktuální hru bez opisování kódu. Později krátký připojovací kód, odkaz a QR; datový model musí unést souběh her.
- Organizátor nastaví předstih, interval odhalení při lovu, odhalování při předstihu a maximální délku lovu. Délka lovu se počítá od vypuštění lovců, nikoli od útěku uprchlíků.
- Odhalování při předstihu: stejné jako při lovu (výchozí), vlastní interval, nebo vypnuto.
- Organizátor určí více zástupců, nejlépe další vedoucí. Obnovovací kód je odlišný od připojovacího kódu a umožní bezpečné převzetí správy na jiném telefonu. Použití se zaznamená. Žádné automatické přidělení správy náhodnému dítěti; toto rozhodnutí navazuje na uživatelův požadavek více zástupců a kódu.
- Hráči mají stabilní vlastní identitu, přezdívku a roli; přezdívka není autentizace. Na stejném zařízení automatické pokračování. Ztrátu identity / jiné zařízení schválí vedoucí; nesmí stačit stejné jméno.
- Připravenost hráče zahrnuje připojení, oprávnění GPS a čerstvou polohu. Nového hráče po startu přijme jen organizátor/zástupce; návrat existujícího hráče není nový vstup.

### Čas, start a odhalení
- Fáze: čekárna → předstih → lov → ukončeno; případné další technické stavy musí být zdokumentovány.
- Organizátor zahájí hru společným potvrzeným startem. Hra pokračuje bez jeho přítomnosti.
- V čase 0 se poloha uprchlíků neodhaluje. Při předstihu 10 min a intervalu 5 min jsou odhalení v 5 a 10 min, potom v 15, 20…
- Při vypuštění lovců nastane odhalení vždy, nezávisle na předchozím intervalu. Překryté termíny vytvoří jednu událost, ne dvě.
- Interval lovu začíná vypuštěním lovců: předstih 10 min, vlastní interval předstihu 3 min, lov 5 min → odhalení 3, 6, 9, 10, 15, 20…
- Čas plyne podle společných uložených časů a serverového času; klientský odpočet je jen zobrazení. Návrat po uspání nesmí restartovat intervaly.
- Odhalení je plánovaná událost, nikoli záruka nové GPS. Zaznamenávat čas měření, přijetí a příslušné odhalení. Starou polohu nikdy neoznačit jako čerstvou.
- Technicky definovat a otestovat toleranci stáří měření a pozdního doručení v E2/E5; konkrétní hodnoty nejsou dosud schválené. Nesmí docházet k libovolnému dodatečnému přepisování minulých odhalení.
- Průběžné souřadnice uprchlíků nejsou lovcům dostupné ani v síťových odpovědích. Oprávnění kontroluje důvěryhodná služba/pravidla databáze, ne pouze UI.

### Herní obrazovky a chycení
- Lovec: mapa, vlastní poloha, aktuálně dostupné polohy spoluhráčů, poslední odhalené stopy uprchlíků až do dalšího odhalení, skutečný čas měření/stáří a přesnost, odpočet a počty hráčů. Jména uprchlíků lze nastavením skrýt; neslibovat neprůstřelnou anonymitu jen skrytým popiskem.
- Uprchlík: jednoduchý přehled, GPS a spojení, potvrzené doručení, odpočet, tlačítko chycení, volitelná mapa. Funkce „Co o mně vidí lovci“ je v nastavení a výchozí stav vypnuto.
- Chycení výhradně ručním tlačítkem s potvrzením, zaznamenat čas. Umožnit opravu omylu; kdo a do kdy smí opravu provést se určí a zapíše v E6. Automatické GPS chycení není součástí.
- Klasický lov: chycený přestává hrát a sdílet polohu. Nákaza: potvrzení chycení mění hráče na lovce a záznam pokračuje pod novou rolí; oprava vrací také oprávnění a roli.
- Konec: všichni chyceni v klasickém režimu, konec časového limitu, nebo ukončení vedoucím. Návrh pravidla pro současný konec/opravu nesmí nechtěně znovu otevřít hru.

### Kapesní režim a mobilní omezení
- Vlastní zámek ovládání: tmavé překrytí, minimum údajů, zablokovaná běžná tlačítka; podržení zámečku + potvrzení odemkne.
- Screen Wake Lock udržuje displej zapnutý, pokud to systém dovolí; sledovat ztrátu a znovu požádat při návratu. Ruční jas nastavuje hráč.
- Nejde o systémový zámek: neblokuje vypínací tlačítko, systémová gesta ani přepnutí aplikace. Při skutečném zamčení webová GPS na iOS ani obecně mobilním webu není garantovaná.
- Lovci mohou telefon zamknout; po návratu se načte aktuální stav a všechny stopy, i pokud zmeškali události. Jejich sdílená poloha/trasování při uspání může mít výpadek.
- Uprchlíci primárně používají otevřenou aplikaci a kapesní režim. Push jen připomíná nutnost otevření; neobnoví GPS sám.
- Výpadek sítě, GPS a zamítnutý Wake Lock zobrazovat odděleně. Nezobrazovat odeslání jako potvrzené před potvrzením služby.

### Zprávy a push
- Skutečné Web Push patří do rozsahu, nikoli pouze lokální banner. Předplatné a explicitní souhlas uživatele; iOS vyžaduje podporovanou verzi a aplikaci na ploše.
- Upozornění: vypuštění lovců, připomínka před odhalením, zpráva organizátora/zástupce. Čas připomínky konfigurovat interně a zdokumentovat.
- Vedoucí klikne do mapy a odešle „sraz tady“ s textem a bodem během i po hře. Zpráva je uložená a dostupná i po návratu. Potvrzení přečtení je samostatná akce, ne potvrzení přijetí push.
- Odesílání push vyžaduje zabezpečenou serverovou funkci/službu; vlastní placený server není potřeba. Bezplatnou variantu je třeba konkrétně ověřit v E3/E8 včetně automatického plánování. Tajné klíče nikdy v klientu.
- Dorazení v přesnou sekundu, zvuk přes tichý režim ani nouzové svolání nejsou zaručené. Push nenahrazuje základní synchronizaci hry.

### Trasy, historie a hranice
- Využít stejný GPS proud jako pro hru, nepouštět druhé nezávislé sledování. Výběr bodů podle pohybu/času/přesnosti, dávkované odesílání. Parametry až podle měření baterie.
- Výsledky ukládat odděleně od přesných tras. Organizátor má mít historii, mapu tras a filtrování jednoho či více hráčů se společnou časovou osou. Mezery a nepřesnost přiznat.
- Během hry záznam soupeře není dostupný; kdo z vedoucích může číst živé soukromé trasy musí být výslovně rozhodnuto, výchozí návrh je až po konci.
- Uživatel nechce další potvrzovací dialog pro záznam tras: žádné přerušující schvalování před každým startem. Krátký popis funkce lze mít v čekárně. Dobu uchování a rozsah oprávnění je ještě třeba uzavřít; nesmazat archiv dřív, než je rozhodnuto, a neslibovat neomezenou historii zdarma.
- Hranice: nakreslený polygon, přehled před startem a varování poblíž/vně oblasti. Pouze orientační, nikdy automatická penalizace. Zohlednit přesnost a několik měření; na pozadí nelze zaručit varování.
- Schovka není nyní v rozsahu. Další budoucí návrhy se zapisují do backlogu, neimplementují automaticky.

## Technické zásady / dosud nepotvrzené volby
- Výchozí stack: React + TypeScript + Vite, Leaflet, Firebase anonymní Auth + Realtime Database, Vitest a podle potřeby Playwright, Firebase emulátory pro pravidla. Volba není vytvořená infrastruktura.
- E3 musí prakticky prokázat serverem vynucené odhalování v bezplatném tarifu. Možnost: soukromé časové sloty a kontrola čtení pomocí serverového `now`; přesný model, přípustné zápisy a neměnnost slotů ověřit emulátorem. Není přijatelné číst celý soukromý strom a filtrovat jej v JS.
- Pokud Firebase Spark nestačí na důvěryhodné push odesílání/plánování, posoudit oddělenou bezplatnou serverless službu. Nezapínat Blaze automaticky. Změna služby patří do rozhodnutí s ověřenými limity a návodem nasazení.
- Každý přenos přesných tras a každé odběrové oprávnění musí být scoped na hru. Připojovací kód sám nesmí dávat organizátorská práva.
- Soukromé body a budoucí odhalení nesmí unikat přes export, cache, realtime odběr ani historii. Při konci či změně role obnovit oprávnění a odběry.
- Mapa: vybrat poskytovatele dlaždic s vhodnými aktuálními podmínkami a atribucí. Nezaměňovat bezplatnou knihovnu za bezlimitní mapový hosting. Bez svévolného hromadného offline stahování dlaždic.
- Délky a kapacity přes UI validovat, ale také v důvěryhodné vrstvě. Evidovat maximální podporovanou velikost partie a rozpočet přenosů podle reálného modelu.

## Rozhodnutí, která čekají na příslušnou etapu
1. E2/E5: stáří přijatelné GPS, časové okno odeslání a chování při pozdních bodech; doporučené hodnoty zdůvodnit.
2. E3: konečná služba pro bezpečná odhalení a hranice bezplatného provozu; ověřit také proveditelnost push.
3. E4: konkrétní bezpečný tok převzetí správy, pořadí zástupců, správa obnovovacího kódu.
4. E6: oprava chycení, souběh s koncem, chování při odpojeném potvrzení.
5. E8: bezplatné důvěryhodné odesílání a plánování push, deduplikace, expirace a oprávnění zpráv po konci.
6. E9: uchování tras, čtenáři archivu, rozumné metriky výsledků a návrh osobních rekordů (dlouhodobá identita bez účtů má omezení).

## Známé chyby a omezení
- E1 obsahuje pouze základ; skutečná hra, backend, GPS, mapa a push dosud nejsou implementované. Stav není vydáván za online hru.
- Platformní omezení: background GPS, Wake Lock a push nejsou garance dostupnosti telefonu.
- Není ověřena žádná konkrétní kapacita ani spotřeba baterie; 2–3 hry jsou cíl k ověření.

## Návrhy změn a backlog
- Schovka: odloženo mimo aktuální rozsah.
- Osobní dlouhodobé rekordy napříč telefony: později; neidentifikovat hráče pouze přezdívkou.
- Další odchylky: zatím žádné. Nový návrh zapisuj s důvodem, dopadem a stavem (návrh / schváleno / odmítnuto).

## Aktuální příkazy a konfigurace
Lokální prostředí: Node.js 22.12+ a pnpm 11.25.0. `pnpm install --frozen-lockfile`, `pnpm dev` (obvykle http://localhost:5173), `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm preview`. Podrobný skutečný postup včetně cesty k pnpm na tomto počítači a testu telefonu je v `README.md`.

E1 nevyžaduje žádnou službu ani prostředí. `.env.example` obsahuje jen prázdné položky; `.env.local` je ignorován. `VITE_DATA_MODE=demo` je výslovná místní simulace, výchozí stav vypíše chybějící konfiguraci. Ani doplnění veřejných Firebase hodnot nenaváže síť: reálný adaptér vznikne v E3. Žádná produkční konfigurace ani emulátor nejsou nasazeny.

## Deník předání – pouze přidávat, nemazat historii
### 2026-10-24 – Příprava plánu
- Vytvořeny `AGENTS.md`, `PROJECT.md`, `PLAN.md`, `PROMPTS.md`.
- Nebyl vytvořen kód aplikace ani externí infrastruktura. Plán není implementace.
- Další krok: E1; projít zadání a vytvořit spustitelný projekt v této složce.

### Šablona dalšího předání
- Datum / etapa / stav:
- Co bylo implementováno a kde:
- Rozhodnutí a případné odchylky (schválené vs. navrhované):
- Změny dat, oprávnění a migrace:
- Spuštěné kontroly, příkazy a výsledky:
- Neprovedené kontroly a důvod:
- Ruční test pro uživatele:
- Známé chyby (ID, závažnost, reprodukce, dopad, další krok):
- Změny dalších etap/prompts:
- Doporučená další etapa a přesný výchozí stav:

### 2026-10-24 – E1 – Základ projektu – HOTOVO
- Implementace: React/TypeScript/Vite přímo v kořeni, česká úvodní obrazovka (`src/ui/App.tsx`), konfigurační diagnostika a explicitní lokální demonstrace (`src/data/adapter.ts`). Oddělené moduly game/data/location/map/push/ui, minimální kontrakty měření a předávaných hodin bez herních pravidel. Mapa je výslovně textový zástupný stav. Přidán README, prázdný příklad prostředí, ignorování .env a serverových účtů, ESLint, Vitest, typecheck a build.
- Závislosti: přesné verze v package.json a pnpm-lock.yaml, packageManager pnpm 11.25.0. Ověřeno s Node 24.22.1. Nejnovější TypeScript 7.0.2 nebyl kompatibilní s typescript-eslint; finální verze 6.0.3, bez peer konfliktů. První lint kvůli tomu selhal; po opravě prošel. Dočasně vyzkoušený ESLint 9 byl nahrazen podporovaným 10.13.0.
- Rozhodnutí: výchozí stack zachován. Leaflet a Firebase SDK se přidají při skutečném použití E5/E3. Ověřeny oficiální Vite požadavky, Leaflet stabilní vydání a Firebase Spark limity (100 připojení, 1 GB dat, 10 GB stažení/měsíc); odkazy v README. Kapacita více her, pravidla a push scheduler nejsou prokázané a zůstávají kritériem E3. Nebyly založeny účty, použita infrastruktura reference ani zapnuto placení. Žádná navrhovaná odchylka herních pravidel.
- Data/oprávnění/migrace: pouze místní konstantní demo ID demo-local, bez identity, souřadnic, persistence, sítě či databáze. Žádná migrace. Kompletní veřejná konfigurace stále zobrazí chybějící implementaci backendu; výchozí/neplatná konfigurace nepřepne na demo.
- Ověření v kořeni: `pnpm lint`, `pnpm typecheck`, `pnpm test` (4/4), `pnpm build` úspěšné; `pnpm peers check` bez konfliktů. Build 18 modulů, JS 221,75 kB (gzip 69,62 kB); nejde o měřenou optimalizaci O1.
- Čistá instalace: nové zdroje bez node_modules/dist v dočasné složce `mvhunt-e1-6459f0ed8ed645faafb90295361a5300`; `pnpm install --frozen-lockfile` úspěšný (175 balíčků, použitá lokální cache). Následně lint, typecheck, 4/4 testy a build úspěšné. Nebyl proveden samostatný test stahování všech balíčků z prázdné globální cache.
- Prohlížeč: skutečně spuštěný Vite, načteno http://127.0.0.1:5173 v desktopovém in-app prohlížeči. Ověřena chybějící konfigurace, kliknutí do demonstrace, její označení, zavření a reload. Snímek `e1-screen.png`. První přístup k localhost selhal před spuštěním/dostupností serveru; konečný průchod přes 127.0.0.1 prošel.
- Prostředí: npm není v PATH, použit bundlovaný pnpm cestou uvedenou v README. Sandbox zablokoval symlink úložiště pnpm; instalace a server proběhly s povolením mimo sandbox. Chyba certifikátu registru opravena NODE_USE_SYSTEM_CA=1, bez vypínání TLS. Běžná instalace uživatele je popsána samostatně, bez závislosti na interní cestě Codex.
- Známé chyby: žádná zjištěná nevyřešená chyba v rozsahu E1. Neimplementované funkce dalších etap jsou přiznané v UI. Bezpečnost backendu, fyzická GPS, telefony, baterie, offline hra a nasazení nebyly testovány; v E1 nejsou hotovou funkcí ani splněným testem.
- Ruční test: `pnpm dev`, otevřít vypsanou adresu, ověřit diagnostiku, otevřít/zavřít demo a reload. Telefon ve stejné Wi-Fi: síťová adresa serveru, ověřit čitelnost a tlačítka; model/OS/prohlížeč dosud nezaznamenán, test neproveden. HTTP slouží jen pro tento základ; budoucí GPS/PWA testovat přes HTTPS. Kompletní postup v README.
- Návaznost: beze změny, PROMPTS.md zůstává platný. Další krok E2: z minimálního game/model.ts vytvořit deterministický model a předávané hodiny, testy všech rozvrhů a hraničních časů z PLAN.md a jednoduchý panel simulace. Žádný backend ani GPS zatím nepřipojovat. E1 je dokončená, E2 lze zahájit.
