# MVHunt – vývoj po otestovatelných etapách

Každá etapa je samostatný chat v této složce. Zadání kopíruj z `PROMPTS.md`. Všechny chaty čtou a aktualizují `PROJECT.md`. Názvy zde jsou také doporučené názvy chatů.

Stavy: NEZAHÁJENO / ROZPRACOVÁNO / ČEKÁ NA OVĚŘENÍ / BLOKOVÁNO / HOTOVO.

| Etapa | Stav | Závisí na |
|---|---|---|
| E1 – Základ projektu | HOTOVO | dokumentace |
| E2 – Pravidla a společný čas | HOTOVO | E1 |
| E3 – Bezpečná synchronizace | ČEKÁ NA OVĚŘENÍ | E2 |
| E4 – Čekárna a správa hry | ČEKÁ NA OVĚŘENÍ | E3 |
| E5 – GPS, mapa a odhalování | ČEKÁ NA OVĚŘENÍ | E4 |
| E6 – Chycení, konec a návrat | ČEKÁ NA OVĚŘENÍ | E5 |
| E7 – PWA a kapesní režim | ČEKÁ NA OVĚŘENÍ | E6 |
| E8 – Push a organizační zprávy | NEZAHÁJENO | E7, proveditelnost E3 |
| E9 – Trasy a historie | NEZAHÁJENO | E8 |
| E10 – Hranice, nákaza a více her | NEZAHÁJENO | E9 |
| V1 – Vzhled a ovládání | NEZAHÁJENO | základ E7, doporučeno E10 |
| O1 – Výdrž a optimalizace | NEZAHÁJENO | E9, doporučeno E10 + V1 |
| E11 – Nasazení a terénní ověření | NEZAHÁJENO | E10 + O1; V1 dle potřeby |

Doporučené pořadí: E1–E10 → V1 → O1 → E11. V1 a O1 jsou samostatné opakovaně použitelné chaty; po pozdějších funkcích lze aktualizovat jejich rozsah a vrátit se k nim. E11 lze zahájit pro přípravu nasazení i při čekání na fyzické testy, ale nesmí deklarovat celou hru ověřenou.

## E1 – Základ projektu
**Výsledek:** spustitelná lokální aplikace a vývojové prostředí.
- Založit projekt přímo v kořeni, TypeScript a základní UI v češtině. Domluvený výchozí stack ověřit, připnout závislosti lockfilem.
- Oddělit moduly hry, datového adaptéru, polohy, mapy a UI; připravit explicitní demonstrační adaptér pro další etapy.
- Doplnit README, ignorování tajemství, příklad prostředí bez hodnot, lint/typecheck/build a testovací infrastrukturu. Nevytvářet zbytečnou architekturu bez chování.
**Ověření:** čistá instalace podle návodu, běžící úvodní obrazovka, úspěšný typecheck a build. Z chybějící produkční konfigurace srozumitelný stav, ne falešná online hra.
**Mimo rozsah:** Firebase účty, vlastní herní pravidla, push, finální design.

**Ověřeno 2026-10-24:** čistá instalace `pnpm install --frozen-lockfile` v nové dočasné kopii bez node_modules; lint, typecheck, 4 testy a build prošly v kořeni i čisté kopii. Běžící úvodní obrazovka ověřena v desktopovém prohlížeči: chybějící konfigurace, výslovné demo, zavření a reload. Fyzický telefon nebyl testován a není kritériem E1. Podrobnosti, omezení a předání E2 v PROJECT.md, návod v README.md.

## E2 – Pravidla a společný čas
**Výsledek:** deterministický herní model ovladatelný v simulaci bez GPS a internetu.
- Fáze, validace nastavení, start, vypuštění, rozvrh odhalení, časový konec a stabilní ID.
- Předávané hodiny, uložitelné časy; návrh událostí a řešení souběhu. Návrh smlouvy pro GPS měření/odhalovací sloty.
- Jednoduchý vývojový panel dovolí posunout čas bez čekání deseti minut.
**Ověření:** testy sekvencí 10/5 → 5,10,15; 10/3/5 → 3,6,9,10,15; vypnutý předstih → 10,15; předstih 0; shodné termíny bez duplicity; návrat po přeskočení několika intervalů; konec bez nových odhalení po limitu. Výslovně rozhodnout odhalení přesně na konci.

