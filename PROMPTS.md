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
```text
Přejmenuj tento chat na „E3 – Bezpečná synchronizace“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a současný kód. Proveď E3: skutečný datový adaptér, anonymní identitu, serverový čas a izolaci her. Prakticky otestuj pravidla databáze v emulátoru: lovec nesmí číst soukromé ani budoucí polohy, měnit cizí data ani si přidělit správu. Ověř aktuální bezplatné limity a proveditelnost důvěryhodného push odesílání a plánování pro E8. Nezapínej placený tarif. Pokud je potřeba konfigurace účtu, dokonči nejdřív lokálně ověřitelnou práci a napiš přesný postup. Splň kritéria E3 a aktualizuj PLAN.md, PROJECT.md a při změně architektury i další zadání v PROMPTS.md.
```

## E4
```text
Přejmenuj tento chat na „E4 – Čekárna a správa hry“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a stav implementace. Proveď E4: založení, nastavení, čekárnu, role, připravenost, více zástupců a bezpečný obnovovací kód vedoucího. Přezdívka není autentizace; zajisti automatický návrat stejné identity a schválené obnovení na jiném zařízení. Žádná náhodná automatická správa. Otestuj souběžný start a neoprávněné operace podle kritérií E4. Aktualizuj PLAN.md a PROJECT.md včetně předání pro E5.
```

## E5
```text
Přejmenuj tento chat na „E5 – GPS, mapa a odhalování“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a současný kód. Proveď E5: jeden GPS proud, mapu lovců, přehled uprchlíka a bezpečné společné odhalování. Udržuj poslední stopy, skutečný čas měření a potvrzené doručení; jasně řeš nepřesnost, staré body, offline a zamítnuté GPS. Dodrž volby jmen a výchozí vypnutí náhledu „co o mně vidí lovci“. Splň kritéria E5, odděl simulované od fyzických GPS testů a aktualizuj PLAN.md a PROJECT.md s předáním pro E6.
```

## E6
```text
Přejmenuj tento chat na „E6 – Chycení, konec a návrat“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a kód. Proveď E6: potvrzované chycení, opravu omylu, výsledky, všechny způsoby konce a další kolo bez mazání předchozího. Po návratu z uspání nebo offline načti správný autoritativní stav; otestuj duplicity a souběhy i odchod organizátora. Neotevírej ukončenou hru omylem opravou chycení. Splň kritéria E6 a aktualizuj PLAN.md a PROJECT.md včetně ručního scénáře a předání pro E7.
```

## E7
```text
Přejmenuj tento chat na „E7 – PWA a kapesní režim“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a kód. Proveď E7: instalovatelnou PWA, správné aktualizace a cache, kapesní zámek dotyků s podržením a potvrzením a Screen Wake Lock se sledováním ztráty. Neslibuj GPS při systémovém zamčení. Připrav bezpečný HTTPS test na telefonech a otestuj návrat, offline a reload podle plánu. Pokud nemáš fyzická zařízení, připrav přesný test pro uživatele a nech tato kritéria čekat na ověření. Aktualizuj PLAN.md a PROJECT.md s předáním pro E8.
```

## E8
```text
Přejmenuj tento chat na „E8 – Push a organizační zprávy“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a rozhodnutí z E3. Proveď E8: skutečné Web Push přes důvěryhodnou bezplatnou serverovou službu, automatické připomínky a uložené zprávy vedoucích s bodem srazu a potvrzením přečtení. Zajisti oprávnění, deduplikaci, expiraci a zastavení připomínek po konci; žádné odesílací tajemství v klientu. Ověř push i bez otevřené aplikace organizátora. Toast není push. Pokud nasazení nebo fyzický test chybí, napiš konkrétní zbývající kroky a neoznač celou etapu hotovou. Aktualizuj PLAN.md a PROJECT.md s předáním pro E9.
```

## E9
```text
Přejmenuj tento chat na „E9 – Trasy a historie“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a kód. Proveď E9: soukromé dávkované ukládání tras ze stejného GPS proudu, výsledky a archiv pro organizátora, filtr více hráčů a přehrávání podle společného času. Respektuj mezery, role a oprávnění; soupeř během hry nesmí číst trasu. Navrhni konkrétní uchování dat a úklid v bezplatných limitech; neodsouhlasené hodnoty označ jako návrh. Nepřidávej vyskakovací souhlas před každým startem. Otestuj kritéria E9 a změř objem bodů a přenosů. Aktualizuj PLAN.md a PROJECT.md s předáním pro E10.
```

## E10
```text
Přejmenuj tento chat na „E10 – Hranice, nákaza a více her“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a kód. Proveď E10: připojovací kódy/odkazy a QR pro více izolovaných her, režim nákaza s bezpečnou změnou role a opravou a polygon hranic s orientačním varováním bez penalizací. Schovku neimplementuj. Otestuj tři souběžné hry, oprávnění při změně role a GPS šum u hranice podle kritérií. Aktualizuj PLAN.md a PROJECT.md; doporučené další chaty jsou V1 a O1.
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
Přejmenuj tento chat na „E11 – Nasazení a terénní ověření“, pokud to jde. Přečti AGENTS.md, PROJECT.md, PLAN.md a skutečný stav všech etap. Proveď E11: ověř bezplatnou konfiguraci a bezpečné nasazení přes HTTPS, databázová pravidla, push službu a scheduler, dokumentaci pro vedoucí a rollback. Připrav úplný test dvou telefonů a tří izolovaných her podle plánu; nepředstírej provedené fyzické kroky. Oprav nalezené chyby v rozsahu ověření, zaznamenej výsledky a zbývající omezení pro skupinový playtest. Nezapínej placené tarify. Aktualizuj PLAN.md a PROJECT.md včetně konečného návodu a seznamu skutečně neověřených bodů.
```
