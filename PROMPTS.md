# Zadání pro jednotlivé chaty

Otevři nový chat nad stejnou složkou a vlož příslušný blok. Nevkládej všechny bloky do jednoho chatu. Tyto texty jsou také určeny k průběžné aktualizaci po změně plánu.

## E1
```text
Pracujeme na MVHunt v této složce. Přejmenuj tento chat na „E1 – Základ projektu“, pokud máš nástroj pro změnu názvu. Přečti AGENTS.md, PROJECT.md a PLAN.md. Proveď pouze etapu E1 včetně jejích ověřovacích kritérií. Projekt vytvoř přímo tady; složka zatím obsahuje jen plánovací dokumenty. Připrav spustitelný základ, skutečné příkazy a návod, neimplementuj další etapy ani finální vzhled. Na konci aktualizuj stav v PLAN.md a společný PROJECT.md včetně deníku, testů, známých chyb a předání pro E2. Neprovedené testy jasně odliš od úspěšných.
```

## E2
```text
Přejmenuj tento chat na „E2 – Pravidla a společný čas“, pokud to nástroje umožňují. Přečti AGENTS.md, PROJECT.md, PLAN.md a prohlédni současný kód. Proveď E2: deterministická pravidla, fáze hry, společný rozvrh odhalení a testovatelný čas s jednoduchou simulací. Dodrž všechny příklady časování a rozhodni hraniční případy popsané v plánu. Dokonči ověřovací kritéria E2; nesimuluj hotový backend. Aktualizuj PLAN.md a PROJECT.md včetně rozhodnutí, výsledků testů, známých chyb a předání pro E3.
```

## E3

Před zahájením přečti také `src/game/README.md`: hranice E2, transakční start a dosud neschválený návrh GPS oken. Ověř neměnnost slotů, důvěryhodný čas přijetí a proveditelnost publikace včetně pozdního okna; čistý predikát E2 není bezpečnostní vrstva.

```text
Přejmenuj tento chat na „E3 – Bezpečná synchronizace“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a současný kód. Proveď E3: skutečný datový adaptér, anonymní identitu, serverový čas a izolaci her. Prakticky otestuj pravidla databáze v emulátoru: lovec nesmí číst soukromé ani budoucí polohy, měnit cizí data ani si přidělit správu. Ověř aktuální bezplatné limity a proveditelnost důvěryhodného push odesílání a plánování pro E8. Nezapínej placený tarif. Pokud je potřeba konfigurace účtu, dokonči nejdřív lokálně ověřitelnou práci a napiš přesný postup. Splň kritéria E3 a aktualizuj PLAN.md, PROJECT.md a při změně architektury i další zadání v PROMPTS.md. Hostingové upřesnění pro tuto etapu: frontend bude na GitHub Pages, repozitář později public. Backend, oprávnění a push scheduler musí být samostatné služby.
```

## E4
```text
Přejmenuj tento chat na „E4 – Čekárna a správa hry“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a stav implementace. Proveď E4: založení, nastavení, čekárnu, role, připravenost, více zástupců a bezpečný obnovovací kód vedoucího. Přezdívka není autentizace; zajisti automatický návrat stejné identity a schválené obnovení na jiném zařízení. Žádná náhodná automatická správa. Otestuj souběžný start a neoprávněné operace podle kritérií E4. Aktualizuj PLAN.md a PROJECT.md včetně předání pro E5.
```

## E5

