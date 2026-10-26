# E7 – PWA, kapesní zámek a telefonní ověření

Stav 26. 10. 2026: **ČEKÁ NA OVĚŘENÍ**. Lokální implementace a automatické testy nejsou fyzický telefon. V navazujícím kroku 6 byl repozitář MoskitoGrill/MVHunt zveřejněn a změny odeslány do main; Pages/API deployment ani změna tarifu nebyly provedeny.

## Kontrakt

- Build generuje manifest (`id`, `start_url`, `scope` podle `MVHUNT_BASE`), PNG 192/512 a `sw.js`. Ikony jsou jednoduchý vlastní geometrický terč, bez cizích podkladů. Vite dev service worker neregistruje.
- SW má přesný allowlist sestavených JS/CSS, indexu, manifestu a ikon. Cache je oddělená podcestou a verzí obsahu. Nikdy neinterceptuje POST, API, RTDB/Auth, cizí origin, mapové dlaždice nebo neznámé cesty. Parametry navigace se neukládají; query assety se neinterceptují. Nevytváří offline frontu ani cache herních dat/tokenů. Existující Firebase Auth persistence a sessionStorage nejistých akcí E6 jsou samostatné mechanismy.
- Shell je cache-first z jedné instalované verze, včetně navigace na kořen aplikace s query. Odkazy na hru mají později používat query/hash na kořeni; Pages neposkytují SPA fallback pro libovolné `/game/id`. E10 musí tento kontrakt zachovat.
- Instalace uspěje až po stažení všech souborů. Žádné `skipWaiting`, `clients.claim` ani nucený reload. Nová verze čeká na zavření všech klientů ve scope včetně instalované PWA. UI nabídne postup, stará verze může bezpečně pokračovat. Samotný reload neaktivuje čekající worker. Po aktivaci se uklidí jen staré cache téže podcesty. E8 musí rozšířit stejný worker, nikoli registrovat druhý překrývající se scope.
- Cache je jen obálka aplikace. Offline hra se neprohlašuje za synchronizovanou: systémová síť je pouze indikátor; skutečné DB spojení, GPS a potvrzení zápisu zůstávají oddělené v herním UI. První návštěva bez sítě nefunguje. Vymazání úložiště systémem může odstranit shell i identitu.
- Kapesní režim je celoplošný modální `dialog`: podklad je inertní, hra a jediný GPS proud zůstávají připojené. Krátký dotyk/Escape neodemknou. Souvislé 2 s držení (monotónní předané hodiny) → samostatné potvrzení, výchozí fokus „Zůstat zamčeno“. Pointer cancel/leave, ztráta capture/fokusu a visibility change ruší držení; přepnutí aplikace zruší i rozpracované potvrzení. Reload stejného tabu zachová zámek přes sessionStorage, pokud je dostupné. Jde o ochranu nechtěných dotyků, nikoli autentizaci.
- Wake Lock žádá jen při kapesním režimu nebo výslovně zapnutém checkboxu. Sleduje release, zobrazuje active/lost/denied/unsupported a při návratu přes visibility/pageshow znovu žádá. Zamítnutí nemá nekonečnou retry smyčku, lze opakovat ručně. Opožděný výsledek po vypnutí/unmountu se uvolní. Po odemknutí se lock uvolní, pokud není zapnutý checkbox. Nezapíná audio/video ani nesimuluje dotyky.

Wake Lock je best effort; úspora energie ho může odebrat. Neovládá jas ani vypínací tlačítko. **GPS při systémovém zamčení není garantovaná**, ani na Androidu; push v E8 GPS neobnoví.

## Lokální sestavení na skutečné podcestě

```powershell
pnpm lint
pnpm typecheck
pnpm test
$env:MVHUNT_BASE='/MVHunt/'
pnpm build
pnpm preview --host 127.0.0.1 --port 4188 --strictPort
# otevřít http://127.0.0.1:4188/MVHunt/
```

