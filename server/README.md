# Důvěryhodné API čekárny E4

Od E6 stejné API obsluhuje atomické chycení, opravu, výsledky a konec klasického kola. Aktuální kontrakt, příkazy a ruční scénář v [ROUND.md](ROUND.md). Průběžné polohy už zajišťuje E5; níže uvedená jednorázová připravenost je historický E4 scénář.

`lobby.mjs` provádí správu v Admin RTDB transakcích. `index.mjs` ověřuje Firebase ID token (včetně odvolání) a UID bere pouze z tokenu, podle [oficiálního postupu Firebase](https://firebase.google.com/docs/auth/admin/verify-id-tokens). Klientské UID v JSON nemá vliv. Admin SDK ani přihlašovací údaje nejsou importovány do frontendu.

## Lokální spuštění

Tři PowerShell terminály v kořeni projektu (Java 21+ a pnpm dle hlavního README):

```powershell
pnpm emulators
```

```powershell
$env:LOBBY_EMULATORS='true'
pnpm lobby:server
```

```powershell
pnpm dev --port 5173 --strictPort
```

Frontend `.env.local`: stejné veřejné `demo-mvhunt` hodnoty jako v hlavním README a `VITE_USE_EMULATORS=true`. `VITE_LOBBY_API_URL` ponechte prázdné; Vite posílá `/api/lobby` na loopback 8787. V prohlížeči používejte **http://localhost:5173**, nikoli jiný origin (CORS). Backend ani emulátory nevystavujte síti. Používají syntetická data; po restartu emulátoru bez exportu zmizí.

Testy: `pnpm test:rules` spouští Auth/RTDB a oba soubory integračních testů; vyžaduje volné porty. Při již spuštěných emulátorech místo toho `pnpm exec vitest run --config vitest.rules.config.ts`. Není třeba Firebase účet, služební klíč ani placený tarif.

## Kontrakt a bezpečnost

- `POST /api/lobby/{create,request,approve,reject,role,settings,ready,start,rotate,recover}`; Authorization Bearer Firebase ID token; JSON nejvýše 8 KiB; odpovědi `no-store`. Chyba není potvrzená operace. Timeout může znamenat, že server již zápis provedl: nejdříve načíst stav, neopakovat slepě založení/rotaci.
- `lobbyVersion=2`, stávající `schemaVersion=1` pro herní nastavení a čas. Nová členství obsahují `playerId` (stabilní UUID), `nickname`, správní `role`, herní `team`. Host i zástupci mohou hrát za libovolný tým. Pořadí zástupců se nepoužívá: všichni jmenovaní mají stejné právo správy/startu/schvalování; pouze host jmenuje/odvolává zástupce a spravuje kód. Odpojení nikoho automaticky nepovyšuje.
- Žádosti jsou pod `requests/{novéUID}`; vidí je vedoucí a daný žadatel. Členové vidí seznam členů, nikdy celý kořen hry. Vstup je schvalovaný také před startem; po startu je nový vstup i obnova stále možná pouze schválením vedoucího. Stejná přezdívka znamená dvě různé postavy.
- Převod obyčejného hráče uvádí **původní UID** v `target`; vedoucí ověří člověka osobně. Schválení atomicky odstraní staré členství a vytvoří nové se stejným `playerId`, týmem a přezdívkou. Připravenost se ruší. Starý klient ztrácí všechna serverová práva; již dříve stažená data nelze vzdáleně vymazat. Převod správce tímto tokem je zamítnut; host používá kód, zástupce lze přijmout jako nového a host jej znovu jmenuje.
- Kód má 256 bitů kryptografické náhody, není připojovací ID. Vrací se jen při vytvoření/rotaci a UI jej drží pouze v paměti do skrytí/reloadu. RTDB `recovery` čte jen důvěryhodný server a ukládá SHA-256 digest, nikoli kód. Rotace zneplatní starý kód, odvolání jej vypne. Úspěšné použití přenese postavu a správu hosta na nové UID, odvolá staré UID a kód spotřebuje. Zástupci zůstávají. Nový host výslovně vydá nový kód. Ztracený kód se neukazuje znovu.
- Chybné kódy se počítají atomicky pro celou hru; pět chyb uzamkne obnovu na pět minut i při změně UID/restartu API. Host může rotací blokaci zrušit. Každé UID má persistentní limit 30 API požadavků/min; nejvýše 50 nevyřízených žádostí a 30 členů/hru. Jde o technické stropy, nikoli měřenou kapacitu. Útočník může blokaci obnovy úmyslně vyvolat; správu mezitím zachovávají existující vedoucí.
- Audit obsahuje serverový čas, aktéra, cíl a druh změny (včetně startu a obnovy), bez kódu či souřadnic. Čtou jej pouze vedoucí. Přímé klientské zápisy správy v E4 a přímé založení libovolné hry jsou zakázané pravidly; přítomnost a GPS mají vlastní omezené větve.
- Připravenost ověřuje přijatý čas čerstvého jednorázového GPS měření; UI neposílá souřadnice. Přítomnost má serverový timestamp, heartbeat po 10 s a `onDisconnect`. Start vyžaduje oba týmy, připravenost/GPS/přítomnost nejvýše 30 s staré a online=true u všech členů. Je to krátká technická kontrola, nikoli důkaz GPS či záruka trvajícího spojení. E5 nahradí jednorázový požadavek společným GPS proudem. Změna nastavení ruší připravenost všech, změna role daného hráče. Start je idempotentní v jedné transakci s právě jedním auditním záznamem.

## Migrace a návaznost E5

Staré lokální E3 hry bez `lobbyVersion` se automaticky nemigrují. Pro čekárnu založte novou hru; staré soukromé body zůstávají pod starým UID. Regresní E3 testy vytvářejí legacy fixtures přes testovací administrátorský kontext, protože veřejné zakládání je uzavřeno. Existující čtení bodů a časová ochrana zůstávají v rules.

E5 musí číst herní tým z `team` (fallback `role` pouze pro legacy). GPS sloty zatím používají UID; po převodu nesmí zmizet starší stopy téže postavy. Doplnit explicitní mapování historie UID → playerId a otestovat obnovu uprchlíka přes odhalení, než se tento tok označí jako dokončený v terénu. E4 nepřenáší soukromou historii mezi zařízeními. Admin transakce nyní zahrnuje celou hru; před velkým objemem tras E9 oddělit řízení od bodů, zachovat atomické oprávnění a změřit contention.

GPS okna odhalení zůstávají návrhem E3/E5. UI vyžaduje výslovný výběr testovacích hodnot před založením/uložením, nezavádí je jako schválenou terénní politiku. Technická platnost připravenosti 30 s je samostatný provizorní parametr E4; E5 jej má posoudit na telefonech.

## Externí provoz – dosud nenakonfigurováno

Tento server je lokálně ověřitelná implementace; **není nasazen a nemá vybraný/ověřený bezplatný veřejný hosting**. Návrh odchylky: vedle RTDB Spark provozovat důvěryhodné API správy. Před výběrem hostingu ověřit aktuální free podmínky a kompatibilitu Node Admin SDK; dosavadní návrh Workers pro E8 není důkaz kompatibility této Node služby. Nezapínat Blaze ani placení. Veřejná produkční čekárna do té doby čeká na externí konfiguraci.

Produkční konfigurace Node služby: `LOBBY_EMULATORS` vypnuté, `GOOGLE_CLOUD_PROJECT`, `LOBBY_DATABASE_URL`, `LOBBY_ORIGIN` s přesným HTTPS originem frontendu (bez podcesty), Admin Application Default Credentials pouze v prostředí serveru. Produkční služba poslouchá na `0.0.0.0` a `PORT` (default 8787), HTTPS ukončuje hostingová reverse proxy; emulátorový režim zůstává na `127.0.0.1`. Frontend dostane veřejné `VITE_LOBBY_API_URL=https://.../api/lobby`, vlastní Firebase konfiguraci a `VITE_USE_EMULATORS=false`. RTDB rules nasadit do stejného vlastního projektu. Žádný klíč do `VITE_*` ani repozitáře.

Příprava 26. 10. 2026: přidán `GET/HEAD /healthz` (liveness procesu, no-store, bez DB/konfigurace), testy obou bind režimů `pnpm test:server` a audit před zveřejněním `pnpm audit:public`. Pro navržený Render Free nastavte Health Check Path `/healthz`. Úplný výsledek kontroly souborů/historie, nález e-mailu v commit metadatech a další kroky: [PUBLICATION-REVIEW.md](../PUBLICATION-REVIEW.md). Render ani vlastní Firebase nejsou nasazené; health 200 nepotvrzuje DB přístup.

Před veřejným provozem doplnit celkový limit vytváření identit/her a edge/IP ochranu: limit UID sám nezastaví útočníka s mnoha účty. Retenci rate záznamů, žádostí, auditů a her uzavřít v E9/E11. Toto není tvrzení o ochraně před plošným DoS nebo neomezené bezplatné kapacitě.

## Ruční průchod (dva profily; potom dva telefony)

1. Profil A připojit, zadat přezdívku, zvolit testovací nastavení/okna a založit hru. Kód soukromě uschovat a skrýt. ID hry předat B.
2. B připojit, vložit ID, stejnou přezdívku a jiný tým, požádat o vstup. A žádost osobně ověří/schválí. B nemůže měnit nastavení; po jmenování zástupcem může. Pro více zástupců zopakovat s C.
3. Po prvním výslovném připojení reload A → automatické připojení, stejné UID a playerId, načtená stejná hra. Kód se znovu neukáže. Zavření A nezmění správu ani zástupce.
4. GPS připravenost na obou, start do 30 s; při staré GPS/offline se start odmítne. Souběžný start A/B zachová jediný čas. GPS souřadnice se v E4 neodesílají.
5. Nový profil požádá s původním UID B o převod. A schválí až po ověření člověka: nové UID má stejné playerId a staré UID již nečte hru. Pozdní nový hráč čeká na schválení.
6. Nový profil pro hosta: špatný kód odmítnut, správný přenese hosta a spotřebuje kód. Starý profil ztratí přístup. Nový host vydá nový kód; starý/odvolaný již nefunguje. Audit obsahuje převzetí, žádný kód.

Telefony vyžadují vlastní nasazené Firebase rules a HTTPS API/frontend; loopback emulátory na ně nepatří. Zapsat model, OS, prohlížeč, origin a výsledky; fyzický test dosud neproveden.