Výchozí stav po E4: přečti také `server/README.md`, `server/lobby.mjs`, `src/ui/Lobby.tsx` a `tests/lobby.test.mjs`. Čekárna vyžaduje lokální důvěryhodné API (`pnpm lobby:server`, LOBBY_EMULATORS=true) vedle emulátorů/Vite. Správní role je `role`, herní tým `team`; stabilní postava `playerId` může změnit UID. Obnovu hráče do stop promítni přes historii vazeb UID → playerId a otestuj ztrátu starých oprávnění. Nahraď jednorázovou GPS kontrolu připravenosti jediným společným proudem. Hodnoty odhalovacích GPS oken a 30s připravenost jsou výslovně testovací/provizorní; uzavři je podle měření, nezaměňuj za schválenou terénní politiku. Neobnovuj přímé klientské zakládání/správu her. E4 čeká externí free hosting důvěryhodného API a fyzické ověření; to neoznač za hotové implementací E5.
```text
Přejmenuj tento chat na „E5 – GPS, mapa a odhalování“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a současný kód. Proveď E5: jeden GPS proud, mapu lovců, přehled uprchlíka a bezpečné společné odhalování. Udržuj poslední stopy, skutečný čas měření a potvrzené doručení; jasně řeš nepřesnost, staré body, offline a zamítnuté GPS. Dodrž volby jmen a výchozí vypnutí náhledu „co o mně vidí lovci“. Splň kritéria E5, odděl simulované od fyzických GPS testů a aktualizuj PLAN.md a PROJECT.md s předáním pro E6.
```

## E6
```text
Přejmenuj tento chat na „E6 – Chycení, konec a návrat“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a kód. Proveď E6: potvrzované chycení, opravu omylu, výsledky, všechny způsoby konce a další kolo bez mazání předchozího. Po návratu z uspání nebo offline načti správný autoritativní stav; otestuj duplicity a souběhy i odchod organizátora. Neotevírej ukončenou hru omylem opravou chycení. Splň kritéria E6 a aktualizuj PLAN.md a PROJECT.md včetně ručního scénáře a předání pro E7.
```

## E7

Aktuální předání E6 (26. 10. 2026): nejprve přečti server/ROUND.md a poslední deník PROJECT.md. Klasický lov má serverové transakce chycení/opravy/konce a frontend úklid GPS; pravidla přímé zápisy round zakazují. Oprava po konci je jen pro vedoucí a nikdy neotevře hru. Časový konec plyne z uloženého limitu i bez hosta; sync-round jej při návratu materializuje s původním časem. Nejisté akce se opakují se stejným operationId, jsou scoped na gameId/UID. Zachovej to při PWA aktualizacích/cache a kapesním překrytí. E6 lokálně 51 unit/32 emulátorových testů a desktopový průchod; fyzické telefony/GPS/uspání nejsou ověřené. Scénář pro doplnění v server/ROUND.md. Nákaza zůstává E10. Starší předání E5 níže je historické; úklid GPS E6 už implementován.
```text
Přejmenuj tento chat na „E7 – PWA a kapesní režim“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a kód. Proveď E7: instalovatelnou PWA, správné aktualizace a cache, kapesní zámek dotyků s podržením a potvrzením a Screen Wake Lock se sledováním ztráty. Neslibuj GPS při systémovém zamčení. Připrav bezpečný HTTPS test na telefonech a otestuj návrat, offline a reload podle plánu. Pokud nemáš fyzická zařízení, připrav přesný test pro uživatele a nech tato kritéria čekat na ověření. Aktualizuj PLAN.md a PROJECT.md s předáním pro E8. Hostingové upřesnění pro tuto etapu: první potřebný HTTPS test připrav na GitHub Pages; tehdy připrav public repozitář po kontrole souborů i historie na tajemství a osobní data. Ověř Vite base, manifest, scope/service worker a reload na podcestě repozitáře.
```

## E8
Předání E7: přečti `src/pwa/README.md`, `src/pwa/worker.js`, `src/pwa/register.ts` a `server/ROUND.md`. PWA je implementovaná a lokálně ověřená, fyzické telefony a veřejné HTTPS nasazení čekají. Rozšiř jediný existující service worker a scope podle `MVHUNT_BASE`; zachovej statický allowlist bez herních dat, aktualizace až po zavření všech klientů a žádný nucený reload během hry. Připravený Pages workflow je ruční a nebyl nasazen. E8 nesmí předchozí čekající etapy označit za HOTOVO ani slibovat obnovu GPS pushem.
```text
Přejmenuj tento chat na „E8 – Push a organizační zprávy“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a rozhodnutí z E3. Proveď E8: skutečné Web Push přes důvěryhodnou bezplatnou serverovou službu, automatické připomínky a uložené zprávy vedoucích s bodem srazu a potvrzením přečtení. Zajisti oprávnění, deduplikaci, expiraci a zastavení připomínek po konci; žádné odesílací tajemství v klientu. Ověř push i bez otevřené aplikace organizátora. Toast není push. Pokud nasazení nebo fyzický test chybí, napiš konkrétní zbývající kroky a neoznač celou etapu hotovou. Aktualizuj PLAN.md a PROJECT.md s předáním pro E9. Hostingové upřesnění pro tuto etapu: frontend na GitHub Pages, odesílatel a scheduler mimo něj. Push a návrat z notifikací ověř na skutečné HTTPS adrese a podcestě.
```

