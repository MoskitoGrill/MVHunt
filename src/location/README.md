# E5 – GPS, mapa a společné stopy

## Implementovaný kontrakt

`stream.ts` vlastní jediný `watchPosition` pro čekárnu, připravenost i hru. Spouští se výslovným tlačítkem, po reloadu znovu tlačítkem; poslední odběratel watch uklidí. „Zapnout / obnovit GPS“ umožní nový pokus po změně oprávnění v prohlížeči. Čas měření je původní `GeolocationPosition.timestamp`, nikoli čas callbacku nebo odhalení. GPS a hodiny telefonu lze podvrhnout; nejsou důkaz fyzické přítomnosti.

`data/useHuntSync.ts` odděluje synchronizaci od UI a mapy. Uchovává nejvýše 120 měření / 60 sekund pouze v paměti. Uprchlík odešle pro splatný termín nejnovější dostupné měření **před termínem**, které splňuje zvolenou politiku. Doručení přiděluje RTDB `serverTimestamp`; úspěch UI hlásí až po splnění zápisu. Body po termínu nemohou doplnit minulou stopu. Trasy ani trvalá offline fronta zatím nejsou implementované (E9).

GPS politika zůstává povinnou výslovnou volbou vedoucího pro testovací hru. **Doporučení k terénnímu ověření, ne schválený produkční default:** maxAgeMs=30000, lateArrivalMs=10000. Stáří se posuzuje proti termínu, pozdní okno proti serverovému přijetí. Důvod: krátký tolerovaný výpadek bez libovolné rekonstrukce minulosti. První potvrzený bod je neměnný a čitelný od termínu; pozdní první bod nejdéle do konce zvoleného okna včetně hranice. Po konci hry zápis není dovolen. Třísekundový synchronizační cyklus není garance odeslání přesně v termínu; nulové/velmi krátké okno může znamenat vynechanou stopu. Hodnoty bez fyzického měření nelze uzavřít jako terénně ověřené.

E5 používá `games/{gameId}/slots/{at}/{playerId}`. Zápis pravidla povolí jen aktuálnímu UID vlastnícímu stabilní playerId s týmem uprchlíka. Převod telefonu tak nemění klíč historie a staré UID ztrácí oprávnění. Legacy hry bez lobbyVersion zachovávají UID kontrakt pro E3 regresní testy; E5 zakládat jako nové hry přes E4 API. Staré UID sloty případné rozpracované E4 hry nejsou automaticky migrovány. Nic se nemaže.

`allies/{playerId}` obsahuje poslední polohu lovce s measuredAt/receivedAt, přepisuje jen její aktuální vlastník z týmu lovců, čtou pouze lovci ve stejné hře. Starší měření nelze přepsat přes novější. Klient odesílá přibližně nejvýše jednou za 5 sekund (cyklus 3 s), jen nové přiměřeně staré měření. Uprchlíci touto větví nemohou zveřejňovat svou průběžnou polohu. Pravidla přijmou nejvýše 60 s starý bod; klient respektuje také přísnější nastavení hry.

Čtenář načítá konkrétní splatné sloty od nejnovějšího a obnoví poslední dostupnou stopu i po reloadu/uspání. Nečte kořen hry, soukromé body ani budoucí sloty. Prázdný slot pravidla odmítají; v pozdním okně se čtení opakuje, po něm se absence v daném připojení uzavře. Síťová chyba není interpretována jako vynechání. Reconnect čtení obnoví. Zmeškaný slot nikdy nemaže předchozí stopu; UI zobrazuje původní měření, serverové doručení, termín, rostoucí stáří a přesnost. Žádná perzistentní cache souřadnic v localStorage/service workeru.

GPS denied/timeout/unavailable jsou oddělené od připojení RTDB. Nepřesnost nad 100 m vyvolá informační varování; není to nové pravidlo vyřazení bodu. Kruhy mapy vyjadřují hlášenou přesnost, nikoli zaručené místo. GPS selhání zachová čas posledního měření. Offline se neposílají nové body; rozpracovaný SDK zápis není potvrzením, po připojení jej musí znovu přijmout pravidla v původním okně. Načtené stopy zůstávají v paměti. Bez dlaždic zůstává textový seznam souřadnic. Lovec má mapu, uprchlík přehled s volitelnou mapou a výchozím vypnutým vlastním náhledem. Skrytí popisků je místní volba zobrazení, není anonymizací dat.

## Mapa

Leaflet 1.9.4, standardní HTTPS dlaždice OSM, viditelná atribuce. Ověřeno 25. 10. 2026 podle [oficiální Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/): běžné interaktivní prohlížení, browser Referer a běžná HTTP cache; žádné hromadné stahování, prefetch měst ani offline balíky. Služba nemá garanci dostupnosti a není bezlimitní hosting. Není zapnutý placený tarif. Před veřejným provozem doplnit veřejný kontakt provozovatele a znovu posoudit provoz/poskytovatele. Mapa ukazuje syntetické souřadnice pouze při testech; reálná data ani cizí Firebase nebyly použity.

## Spuštění a ověření

Na tomto PC tři PowerShelly: `.\mvhunt.cmd emulators`, `.\mvhunt.cmd server`, `.\mvhunt.cmd web`; otevřít localhost:5173. Obecně `pnpm emulators`, `LOBBY_EMULATORS=true pnpm lobby:server` (v PowerShellu nastavit `$env:LOBBY_EMULATORS='true'`), `pnpm dev`. Demo konfigurace viz README a `.env.example`. Produkce: vlastní Spark projekt, anonymní Auth, nasazené aktualizované rules, vlastní HTTPS frontend/API a správný origin podle server/README.md. Žádné serverové klíče do VITE.