Node/pnpm bez PATH: použijte cestu runtime a nastavení PATH popsané v README; spouštěč nově umí `.\mvhunt.cmd pwa` (build/preview bez automatického připojení emulátorů). Nezaměňovat s `.\mvhunt.cmd web` (Vite dev bez PWA). Pro lokální herní test explicitně nastavte veřejné demo hodnoty podle README a spusťte emulátory/API; pro samostatné PWA testy není Firebase potřeba. LAN HTTP není bezpečný kontext. USB localhost forwarding dvou Androidů dle `../location/README.md` lze použít jako samostatný kabelový test; pro preview přesměrujte navíc 4188.

## Připravený HTTPS postup – GitHub Pages

Ověřený remote: `https://github.com/MoskitoGrill/MVHunt.git`. Očekávaná adresa po skutečném nasazení: `https://moskitogrill.github.io/MVHunt/` (**zatím není potvrzena jako dostupná**).

1. Kontrola před prvním zveřejněním provedena 26. 10. 2026 a zopakována po `git fetch origin`: bez nálezu detekovaných formátů klíčů/tokenů, e-mail autora v commit metadatech byl výslovně oznámen. V navazujícím kroku 6 zveřejněn repozitář a odeslána main, ověřeno API i bez přihlášení; viz `../../PUBLICATION-REVIEW.md`. Audit opakovat po změnách a prověřit nové vzdálené větve. Necommitovat `.env.local`, ADC, service accounts nebo reálné trasy. Pages/API deployment zatím neproveden.
2. Po kontrole a skutečném zveřejnění nastavit v GitHub Settings → Pages → Source: GitHub Actions. Workflow `.github/workflows/pages.yml` běží **jen ručním workflow_dispatch**. Výchozí `publish=false` pouze sestaví a uloží Pages artifact; `publish=true` nasazuje přes environment `github-pages`. Lze přidat required reviewer v prostředí podle možností účtu. Workflow zde nebyl na GitHubu spuštěn.
3. Bez veřejných proměnných lze otestovat PWA se správnou diagnostikou chybějící konfigurace a výslovnou místní demonstrací. Takový test neprokazuje online hru. Workflow předává base automaticky podle názvu repozitáře; pro současný remote `/MVHunt/`. U user-site repozitáře nebo vlastní domény se base musí upravit.
4. Pro skutečný lov: vlastní nový Firebase Spark, anonymous Auth, aktuální rules (`pnpm exec firebase deploy --only database --project VLASTNI_PROJECT_ID`) a autorizovaný hostname `moskitogrill.github.io`; nasazené důvěryhodné HTTPS API s přesným `LOBBY_ORIGIN=https://moskitogrill.github.io` (origin bez podcesty), vlastním DB URL a serverovým ADC dle `server/README.md`. Hosting API nadále není vybrán/ověřen a představuje externí blok E4. Žádné Blaze ani placení.
5. Do Repository Settings → Variables → Actions vložit jen veřejné `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_APP_ID`, `VITE_LOBBY_API_URL` (HTTPS endpoint). `VITE_USE_EMULATORS=false` a production workflow vynucuje. Nikdy sem nedávat Admin/push private key s prefixem VITE. Rebuild po změně veřejné konfigurace.
6. Před telefony zkontrolovat HTTPS kořen `/MVHunt/`, `/MVHunt/manifest.webmanifest`, `/MVHunt/sw.js` a obě PNG; manifest `start_url/scope/id` = `/MVHunt/`, assety na stejné podcestě. Reload kořene včetně `?game=synthetic` musí fungovat, nevyžaduje serverový SPA fallback. V Chrome DevTools Application ověřit scope a Cache Storage: pouze allowlist statických souborů, žádné herní odpovědi.
7. Aktualizace A→B: nechat dvě okna A (jedno zamčené), nasadit B s viditelnou změnou, vrátit se do A. Obě okna dál fungují, žádný automatický reload, UI oznámí čekající verzi. Zavřít všechna okna i instalovanou PWA, otevřít a ověřit B; stará cache téže podcesty zmizí až při aktivaci. Zkusit přerušit stažení B: A musí zůstat použitelná. Rollback = znovu sestavit a ručně nasadit ověřený předchozí commit; klientům znovu platí stejný postup zavření. Nemazat Firebase Auth úložiště kvůli běžné aktualizaci.

