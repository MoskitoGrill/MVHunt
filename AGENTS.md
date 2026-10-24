# MVHunt – pokyny pro všechny navazující chaty

## Než začneš
- Komunikuj česky. Pracuješ v existující složce MVHunt; nevytvářej další vnořený projekt MVHunt.
- Přečti `PROJECT.md`, `PLAN.md` a poslední předání v `PROJECT.md`. Potom prohlédni skutečný kód a dostupné příkazy. Dokumentace není důkaz, že implementace funguje.
- Uživatelské zadání určuje aktuální etapu. Dokonči ji včetně ověření a předání; nepouštěj se automaticky do dalších etap.
- Pokud je nástroj na přejmenování aktuálního chatu dostupný, nastav název uvedený v zadání, např. `E1 – Základ projektu`. Jinak doporuč stejný název uživateli. Nevytvářej další chaty ani subagenty bez jeho žádosti.

## Práce na projektu
- Zachovej bezplatnou cestu pro malý klub a 2–3 souběžné hry. Bez souhlasu nezapínej placený tarif, fakturaci ani placené doplňky. Před výběrem služeb ověř aktuální podmínky a limity z oficiálních zdrojů.
- Výchozí návrh: TypeScript, Vite, React, Leaflet, Firebase Authentication (anonymně) a Realtime Database. V E1/E3 se musí ověřit vhodnost; dokumentované zdůvodněné změny jsou možné. Neslibuj bezpečné časované odhalení jen schováním dat ve frontendu.
- Existující web je pouze reference. Nepoužívej jeho Firebase projekt, konfiguraci ani databázi. Nevytvářej účty a neposílej skutečné polohy do cizí infrastruktury.
- Klient nesmí obsahovat serverové tajné klíče, obnovovací kódy v otevřené čitelné podobě pro ostatní hráče ani klíče pro odesílání push. Firebase veřejná konfigurace není serverový tajný klíč; ochranu dat zajišťují autentizace a pravidla.
- Odděl herní pravidla, synchronizaci, GPS, mapu, push a UI. Čas musí být testovatelný přes předávané hodiny. Používej strojové časové značky; lokalizovaný text patří jen do UI.
- Žádná skutečná funkce nesmí být deklarována hotová jen na základě makety nebo simulace. Rozlišuj emulátor, prohlížeč a fyzický telefon.
- Nevyráběj finální design v herních etapách. Zachovej použitelné základní UI, přístupné popisky a velká důležitá tlačítka. Vzhled patří V1, měřená optimalizace O1.
- Testuj významné chování: pravidla hry, oprávnění, časové hranice, ztrátu spojení, návrat do hry a migrace. Nepřidávej testy pouze kopírující implementaci.
- Neobcházej omezení iOS pomocí falešných kliknutí, nekonečného audia nebo videa. Wake Lock je best effort, nikoli garance GPS při systémovém zamčení.
- Při chybě konfigurace ukaž konkrétní stav; nepřepínej potichu skutečnou hru do demonstračních dat.
- Změny nutné pro aktuální etapu proveď autonomně. Podstatnou odchylku od odsouhlasených pravidel zapiš jako návrh s důvodem; neprezentuj ji jako schválenou.

## Povinné předání
- Aktualizuj stav etapy v `PLAN.md` a aktuální stav v `PROJECT.md`.
- Do deníku `PROJECT.md` připiš datum, etapu, změny, důležitá rozhodnutí, změny dat/pravidel, spuštěné kontroly a skutečné výsledky, známé chyby, návrhy odchylek a přesný další krok.
- Zapiš příkazy pro spuštění, konfiguraci služeb a ruční test na telefonu. Nikdy nezapisuj tajemství ani reálné trasy účastníků do dokumentace/Gitu.
- Etapu označ `HOTOVO` jen při splnění všech jejích kritérií. Pokud zbývá fyzický telefon nebo externí konfigurace, použij `ČEKÁ NA OVĚŘENÍ` / `BLOKOVÁNO` a napiš přesně co chybí. Neoznač neprovedený test za úspěšný.
- Pokud se změnila návaznost, aktualizuj i `PROMPTS.md`, aby další chat nedostal zastaralé instrukce.
- Na konci stručně sděl co funguje, jak to ověřit, co zbývá a kterou etapu lze zahájit.
