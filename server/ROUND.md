# E6 – klasické kolo, kontrakt a ověření

Stav 26. 10. 2026: lokální implementace a emulátor/prohlížeč ověřeny; fyzické uspání telefonů a externí provoz čekají. Nákaza patří do E10.

## Pravidla

- Uprchlík potvrzuje vlastní chycení v modálním dialogu, až od vypuštění lovců. Čas je čas přijetí důvěryhodným API, nikoli tvrzený čas offline kliknutí. Vedoucí/zástupce může potvrdit i opravit konkrétního uprchlíka přes API; UI nabízí vlastní chycení a vedoucím opravy všech.
- Během hry může vlastní chycení opravit hráč, vedoucí nebo zástupce; bez dalšího časového okna. Po konci smí opravit jen vedoucí/zástupce. Oprava po konci mění výsledek, nikdy konec, čas, důvod ani stav kola. Po konci nelze zaznamenat nové chycení. Oprava musí uvést ID právě opravovaného chycení, takže opožděná oprava neopraví novější chycení.
- Konec nastane chycením všech uprchlíků, limitem nebo potvrzením vedoucího. Jedna Admin transakce serializuje chycení/opravu/konec. Na přesné hranici limitu má přednost časový konec; při souběhu před limitem vyhraje první potvrzená transakce. Konec je nevratný.
- Limit = startedAt + headStartMs + huntDurationMs. Nezávisí na heartbeat ani přítomnosti organizátora. Rules a klient jej respektují i bez scheduleru. Uložený round.endedAt pro časový konec se materializuje při příštím sync-round či jiné úspěšné operaci; má původní čas limitu, ne čas probuzení. Bez klientů neběží periodický serverový zapisovač. Toto není push scheduler E8.
- Chycení zastaví jediný GPS watch a polohové zápisy. Oprava před koncem obnoví možnost GPS (po reloadu je nadále třeba výslovné zapnutí); po konci se watch neobnoví. Konec odpojí odběr allies a periodické čtení stop; návrat/reconnect ještě jednorázově načte dostupné staré stopy. Metadata/výsledky zůstávají odebírané pro opravy a návrat. Serverové rules odmítají i polohový zápis, který offline SDK fronta odešle až po chycení/konci.
- Další kolo je nová hra s novým gameId/playerId, převzatým nastavením a nově schvalovaným vstupem hráčů. Stará hra se nemaže. Původní ID si zapsat pro návrat k výsledkům; archiv s výběrem her je E9, krátké kódy E10.

## Data, oprávnění, opakování

Volitelná aditivní větev games/{gameId}/round, schemaVersion=1 a lobbyVersion=2 zachovány. Starší E4/E5 hra bez round je běžící podle svého startu/limitu; první akce větev založí. Legacy E3 bez lobbyVersion API nepřijímá. Nic se nemaže ani automaticky nepřepisuje do jiného schématu.

- captures/{playerId}: at, uid, operationId, případně correctedAt a correctedBy. Nové chycení po opravě nahradí aktuální záznam; předchozí akce zůstávají v operations.
- endedAt, reason: time-limit / all-captured / manager. Konec se po prvním zápisu nemění.
- operations/{operationId}: uid, action, target, at, případně captureId. Nejvýše 2000 různých akcí kola (technický strop, nikoli měřená kapacita). Opakování téhož ID nemění výsledek; kolize s jiným aktérem/typem/cílem/opravovaným chycením se odmítne. Stávající API limit 30 požadavků/UID/min platí i pro opakování.

POST /api/lobby/capture, correct-capture, end-round vyžadují Firebase ID token, gameId, operationId. Pro chycení/opravu lze uvést playerId, jinak vlastní; oprava navíc captureId. sync-round vyžaduje pouze členství a gameId. Klienti nemohou round zapisovat přímo; číst smí pouze členové dané hry. Soukromé větve/recovery zůstávají uzavřené. Nové členy nelze schválit do ukončené hry; schválený převod existující postavy zachovává playerId i výsledek.

Frontend nefrontuje offline kliknutí automaticky. Neúspěšný/timeout požadavek zůstane jako nejistý v sessionStorage pod gameId a UID; ruční opakování i po reloadu použije stejné operationId. Výsledek se označí potvrzený až po HTTP úspěchu, herní stav přichází z DB. Odmítnutou nejistou akci lze zavřít a posoudit aktuální stav. Bez připojené DB nelze novou akci odeslat. Zavřený tab nemusí sessionStorage uchovat; autoritativní stav je nadále v DB. Opožděné odpovědi a odběry předchozí hry nesmějí měnit aktuální hru.

## Spuštění a kontroly