## E9
```text
Přejmenuj tento chat na „E9 – Trasy a historie“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a kód. Proveď E9: soukromé dávkované ukládání tras ze stejného GPS proudu, výsledky a archiv pro organizátora, filtr více hráčů a přehrávání podle společného času. Respektuj mezery, role a oprávnění; soupeř během hry nesmí číst trasu. Navrhni konkrétní uchování dat a úklid v bezplatných limitech; neodsouhlasené hodnoty označ jako návrh. Nepřidávej vyskakovací souhlas před každým startem. Otestuj kritéria E9 a změř objem bodů a přenosů. Aktualizuj PLAN.md a PROJECT.md s předáním pro E10.
```

## E10
```text
Přejmenuj tento chat na „E10 – Hranice, nákaza a více her“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a kód. Proveď E10: připojovací kódy/odkazy a QR pro více izolovaných her, režim nákaza s bezpečnou změnou role a opravou a polygon hranic s orientačním varováním bez penalizací. Schovku neimplementuj. Otestuj tři souběžné hry, oprávnění při změně role a GPS šum u hranice podle kritérií. Aktualizuj PLAN.md a PROJECT.md; doporučené další chaty jsou V1 a O1. Hostingové upřesnění pro tuto etapu: odkazy a QR musí respektovat GitHub Pages podcestu a fungovat při přímém otevření/reloadu bez serverového SPA fallbacku.
```

## V1 – první spuštění i pozdější návraty
```text
Přejmenuj tento chat na „V1 – Vzhled a ovládání“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a prohlédni aktuální implementované obrazovky. Tento chat je určen pro vzhled a použitelnost; herní pravidla a datové kontrakty zachovej. Proveď V1 nad skutečným aktuálním stavem, včetně novějších funkcí. Prioritou je čitelnost venku, ovládání na mobilu, odpočty, rozlišení chyb a kapesní režim. Ověř různé rozměry a chybové stavy, dolož výsledek snímky a proveď základní regresní průchod. Aktualizuj PLAN.md a PROJECT.md. Při pozdějším návratu uprav jen požadovaný rozsah a zapiš nové předání, nemaž starší historii.
```

## O1 – první spuštění i pozdější návraty
```text
Přejmenuj tento chat na „O1 – Výdrž a optimalizace“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a aktuální kód. Tento chat je určen pro měřenou optimalizaci. Nejprve zjisti baseline, potom uprav GPS práci, dávkování tras, síťové odběry, mapu a další prokazatelné zdroje spotřeby. Zachovej férová odhalení a oprávnění. Ověř kapacitní model 2–3 her s uvedeným počtem hráčů; odděl emulovanou zátěž od reálných kvót. Připrav nebo proveď srovnatelný bateriový test na fyzických telefonech, bez měření netvrď úsporu procent. Zapiš před/po výsledky, regresní testy a neověřené části do PROJECT.md a aktualizuj PLAN.md. Chat musí být použitelný i po přidání budoucích funkcí.
```