Kontroly: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; Java 21+ a `pnpm test:rules:isolated`. Oddělená konfigurace firebase.test.json používá porty DB 9001, Auth 9100, hub 4402, logging 4502. **Testy mažou syntetickou testovací DB na těchto portech.** Nepřipojovat k ní ručně rozehranou hru. Běžné emulátory na 9000/9099 nechávají nedotčené. `pnpm test:rules` stále používá základní porty, které musí být volné.

Automatické testy E5 používají syntetické callbacky GPS a dva autentizované klienty skutečného RTDB emulátoru. Ověřují jeden watch/úklid, denied/timeout/missing GPS, pozdní callback, stáří a časovou hranici, neměnnost, stabilní stopu po převodu UID, nahrazení novým slotem, soukromí/izolaci a oprávnění spoluhráčů. Dřívější E2/E3 testy ověřují předčasné čtení, přesný termín, pozdní okno, souběhy, hodiny a odpojení. Nejde o fyzickou GPS.

## Ruční scénář pro dva fyzické telefony – NEPROVEDENO

1. Vlastní nakonfigurovaný HTTPS frontend/API a nasazená pravidla. LAN HTTP není test mobilní GPS; lokální emulátory mají loopback adresy, telefon k nim není tímto návodem připojen. Zapsat model, OS, verzi prohlížeče, origin, nikoli reálné trasy.
2. Lovec založí testovací hru, uprchlík požádá o vstup a je schválen. Výslovně zvolit např. předstih 60 s, interval 30 s, lov 5 min, GPS okna 30/10 s. Oba zapnou GPS, vyčkají na měření a znovu potvrdí připravenost; vedoucí potvrdí společný start.
3. Před prvním termínem lovec nevidí průběžnou polohu uprchlíka. Odhalení ukáže správný bod/čas/přesnost, další termín novější. Uprchlík má náhled vypnutý; zapnout jen v nastavení, zkontrolovat vlastní zveřejněnou stopu.
4. Uprchlík vypne síť přes jedno odhalení a vrátí se až po pozdním okně. Lovci zůstane předchozí stopa s rostoucím stářím a informací o vynechání. Zkontrolovat odlišení posledního potvrzení od nového nepotvrzeného měření. Krátký výpadek uvnitř okna smí doplnit jen původní měření před termínem.
5. Zamítnout GPS v prohlížeči, ověřit čitelný stav bez pádu mapy a nezávislost od sítě. Oprávnění změnit ručně, stisknout obnovit GPS. V horších podmínkách ověřit kruh a varování přesnosti, žádný nový falešný čas. Ostatní body mohou dorazit před vlastní GPS.
6. Lovec uspí telefon přes dvě odhalení, vrátí se/reloaduje a porovná poslední stopu. Pomocí E4 schváleného převodu změnit telefon uprchlíka; stará stopa zůstane pod stejným playerId, další ji nahradí, starý telefon nesmí psát. Zaznamenat skutečné výsledky zvlášť pro každý telefon.

Fyzická GPS, uspání OS, background chování a baterie zůstávají neověřené. Wake Lock/PWA až E7. Chycení a autoritativní konec/úklid GPS jsou od E6 lokálně implementovány; aktuální scénář doplňuje server/ROUND.md. Bez dostupných zařízení E5/E6 zůstávají ČEKÁ NA OVĚŘENÍ.

## Doplnění 25. 10. 2026 – fyzický Android přes USB (postup zatím neověřen na zařízeních)

Veřejné HTTPS není jediná cesta pro lokální vývojový test. Chrome podporuje USB port forwarding a localhost je pro GPS důvěryhodný kontext. Ověřeno v oficiální dokumentaci: https://developer.chrome.com/docs/devtools/remote-debugging/local-server a https://developer.chrome.com/blog/geolocation-on-secure-contexts-only . Tím se zpřesňuje výše uvedený požadavek externí konfigurace: pro tento omezený test Androidu není nutná; pro samostatnou hru bez kabelu dosavadní externí konfigurace stále chybí.

1. Na PC spustit .\mvhunt.cmd emulators, server a web ve třech terminálech, případně ponechat už běžící procesy. Používat localhost:5173.
2. Na obou Androidech ručně zapnout vývojářské možnosti a Ladění USB, připojit datovými USB kabely a na telefonech ručně povolit ladění z vlastního PC. Otevřít mobilní Chrome.
3. V Chrome na PC otevřít chrome://inspect/#devices, zapnout Discover USB devices. Oba telefony se musí zobrazit. V Port forwarding nastavit 5173 → localhost:5173, 9000 → localhost:9000 a 9099 → localhost:9099, zapnout Enable port forwarding. Port 8787 není třeba: API obslouží Vite proxy na PC. Žádné porty emulátorů nevystavovat veřejné síti.
4. Na každém telefonu otevřít http://localhost:5173, připojit vlastní Firebase (zde výslovně demo emulátor), vytvořit/schválit hru a ručně povolit GPS. Použít ruční scénář výše s okny 30/10 s a intervaly 30 s. Oba telefony musí zůstat připojené pro dostupnost lokálních služeb; není to samostatný terénní provoz ani test produkčního backendu.
5. Offline v této konfiguraci vyvolá odpojení USB konkrétního telefonu přes pozdní okno, pak připojení a ověření přesměrování. Vypnutí Wi-Fi/dat samotné nemusí přerušit spojení vedené USB. Na rozdíl od GPS to netestuje mobilní datovou síť.
6. Po testu ručně vypnout Ladění USB/port forwarding podle potřeby. Zapsat modely, Android/Chrome verze a skutečný výsledek; zatím NEPROVEDENO. iPhone tímto postupem netestovat.