Na tomto PC tři PowerShelly: `.\mvhunt.cmd emulators`, `.\mvhunt.cmd server`, `.\mvhunt.cmd web`, poté localhost:5173. Obecně `pnpm emulators`, `$env:LOBBY_EMULATORS='true'; pnpm lobby:server`, `pnpm dev`. Konfigurace služeb a veřejné demo hodnoty: kořenový README a server/README.md. Pro externí provoz vlastní Spark/Auth/RTDB s aktualizovanými rules, vlastní HTTPS API/frontend a serverové ADC; nic tajného do VITE/Gitu. Hosting API dosud nevybrán/nenasazen.

Kontroly: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Po změně generátoru: `node scripts/generate-rules.mjs`. Java 21+ v PATH a `pnpm test:rules:isolated` spouští skutečné Auth/RTDB emulátory na 9100/9001; tato suite maže pouze syntetickou testovací DB. Nespouštět souběžně s UI na stejných testovacích portech.

Izolovaný UI scénář při obsazených výchozích portech: `pnpm exec firebase emulators:start --config firebase.test.json --project demo-mvhunt --only database,auth`; API s LOBBY_EMULATORS=true, FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9001, FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9100, PORT=8791, LOBBY_ORIGIN=http://localhost:5182. Vite s veřejnými demo hodnotami, VITE_AUTH_EMULATOR_PORT=9100, VITE_DATABASE_EMULATOR_PORT=9001, VITE_LOBBY_API_URL=/api/lobby, MVHUNT_LOBBY_PROXY=http://127.0.0.1:8791, `pnpm dev --port 5182 --strictPort`. Po připojení lze s vlastním syntetickým UID spustit `node scripts/e6-ui-fixture.mjs UID` (vyžaduje DB emulator env přesně 127.0.0.1:9001). Přepíše pouze pojmenovanou testovací hru e6-ui-synthetic, bez souřadnic/kódu. Fixture není důkaz oprávnění; ta ověřují integrační testy.

## Dva fyzické telefony – NEPROVEDENO

Použít vlastní HTTPS služby nebo Android/Chrome USB forwarding dle src/location/README.md. Na telefonech ručně povolit GPS, bez ukládání skutečných tras do dokumentace. Zapsat datum, modely, OS/Chrome, origin, provedené kroky a skutečné výsledky.

1. Vedoucí jako lovec a uprchlík založí/schválí testovací hru; předstih 30 s, interval 15 s, délka lovu 3 min, výslovně potvrzená testovací GPS okna. Zapnout GPS/připravenost a potvrdit start.
2. Lovec uspí telefon přes alespoň dvě odhalení, uprchlík ponechá aplikaci otevřenou. Po návratu porovnat nejnovější stopu, skutečné stáří a společný odpočet. Reload nesmí resetovat čas. Systémové uspání neznamená garantovanou GPS.
3. Uprchlík otevře chycení a zruší dialog: nic se nezmění. Znovu otevře a potvrdí (také rychlé dvojkliknutí); právě jeden čas, zastavená GPS, žádná další poloha. Vedoucí/hráč opraví během hry; GPS lze obnovit, role zůstává uprchlík.
4. Výpadek sítě před kliknutím: ovládání po rozpoznání offline zakázané. Výpadek během požadavku: žádné falešné potvrzení, reload zachová nejistou akci v témže tabu, opakování po reconnectu má stejné ID a jeden výsledek. Při USB odpojit kabel, samotná Wi-Fi není průkazná.
5. Potvrdit chycení současně s koncem vedoucím. Všichni musí po reconnectu vidět stejný důvod/čas konce; oprava vedoucím po konci mění jen výsledek, GPS zůstane zastavená. Hráč bez správy po konci opravit nemůže.
6. V samostatném kole zavřít telefon vedoucího před limitem; druhý telefon přes limit uspat/odpojit a vrátit. Konec musí mít původní čas limitu, žádné nové chycení na hranici ani po ní. Opakovat konec chycením posledního uprchlíka.
7. Založit další kolo tlačítkem ve správě, znovu schválit hráče. Otevřít původní ID a ověřit staré výsledky, potom nové ID: čekárna, bez starého chycení/stop. Opožděná stará akce nesmí změnit nové kolo.

Fyzické výsledky zatím chybí; automatická offline/reconnect kontrola, testovací hodiny a desktopový reload nenahrazují uspání OS, mobilní síť ani fyzickou GPS.

## Předání E7

Navázat PWA, cache a kapesní režim na současný úklid streamu a obnovu při focus/visibilitychange. Nekachovat herní API/RTDB/tokeny, neobnovovat offline akce s novými ID, neotvírat skončené kolo. Wake Lock pouze best effort. Doplnit fyzický scénář výše; E3–E6 nesmějí být automaticky prohlášeny za HOTOVO. Externí bezplatné API, GPS politika, retence a transakce celého stromu zůstávají známé limity E4/E5/E9.