## E11
```text
Přejmenuj tento chat na „E11 – Nasazení a terénní ověření“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a skutečný stav všech etap. Proveď E11: ověř bezplatnou konfiguraci a bezpečné nasazení přes HTTPS, databázová pravidla, push službu a scheduler, dokumentaci pro vedoucí a rollback. Připrav úplný test dvou telefonů a tří izolovaných her podle plánu; nepředstírej provedené fyzické kroky. Oprav nalezené chyby v rozsahu ověření, zaznamenej výsledky a zbývající omezení pro skupinový playtest. Nezapínej placené tarify. Aktualizuj PLAN.md a PROJECT.md včetně konečného návodu a seznamu skutečně neověřených bodů. Hostingové upřesnění pro tuto etapu: použij schválený GitHub Pages a později public repozitář; navazuj na případné nasazení E7. Před zveřejněním prověř soubory i historii na tajemství a osobní data. Připrav GitHub Actions, správné Vite/PWA cesty a rollback; ověř aktuální limity. Backend a push zůstávají oddělené.
```

### Návaznost po E3 (24. 10. 2026)
E3 lokálně ověřuje Firebase Auth/RTDB přes skutečné emulátory, produkční projekt zatím chybí. Před E4/E5 přečti src/data/README.md, database.rules.json a src/data/firebase.ts. Zachovej default deny, transakční serverový start a neměnnost slotů. Čti metadata po větvích a konkrétní sloty po hráčích; celé games/{id}, private a slots nesmí mít společné read oprávnění. Zamítnutý odběr před termínem je nutné v termínu znovu otevřít. První potvrzený bod je neměnný a viditelný od termínu, pozdní první doručení jen v explicitním okně. Hodnoty GPS politiky nejsou schválené, UI E4 nesmí potichu zavést 30/10 s jako finální default. E4 spravuje členství/nastavení/start přes ověřené API; schválený vstup a obnova fungují i po startu. Změny herních rolí po startu pro nákazu zůstávají úkol E6/E10 s regresními emulátorovými testy. E8 má konkrétní návrh Cloudflare Workers Free (minutový cron, 10 ms CPU, dávkování do 50 subrequestů) + FCM HTTP v1; jde o návrh další služby, nikoli schválené či otestované nasazení. Nezapínat Blaze. Před veřejným provozem dořešit omezení tvorby her/bodů a retenci. Příkazy a přesně chybějící externí kroky v README a datovém kontraktu.

Upřesnění E10 od uživatele 2026-10-25: dlouhé interní game ID nezadává hráč; použij krátký snadno opsatelný připojovací kód (návrh šest znaků bez záměn), odkaz a QR. Schvalování primárně přezdívkou, UID jen v detailech. V jedné hře atomicky zakaž duplicity přezdívek po normalizaci okrajových mezer/velikosti písmen, otestuj souběžné schválení. Přezdívka ani připojovací kód nejsou autentizace; převod identity zůstává výslovně schvalovaný a kód vedoucího oddělený.

QR připojení E10: organizátor má na svém telefonu tlačítko pro velký QR konkrétní hry. Hráč jej načte systémovým fotoaparátem, otevře připojovací odkaz, zadá přezdívku a požádá o schválení. Vedle QR krátký kód a kopírování odkazu. Žádný obnovovací kód/správní přístup v QR. Ověřit dvěma Androidy a respektovat GitHub Pages podcestu.

Předání E5 pro E6 (25. 10. 2026): přečti src/location/README.md a src/data/useHuntSync.ts. E5 je ČEKÁ NA OVĚŘENÍ (51 unit / 24 skutečných emulátorových testů, syntetické UI; fyzické HTTPS telefony chybí). Nové sloty jsou pod stabilním playerId, allies čtou jen lovci. Zachovej jeden GPS watch, původní measuredAt, serverové receivedAt a neměnné sloty. GPS okna 30/10 s zůstávají výslovnou testovací volbou. E6 musí autoritativně řešit chycení/opravu/konec, jejich souběhy, zastavení GPS a přepojení odběrů; dnešní časový konec zastavuje odesílání, samotný watch dosud běží. Testy vedle uživatelových emulátorů spouštěj přes pnpm test:rules:isolated (9001/9100), nemazat DB ruční hry. Legacy UID sloty se automaticky nemigrují. Externí E3/E4 infrastruktura a fyzický E5 scénář stále čekají; nevydávej je za hotové.