**Ověřeno 2026-10-24:** všechny uvedené příklady a hranice prošly automatickými testy (celkem 46/46 včetně E1 a GPS kontraktu). Lint, typecheck a build prošly. Desktopový prohlížeč: místní start, zamčené nastavení, skoky 12/24/36 minut a konec bez dalšího odhalení. Přesně na konci se neodhaluje; při předstihu 0 se v čase 0 neodhaluje. Kontrakt a technický stav scheduled viz src/game/README.md. GPS okna 30 s/10 s jsou pouze testovaný návrh pro E3/E5, nikoli schválené hodnoty nebo backend. Fyzický telefon není ověřen a není kritériem E2.

## E3 – Bezpečná synchronizace
- Počítat s frontendem na GitHub Pages. Backend, vynucení oprávnění a push scheduler běží samostatně; konfiguraci přizpůsobit skutečnému HTTPS originu aplikace.
**Výsledek:** dva klienti sdílejí stav a databáze vynucuje pravidla.
- Ověřit aktuální bezplatné tarify; navrhnout cílový model 2–3 her, autentizaci, oddělení dat, serverový čas, idempotenci a transakce.
- Emulátory a automatické testy oprávnění; implementovat skutečný adaptér. Host/zástupce, vlastní GPS zápisy, soukromé body, zveřejněné sloty, izolace her.
- Prakticky prokázat, že lovec nepřečte soukromé/budoucí souřadnice, ani přes přímé API. Zamezit pozdějšímu svévolnému přepisování odhalení a změně role klientem.
- Předem ověřit realistickou bezplatnou cestu k E8: důvěryhodné push odesílání a pravidelný scheduler. Pokud je třeba další služba, sepsat konkrétní volbu/limity, ne zapnout placení.
**Ověření:** dva klienti se shodnou na startu; test odlišných hodin klientů; zamítnuté cizí zápisy, předčasná/cizí čtení a nepovolená správa; schválené čtení po termínu. Testy běží proti skutečným pravidlům emulátoru, ne jen JS filtrům. Pokud infrastruktura není nastavená, označit co je ověřené lokálně a co čeká.

**Lokální výsledek 24. 10. 2026:** implementován Firebase adaptér, anonymní persistentní identita, serverový start a UI čas, pravidla scoped na hru, vlastní soukromé body a neměnné časované sloty. RTDB/Auth emulátory skutečně spuštěny; detaily a finální výsledky v posledním předání PROJECT.md. Bezplatné podmínky a konkrétní návrh Cloudflare Workers Free + FCM pro E8 v src/data/README.md. Externí projekt, nasazení rules, origin a fyzické telefony nejsou nakonfigurované/ověřené, proto E3 není HOTOVO. E4 lze implementovat nad lokálně ověřeným kontraktem; nejdříve přečíst omezení rolí, explicitní GPS politiku a čtení slotů po jednotlivých termínech.
## E4 – Čekárna a správa hry
**Výsledek:** skuteční hráči založí hru, připojí se, připraví se a bezpečně ji zahájí.
- Jedna aktuální hra v UI, uvnitř game ID; přezdívky, role, připravenost, nastavení, zástupci.
- Trvalá anonymní identita, návrat, schválení převzetí hráče na jiném zařízení a pozdního nového vstupu.
- Bezpečný obnovovací kód vedoucího, ochrana hádání, odvolání/rotace a audit převzetí. Pokud zvolený backend nezvládá bezpečné ověření, vyřešit důvěryhodnou funkcí, ne zveřejněním kódu v databázi.
- Krátké odpojení nezpůsobuje změnu správy. Více oprávněných vedoucích může mít jasně definovaná práva, ale změny musí být konzistentní.
**Ověření:** dva profily / dvě zařízení projdou čekárnou; stejná přezdívka nekrade postavu; běžný hráč nemění nastavení; zástupce a obnovovací tok fungují po zavření organizátora; špatný kód je zamítnut; současný start vytvoří jen jednu hru/startovní událost.

**Lokální výsledek 25. 10. 2026:** čekárna E4 a důvěryhodné Node API implementovány. Ověřeno proti skutečným Auth/RTDB emulátorům: souběžný start, role/oprávnění, dvě stejné přezdívky s různými playerId, schválený převod s odvoláním starého UID, pozdní vstup, rotace/odvolání/spotřebování kódu, ochrana hádání a HTTP tokeny. Výsledné počty a prohlížečový průchod v posledním deníku PROJECT.md. Čeká externí vlastní Firebase + HTTPS API/frontend, výběr ověřeného bezplatného API hostingu a dva ruční profily/fyzické telefony. Nezapnut žádný placený tarif. E5 lze vyvíjet lokálně podle server/README.md; nejprve zapojit jediný GPS proud a stabilní playerId do stop.

