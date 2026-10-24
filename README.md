# MVHunt · E1

Spustitelný český základ. Online hra, GPS, herní pravidla, push ani mapa ještě nejsou implementované. Nezakládá účty a neposílá polohy.

## Spuštění

Potřebujete Node.js 22.12+ (ověřeno 24.22.1) a pnpm 11.25.0. Pokud pnpm nemáte, po instalaci Node.js s npm spusťte `npm install --global pnpm@11.25.0`.
V PowerShellu v této složce:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Otevřete adresu vypsanou Vite (obvykle http://localhost:5173). Server ukončíte Ctrl+C.
Výchozí obrazovka vysvětlí chybějící konfiguraci. Tlačítko „Otevřít místní demonstraci“ výslovně otevře lokální ukázku. Reload vrátí výchozí stav; data se neukládají.

V prostředí Codex, kde není pnpm v PATH, funguje místo `pnpm`:

```powershell
& 'C:\Users\moski\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' dev
```

Stejným způsobem nahraďte pnpm i u ostatních příkazů. Jde o lokální cestu tohoto počítače, pro běžnou instalaci není potřebná.
Pokud na tomto počítači instalace hlásí `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, v PowerShellu před instalací nastavte `$env:NODE_USE_SYSTEM_CA='1'`. Tím Node použije také důvěryhodné certifikáty Windows; ověřování TLS se nevypíná.

## Kontroly a produkční sestavení

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

Build vzniká v `dist/`, preview obvykle na http://localhost:4173. `pnpm test:watch` je průběžné testování. Čistou instalaci ověřte v nové kopii zdrojů bez node_modules a dist příkazem `pnpm install --frozen-lockfile`, poté kontrolami výše. Používejte pnpm-lock.yaml, nemíchejte správce balíčků.

## Konfigurace

Pro E1 není `.env.local` potřeba. Volitelně zkopírujte `.env.example` do `.env.local`. Prázdný `VITE_DATA_MODE` nebo `production` zobrazí diagnostiku; `demo` zapne označenou demonstraci. Neplatný režim zobrazí chybu. Po změně prostředí restartujte server. Ani úplná Firebase konfigurace v E1 nenaváže připojení: obrazovka uvede, že adaptér čeká na E3.

Firebase projekt se nyní nezakládá. V E3 použijte výhradně nový vlastní projekt, nikdy konfiguraci reference. Všechny `VITE_*` hodnoty jsou součástí veřejného klienta; serverová tajemství, obnovovací kódy a push klíče sem nepatří. Ignorování .env není náhradou kontroly obsahu před commitem.

## Rozdělení kódu

- `src/game`: minimální kontrakt ukázky a předávaných hodin; pravidla až E2.
- `src/data`: explicitní demo adaptér a diagnostika konfigurace, bez sítě.
- `src/location`: kontrakt měření, bez spuštění GPS.
- `src/map`: textový zástupný stav, bez dlaždic.
- `src/push`: vyhrazené místo pro E8.
- `src/ui`: úvodní obrazovka a výslovné otevření demonstrace.

## Volba technologií (ověřeno 24. 10. 2026)

React + TypeScript + Vite umožňují statické sestavení a oddělený model testovaný Vitestem. [Vite vyžaduje Node 20.19+ nebo 22.12+](https://vite.dev/guide/); projekt používá minimálně 22.12. Leaflet zůstává volbou pro E5 ([stabilní verze 1.9.4](https://leafletjs.com/download.html)); poskytovatel dlaždic zatím není vybrán a knihovna není mapový hosting.

Firebase anonymní Auth + Realtime Database zůstává kandidátem pro E3. [Spark](https://firebase.google.com/pricing) nevyžaduje platební metodu, RTDB má 1 GB uložení a 10 GB stažení měsíčně; [limit připojení je 100](https://firebase.google.com/docs/database/usage/limits). To dává předběžnou cestu pro malý klub, nikoli důkaz kapacity 2–3 her. Bezpečné sloty, oprávnění, rozpočet přenosů a bezplatný důvěryhodný push/scheduler musí prakticky ověřit E3. Žádné služby ani fakturace nebyly zapnuty; SDK Firebase a Leaflet se přidají teprve při implementaci.

## Ruční kontrola v prohlížeči a na telefonu

1. Bez prostředí otevřete aplikaci: musí být vidět chybějící konfigurace, žádná online hra.
2. Otevřete demonstraci: musí být jasně označená, bez hráčů a přenosu polohy. Zavřete ji a obnovte stránku.
3. Na telefonu ve stejné důvěryhodné Wi-Fi otevřete síťovou URL vypsanou `pnpm dev`. Je-li spojení blokováno, zkontrolujte firewall pro místní síť; nevystavujte vývojový server internetu.
4. Ověřte čitelnost na výšku/šířku a ovládání tlačítek. Zaznamenejte model telefonu, OS, prohlížeč a výsledek.

HTTP po LAN stačí jen pro tuto úvodní obrazovku. Skutečná GPS, Wake Lock a PWA budou vyžadovat odpovídající HTTPS testování v pozdějších etapách. E1 neověřuje chování na pozadí ani baterii.
