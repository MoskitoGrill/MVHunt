# Kontrakt pravidel E2

Model pracuje s Unix ms a předaným `Clock`; nepoužívá Date.now, intervalové čítače, GPS ani síť. `createGame` přijímá stabilní ID od volajícího, kopíruje nastavení. Online ID přidělí E3/E4; konstantní ID simulace není generátor ID skutečných her. `schemaVersion: 1`, `settings`, `startedAt` a `gameId` lze serializovat do JSON. Obnova nemění počátek intervalů. Nedůvěryhodná data backendu musí E3 validovat před voláním modelu; TypeScript typ není runtime validátor databáze.

## Časové hranice

- Čekárna má startedAt=null. Potvrzený start je neměnný. Technický stav `scheduled` znamená, že předané hodiny ještě nedosáhly potvrzeného startu (například kvůli odchylce klienta); není další herní fáze.
- Předstih je [start, release), lov [release, end), ukončeno [end, ∞). Délka lovu se počítá od release.
- V čase startu se nikdy neodhaluje. Při předstihu 0 je vypuštění současně se startem, první odhalení až po intervalu lovu. Toto řeší střet zákazu odhalení v 0 a povinného odhalení při vypuštění ve prospěch zákazu v 0.
- Při kladném předstihu nastane odhalení při vypuštění vždy, i při vypnutém či delším intervalu předstihu. Překryv vytvoří jedno odhalení. Vypuštění a odhalení jsou různé druhy událostí.
- Přesně na časovém konci se již neodhaluje. Ani krátký lov nemá odhalení po konci. Po konci zůstává poslední termín pro historii, nextReveal=null.
- Události jsou seřazené: start, vypuštění, odhalení, konec při shodném čase. ID je gameId:kind:UnixMs. `eventsSince` používá (after, now], při návratu vrátí i zmeškané termíny. Jde o výpočet, nikoli potvrzení jejich zpracování backendem.
- Technické limity: předstih 0–24 h, lov 1 ms–24 h, intervaly 1 s–24 h, celé konečné bezpečné číselné ms. Interval delší než fáze je platný. Limity chrání tvorbu konečného rozvrhu (nejvýše cca 172 800 slotů), nejsou měřeným kapacitním slibem. Provozní intervaly/kapacitu ověří E3/O1.

## Souběh pro E3

`startGame` lokálně zachovává první start, ale neřeší závod dvou klientů. Důvěryhodná transakce musí atomicky potvrdit jeden start a zmrazit nastavení. Vypuštění a časový konec se odvozují z uloženého startu bez přítomnosti organizátora. Vedlejší efekty musí deduplikovat podle ID události; zmeškané odhalení nesmí zpětně získat novou polohu. Model nemá oprávnění, chycení ani ruční ukončení (E6).

## Návrh GPS slotu – hodnoty dosud neschválené

`reveal.ts` je čistý predikát kandidáta, nikoli bezpečnostní služba či publikace. Slot odkazuje na konkrétní reveal ID a hru, kandidát navíc na stabilní playerId, measuredAt, receivedAt a měření s přesností. ReceivedAt přidělí důvěryhodná služba; measuredAt je tvrzení zařízení a samo nedokazuje skutečnou GPS ani pravdivé hodiny.

Návrh k rozhodnutí E3/E5: maxAgeMs=30 000, lateArrivalMs=10 000. Důvod: omezení zastaralých stop a krátká tolerance síťového doručení; jde o hypotézu bez terénního měření. Žádný produkční default se nezavádí, politika musí být předána explicitně. Přijmout měření v [slot−maxAge, slot] a doručení nejpozději slot+lateArrival včetně, nikdy přijetí před měřením. Pozdější měření nepatří do minulého slotu. Souřadnice musí být konečné v rozsahu, přesnost nezáporná. Původní measuredAt se nepřepisuje časem slotu; bez vhodného bodu jde o chybějící stopu, ne čerstvou GPS.

E3 musí ověřit proveditelnost politiky: soukromé kandidáty před termínem, nečitelnost budoucích bodů, důvěryhodný čas přijetí, první neměnný potvrzený zápis hráč/slot nebo atomická finalizace nejpozději na konci okna. Volbu publikace v termínu versus čekání na uzavření okna je nutné uzavřít podle možností backendu. Predikát sám neřeší výběr z více bodů, přepis, útočníka, role ani oprávnění; nesmí být použit jako náhrada rules. Po uzavření žádné doplnění/přepis historického odhalení; pozdní body případně jen do soukromé trasy (E9). Změny politiky nesmí zpětně měnit existující sloty. E5 musí ověřit hodnoty na telefonu a vyřešit převod času zařízení.