## E5 – GPS, mapa a odhalování
**Výsledek:** první skutečný lov s aktuálními spoluhráči a společnými stopami uprchlíků.
- Jeden GPS proud, čas měření/přijetí, přesnost, kontrola stáří a potvrzené zápisy. Lovec s mapou; uprchlík s přehledem a volitelnou mapou.
- Připojit rozvrh E2 k bezpečnému zveřejnění E3; poslední stopa zůstává. Odpočet, počty, jména dle nastavení a vypnutý náhled „co vidí lovci“.
- GPS denied/timeout/nepřesnost zvlášť od offline; definovat odezvu na vynechané odhalení a pozdní doručení. Mapa s atribucí a dovoleným poskytovatelem.
**Ověření:** dvě zařízení/klienti s kontrolovanými souřadnicemi; před termínem žádný únik, po termínu správný bod; další termín nahradí stopu; starý GPS bod zůstane označený starým časem; bez GPS čitelný stav a mapa nespadne, ani když ostatní dorazí dřív. Fyzické GPS ověřit samostatně na telefonu přes HTTPS.

**Lokální výsledek 25. 10. 2026:** jediný GPS watch pro čekárnu/hru, Leaflet mapa lovce, přehled uprchlíka, volitelná mapa a vypnutý vlastní náhled. Stopy pod stabilním playerId, oddělené měření/doručení/termín/stáří/přesnost, zachování poslední stopy při vynechání, obnova po reconnectu/reloadu, oddělená oprávnění průběžných poloh lovců. 51/51 unit a 24/24 emulátorových testů, lint/typecheck/build a frozen install prošly. Desktopový prohlížeč se syntetickými body: mapa bez vlastní GPS, stará/nová stopa po návratu, stáří, atribuce a skrytí jmen; snímek e5-screen.png. Fyzické telefony/GPS přes vlastní HTTPS NEPROVEDENY, externí E3/E4 konfigurace chybí. GPS politika 30/10 s nadále výslovná testovací volba, ne terénně schválený default. Kontrakt a přesný ruční postup v src/location/README.md. E6 lze implementovat lokálně; celá hra není ověřena pro veřejný provoz.

## E6 – Chycení, konec a návrat
**Výsledek:** kompletní kolo klasického lovu včetně oprav, ukončení a další hry.
- Potvrzení chycení, čas a výsledky, oprava omylu s oprávněními a jasným pravidlem po konci.
- Automatický časový konec a konec chycením všech; ukončení vedoucím. Zastavit GPS/odběry tam, kde už nejsou potřebné.
- Po probuzení/reloadu načíst autoritativní snapshot; offline akce nesmí být falešně potvrzené. Idempotence kliknutí, reconnectu a přehrání fronty.
- Nová hra nezničí předchozí výsledky; opožděné zprávy staré hry nezasáhnou novou.
**Ověření:** duplicita chycení, oprava, souběh konce a chycení, lovec uspí klienta přes dvě odhalení a po návratu vidí správný stav; odchod vedoucího nezastaví čas; nové kolo bez mazání.

## E7 – PWA a kapesní režim
**Krok 6 – GitHub (26. 10. 2026):** načten origin a znovu ověřena lokální historie; API GitHubu potvrzuje soukromý repozitář a oprávnění pro push. Připraven commit hostingových úprav a kontrol. Přepnutí na public zbývá potvrdit kvůli e-mailu autora v existující historii; fyzické/HTTPS ověření dál čeká.
**Doplnění 26. 10. 2026 – příprava nasazení, bod 1:** dokončena lokální kontrola souborů/historie a hostingová úprava API + `/healthz`; nález e-mailu v metadatech a výsledky v `PUBLICATION-REVIEW.md`. Žádné zveřejnění/nasazení ani uzavření fyzických kritérií; E7 nadále ČEKÁ NA OVĚŘENÍ.
**Předání E6 (26. 10. 2026):** lokální klasické kolo implementováno, 51 unit a 32 skutečných emulátorových testů; prohlížeč ověřil dialogy, opravu, konec, reload a nové kolo se zachováním starého. E6 čeká na fyzické uspání/GPS/offline dvou telefonů a vlastní externí konfiguraci. Pravidla, data, příkazy a ruční scénář v server/ROUND.md. E7 lze zahájit lokálně, fyzické kritérium E6 nepřeskakovat.
- Pro první potřebné HTTPS testy použít plánovaný GitHub Pages; tehdy připravit public repozitář po kontrole souborů i historie na tajemství a osobní data. Ověřit Vite base, manifest start_url/scope, service worker a reload na skutečné podcestě repozitáře. Plán není provedené nasazení.
**Výsledek:** instalovatelná aplikace s ochranou dotyků a testem probouzení.
- Manifest, ikony, service worker, vhodná cache statických souborů a bezpečná aktualizace aplikace. Nekachovat cizí citlivá herní data.
- Kapesní překrytí, podržení + potvrzení, Wake Lock a sledování ztráty, návrat po visibility change. Offline obrazovka a aktuálnost dat.
- Testovací HTTPS nasazení pro dva telefony, pokud lokální prostředí fyzické funkce neumožní; postup bez tajných klíčů v klientu.
**Ověření:** instalace na iOS/Android podle dostupných telefonů; kapesní dotyky nechytnou hráče ani neukončí hru; displej zůstává vzhůru pokud systém dovolí; návrat po systémovém zámku/reloadu, po odebrání Wake Lock a při úspoře energie; zaznamenat konkrétní zařízení/verze i neprovedené kombinace. Emulátor nenahrazuje fyzické ověření.