Oficiální podklady ověřené 26. 10. 2026: [GitHub Pages / dostupnost Free pro public repozitáře](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [limity Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [vlastní Actions workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API), [životní cyklus SW](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers). Free/public cesta nevyžaduje placený doplněk; publikovaný web max. 1 GB, soft limit přenosu 100 GB/měsíc, deployment timeout 10 min. Actions a skutečné podmínky účtu ověřit znovu před spuštěním; žádná zdejší měření nepotvrzují provozní kapacitu.

## Dva fyzické telefony – vše zatím ČEKÁ

Každý dostupný Android otestovat samostatně; iOS jen pokud je dostupný, jinak zapsat NEPROVEDENO. Zaznamenat model, OS, verzi prohlížeče, datum, origin, verzi buildu, prohlížeč vs instalovanou PWA, jas a úsporný režim. Bez reálných tras v Gitu.

| Krok | Očekávané chování | Výsledek |
|---|---|---|
| HTTPS a instalace Android/Chrome; případně iOS/Safari Přidat na plochu | Správná ikona, samostatné okno, správná podcesta, reload | ČEKÁ – obě zařízení i iOS kombinace |
| Zámek nad rozehranou hrou, náhodné dotyky, scroll, Escape/Zpět, krátké a přerušené držení, otočení telefonu | Žádné chycení/ukončení, podklad inertní; 2 s a samostatné potvrzení odemknou | ČEKÁ |
| Zamčeno → změna aplikace → návrat; reload zamčeného tabu | Držení/potvrzení zrušeno, zámek zůstává, herní stav se obnoví | ČEKÁ |
| Wake Lock zapnout/vypnout, zamčení aplikace, 5 min bez dotyku | Systém může lock přijmout/odebrat; správný stav; žádná garance při odmítnutí | ČEKÁ |
| Úspora energie, systémové odebrání locku, návrat a ruční retry | Ztráta/zamítnutí viditelné odděleně od GPS/sítě; opakovaná žádost při návratu | ČEKÁ |
| Systémové zamčení přes dvě odhalení, odemknutí | Žádný restart hodin, aktuální autoritativní stav/poslední stopy; GPS mezery přiznány, bez slibu background GPS | ČEKÁ – také E5/E6 |
| Již navštívená PWA → režim letadlo → znovu spustit | Shell dostupný, offline vysvětlení, žádné falešné doručení; po návratu skutečný DB stav | ČEKÁ |
| Vypnout jen API/DB při dostupném internetu | OS „online“ neznamená DB online; chyba/nejistá akce E6 nejsou potvrzením | ČEKÁ |
| Aktualizace A→B ve dvou oknech a rollback dle postupu výše | Žádný nucený reload ani smíšené verze, nová verze po zavření všech klientů | ČEKÁ |

Pokud se offline spuštění nezdaří, zaznamenat stav controlling SW a instalace/cachí v DevTools; neopravovat to zapnutím cache API nebo vymazáním identity. První desktopový offline test odhalil chybějící index v generovaném allowlistu (Vite jej generoval až po pluginu). Opraveno post hookem a povinnou build kontrolou přítomnosti indexu. Opakovaný desktopový IAB test na portu 4189: instalace, reload, zastavení preview serveru, další reload → aplikace úspěšně načtena z cache. Telefonní režim letadlo a instalovaná PWA stále čekají.

## Předání E8

Nejprve přečíst tuto smlouvu, `server/ROUND.md`, `src/data/README.md`, worker a registraci. Použít jediný SW/scope, zachovat čekající aktualizace a statický allowlist; push payloady ani zprávy nezahrnovat do obecné runtime cache. Doplnit důvěryhodného odesílatele/scheduler mimo Pages, aktuálně ověřit free limity a vyřešit kompatibilitu s existujícím API, subscriptions/oprávnění/deduplikaci/expiraci a uložené zprávy. Push nezapínat automaticky a netvrdit, že obnoví GPS. E8 lze vyvíjet lokálně; skutečný HTTPS push a uzavření E7 vyžadují externí konfiguraci a fyzické výsledky.