## E8 – Push a organizační zprávy
**Předání E7 (26. 10. 2026):** manifest/ikony/SW se statickým allowlistem, aktualizace čekající na zavření všech klientů, modální kapesní zámek (2 s + potvrzení) a Wake Lock implementovány. Lokálně 60/60 testů a desktopový průchod včetně offline reloadu po zastavení preview; telefony a HTTPS deployment čekají. Přesný postup a kontrakt v `src/pwa/README.md`. E8 rozšíří jediný existující SW/scope, zachová zákaz cache herních dat a nesmí vynutit aktualizaci během hry. E7 není HOTOVO.
- Frontend na GitHub Pages; důvěryhodný odesílatel a scheduler mimo Pages. Push, service worker a odkazy z notifikací ověřit na skutečné HTTPS adrese a podcestě aplikace.
**Výsledek:** zabezpečené skutečné push a přetrvávající bod srazu.
- Důvěryhodný odesílatel a automatické plánování ze schválené bezplatné varianty, předplatná scoped na hráče/zařízení/hru, expirace a odebrání.
- Vypuštění lovců, připomínky odhalení, bod+text od vedoucího, potvrzení přečtení. Zprávy dostupné i po hře v dané místnosti.
- Deduplikace, expirace starých upozornění, zrušení po konci/nové hře, kontrola role u odesílání, ochrana před spamem. Žádné polohy do push payloadu bez potřeby; odkaz otevře správnou hru.
**Ověření:** skutečná notifikace na zamčeném telefonu v podporované instalované PWA, tap otevře správnou zprávu; zakázané notifikace neblokují hru; neoprávněný hráč neodesílá vedoucí zprávy; ukončená hra neposílá připomínky; potvrzení přečtení se projeví vedoucímu. Ověřit průběh bez otevřeného telefonu organizátora. Pokud není backend nasazen, etapa čeká, simulovaný toast není splnění.

## E9 – Trasy a historie
**Výsledek:** uložené výsledky a přehrání poslední/archivované hry pro organizátora.
- Soukromý záznam ze stejného GPS proudu, omezený počet bodů, dávky, časy/role a mezery; omezená offline fronta a bezpečné doplnění bez změn odhalení.
- Archiv a filtry více hráčů, společná časová osa, výsledky oddělené od přesných tras. Oprávnění až po konci podle dohodnuté politiky.
- Navrhnout a uzavřít uchování/mazání s uživatelem; explicitně označit provizorní hodnoty. Ověřit automatický úklid v cílovém backendu, ne jen při návštěvě stránky. Nevytvářet nekonečný archiv bez kapacitního plánu.
**Ověření:** dvě vybrané trasy se přehrávají ve stejném čase; mezera není falešně přesná cesta; chycený v lovu dále netrackuje; během hry soupeř nepřečte trasu; cizí hra/uživatel nepřečte archiv; opakovaná dávka nezdvojí body; nová hra uchová staré výsledky. Změřit počty bodů, zápisů a bajtů.

## E10 – Hranice, nákaza a více her
- Připojovací odkazy a QR musí respektovat GitHub Pages podcestu a fungovat při přímém otevření/reloadu bez serverového SPA fallbacku.
**Výsledek:** dva režimy a 2–3 izolované hry s kódy.
- Připojovací kódy/odkazy a QR, bezpečné vyhledání a schválené členství; pravidla proti hádání/spamu. Kód není identita ani administrátorský klíč.
- Organizátor má tlačítko „Zobrazit QR pro připojení“: velký QR na displeji jeho telefonu, který hráči načtou běžným fotoaparátem. QR otevře odkaz na konkrétní hru a předvyplní připojení; hráč zadá přezdívku a požádá o vstup. Schválení vedoucím zůstává, QR neobsahuje obnovovací kód ani správní oprávnění. Vedle QR zobrazit krátký kód a nabídnout kopírování odkazu. Ověřit načtení z telefonu organizátora na obou dostupných Androidech a správnou podcestu GitHub Pages.
- Upřesnění 2026-10-25: dlouhé game ID ponechat interní, pro hráče krátký snadno opsatelný kód (návrh šest nezaměnitelných znaků). Ve schvalování primárně přezdívka, UID jen v detailech. Přezdívky v jedné hře jedinečné po normalizaci mezer/velikosti písmen; atomická kontrola kolizí, také při souběžném schválení. Stejné jméno nikdy neobnovuje identitu bez schváleného převodu.
- Nákaza: atomická změna role, aktualizace odběrů a oprávnění, počty týmů, návrat po opravě a definovaný konec při nulových uprchlících. Bez dalšího režimu schovka.
- Polygon nastavený vedoucím, zobrazení před startem, orientační varování s tolerancí GPS a hysterezí; žádná penalizace.
**Ověření:** tři současné hry s vlastními časy se neovlivní, přímé API nepřečte cizí data; převod a oprava role nemají mezistav se špatnými oprávněními; simulovaná trasa kříží polygon, šum u hranice nespamuje; po konci žádné další varování.

## V1 – Vzhled a ovládání (samostatný vracecí chat)
**Výsledek:** přehledné mobilní UI nad existujícími funkcemi.
- Nejdřív inventura skutečně implementovaných obrazovek a stavů. Zachovat kontrakty a pravidla; měnit prezentaci, čitelnost a interakce.
- Přehled odpočtů, GPS/sítě a rolí, palcem dosažitelná tlačítka, responzivita, safe areas, kontrast, přístupnost, tmavý/kapesní režim a chybové stavy.
**Ověření:** vizuální kontrola malého i většího mobilu, portrét/krajina, dlouhá jména, offline/chyba, klávesnice a potvrzovací dialogy; základní herní průchod bez regrese. Doložit snímky, ne pouze popis designu.
**Při návratu:** načíst aktuální stav E etap a upravit jen požadované obrazovky; nevracet novější funkce do starého návrhu.

## O1 – Výdrž a optimalizace (samostatný vracecí chat)
**Výsledek:** změřená a zlepšená spotřeba bez porušení pravidel.
- Nejdřív baseline: GPS četnost, body, zápisy, čtení, přenosy, mapové rendery, reconnect a velikost aplikace. Fyzické bateriové měření s délkou testu, jasem a modelem telefonu.
- Ladit dávky, přesnost/četnost, neaktivní mapu, odběry a úklid; kapacitní model 2–3 souběžných her s uvedeným počtem hráčů a délkou.
- Zachovat skutečné časy, kvalitu tras a bezpečná odhalení; nesnížit spotřebu pouhým vypnutím potřebné funkce bez dohody.
**Ověření:** srovnatelné před/po výsledky a regresní testy; emulovaný load neoznačovat jako skutečný billing. Bez fyzického měření uvést neověřenou baterii; neslibovat procenta z odhadu.

## E11 – Nasazení a terénní ověření
- Cílový frontend: GitHub Pages, repozitář později public (schváleno uživatelem). Navázat na případné testovací nasazení E7. Před zveřejněním zkontrolovat soubory i historii na tajemství a osobní data. Nastavit GitHub Actions pro build/publikování, HTTPS, Vite base a PWA cesty podle skutečného repozitáře, přímé odkazy/reload a rollback. Backend/push nasadit odděleně. Znovu ověřit aktuální podmínky a bezplatné limity Pages.
**Výsledek:** použitelná testovací/release verze a přesný návod pro vedoucího.
- Oddělené testovací/produkční prostředí podle možností, HTTPS, správné databázové rules, push secrets, scheduler, doména bez nutnosti nákupu a ověřené aktuální free limity.
- README s instalací/spuštěním/nasazením/obnovou, verzování a rollback, checklist organizátora, diagnostika bez úniku poloh.
- Koordinovaný scénář dvou telefonů, zkrácené intervaly v testovací hře; záznam zjištění a závažnosti. Klientské testovací ovládání nesmí být dostupné v produkční hře.
**Ověření:** čekárna → start → předstih → odhalení → chycení/nákaza → konec → historie → další hra; výpadek vedoucího a převzetí; offline/reload/uspání; push; GPS chyby; tři izolované hry; kontrola kvót a oprávnění. Fyzické kroky provádí uživatel, pokud zařízení nejsou dostupná nástrojům. Dokumentovat co zůstává na reálný skupinový playtest.
