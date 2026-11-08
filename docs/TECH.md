# Technisch ontwerp: Dojo Hokori Meiyo Fight Game

## 1. Keuze van de techniek

| | Fase 1: web-first (nu) | Alternatief: Unity / Unreal |
|---|---|---|
| Engine | Three.js r187 (WebGL), ES-modules, geen build-stap | Unity (URP) of Unreal 5 |
| iOS/Android | Capacitor zet dezelfde code in een native app | native export |
| Testen | elke telefoon via een link (PWA), meteen meetesten in de dojo | builds via TestFlight/Play |
| Grafisch plafond | goed (PBR, schaduwen, particles); console-niveau is lastig | hoogste |
| Kosten/tempo | laag, snel itereren | hoger; licentie en tooling |

**Advies:** valideer de gameplay eerst web-first. De game-logica is losgekoppeld van de engine: data (`src/data/`), regels (`match.js`), vechterlogica (`fighter.js`) en AI (`ai.js`) praten niet met Three.js. Als de verticale slice (fase 2) laat zien dat de grafische ambitie meer vraagt dan WebGL op een middenklasse-telefoon aankan, porten we die modules naar C# (Unity). Ontwerp en data gaan 1-op-1 mee.

Eerlijk is eerlijk: "zeer hoge grafische kwaliteit" komt vooral van **echte 3D-modellen, motion capture en goede animatie**, niet van de engine. De procedurele vechters in het prototype zijn placeholders. Zie §4 voor de route naar eindkwaliteit.

## 2. Projectstructuur

```
dojo-hokori-meiyo/
├── index.html              alle schermen (splash, menu, keuze, HUD, pauze, foto, uitslag) + CSS
├── manifest.webmanifest    PWA (liggend, fullscreen)
├── lib/three.module.js     Three.js r187 (MIT)
├── assets/
│   ├── logo-officieel.png  officieel logo, aangevuld en opgeschoond (wit plaatje, 1024 px)
│   ├── logo-officieel-vrij.png  idem, transparant
│   ├── icon-192/512.png    app-iconen
│   ├── fonts/              Yuji Boku-subset (OFL) voor kanji in de UI
│   └── voice/              stemopnames ja/ en nl/ + index.json
├── src/
│   ├── main.js             schermflow, spelmodi, camera, HUD, hoofdlus
│   ├── data/
│   │   ├── roster.js       29 vechters: stats, stijl, signatures, super, finisher, AI-profiel
│   │   ├── moves.js        technieken-bibliotheek (timing, bereik, schade, poses, uitleg)
│   │   ├── terms.js        scheidsrechterscommando's (romaji, kana, NL) + laadtips
│   │   ├── profile.js      graden, keiko-punten, unlocks (localStorage)
│   │   ├── online.js       leaderboard-interface (nu lokaal)
│   │   └── glyphs.js       penseelpaden voor de kanji (uit Yuji Boku)
│   ├── game/
│   │   ├── fighter.js      toestandsmachine, technieken, treffers, schademodel
│   │   ├── match.js        wedstrijdregels: ceremonie, scoring, knock-down, hantei, encho
│   │   ├── ai.js           computer-tegenstander (zelfde input als een speler)
│   │   ├── input.js        toetsenbord + touch (joystick, knoppen, inputbuffer)
│   │   ├── model.js        procedurele vechter (skelet, dogi, band, lint)
│   │   ├── poses.js        poses per gewricht + mengen
│   │   ├── arena.js        toernooihal, tatami, officials, publiek, banners, licht
│   │   ├── textures.js     dogi-textuur met kanji, banners, tatami, boarding
│   │   └── fx.js           particles, impact-ring, shake, hit-stop, slow motion
│   └── audio/audio.js      procedurele effecten, muziek, spraak/stemopnames
├── tools/
│   ├── logo/               bron van het logo + complete-logo.py (aanvullen en opschonen) + 2000 px master
│   ├── extract-glyphs.py   haalt penseelpaden uit het font
│   ├── gen-roster-md.mjs   maakt docs/ROSTER.md uit de data
│   ├── build-www.sh        kopieert de game naar www/ voor Capacitor
│   └── test/               data.mjs, smoke.cjs, poses.cjs, rules.cjs
└── docs/  GDD.md · ROSTER.md · TECH.md
```

## 3. Architectuur

### 3.1 Hoofdlus

```
frame(raw dt)
 └─ fx.step(dt)            hit-stop (dt=0) en slow motion (dt×schaal)
     └─ simulate(dt)
         ├─ match.update   ceremonie-script, klok, jogai, knock-down-telling, timers
         ├─ input          Controller (speler) / AI / trainingspop → handleInput
         ├─ fighter.update toestand, pose-animatie, treffermoment → resolveHit
         └─ separate       minimale afstand, grenzen van de mat
 ├─ fx.update / arena.update (vlaggen, publiek)
 ├─ updateCamera           modus: intro / fight / kd / super / result / photo / menu
 └─ renderer.render
```

### 3.2 Vechter (fighter.js)

Toestanden: `idle · walk · attack · block · lowblock · parry · hit · down · getup · stand · rei · osu · victory`.

Een techniek (`moves.js`) heeft `startup · active · recovery` en keyframes `[pose, tijd]`. Op `startup` valt het treffermoment. `resolveHit` controleert in deze volgorde:
1. **bereik**: reach van de techniek + bereik van de vechter
2. **overtreding**: in de toernooimodus geeft een gezichtsstoot chui
3. **parry**: een counter-signature van de verdediger
4. **blok**: hoog/midden-blok tegen jodan/chudan, sune uke tegen gedan
5. **schade**: ki en de schadeteller van de zone; een counter doet ×1,25
6. **knock-down**: finisher, ki op, beendrempel, rompdrempel of een kans bij een hoofdtreffer
7. **reactie**: hit-pose, terugslag, stun

De speler en de AI geven hetzelfde input-object door (`{dir, move, uke, pressed}`). Daarom kan de AI niets wat een speler niet kan.

### 3.3 Wedstrijd (match.js)

Fases: `intro → fight ⇄ yame/knockdown/scoring → hantei → (encho → fight) → ended`.
Hooks naar de presentatielaag: `call` (scheidsrechterscommando), `shout`, `knockdown`, `count`, `score`, `timeUp`, `votes`, `end`. De regels weten dus niets van camera of geluid. Daardoor zijn ze 1-op-1 te porten en zonder renderen te testen (`tools/test/rules.cjs`).

### 3.4 Skelet en animatie

Gewrichten: `pelvis, spine, head, lSh, lEl, rSh, rEl, lHip, lKnee, rHip, rKnee` plus een root (hoogte, voorwaarts, yaw, pitch). Poses zijn Euler-rotaties per gewricht. Technieken mengen keyframes met ease-in-out. Draaitrappen draaien door via 2π.

**Overstap naar echte modellen:** een artist levert glTF-modellen met bones onder dezelfde namen (of een mapping). Elke techniek wordt dan een animatieclip (`AnimationMixer`). De frames in `moves.js` worden markers ("impact op 0,24 s"). De gameplay-timing blijft in `moves.js`, zodat balans en animatie los van elkaar bij te stellen zijn.

## 4. Route naar eindkwaliteit (art pipeline)

1. **Motion capture in de dojo**: een betaalbaar inertial pak (bijvoorbeeld Rokoko of Xsens-huur) of optische markerless capture (meerdere telefoons). Neem van elke techniek 3 tot 5 takes op met echte vechters: Sensei Wesley voor de eindbaas, de dojoleden voor hun eigen signatures.
2. **Modellen**: één basismodel met dogi-simulatie (Marvelous Designer → Blender), varianten per vechter (lengte, bouw, gezicht naar foto met toestemming, haar). Ongeveer 25 tot 40k driehoeken per vechter, LOD's.
3. **Dogi en band**: cloth-baking of eenvoudige bones voor de mouwen, de broek en de banduiteinden. De kanji en de badge als decal.
4. **Export**: glTF 2.0 + KTX2 (Basis) textures + Meshopt/Draco-compressie.
5. **Belichting**: gebakken lightmaps voor de arena, één dynamische schaduw-lamp, een HDRI voor reflecties. Post-processing (bloom, kleurgrading, vignet) via `EffectComposer` op high-end toestellen.

### Prestatiebudget (middenklasse-telefoon, 60 fps)

| | Budget |
|---|---|
| Draw calls | < 150 (publiek via instancing) |
| Driehoeken in beeld | < 300k |
| Textures | < 150 MB GPU, KTX2 |
| Schaduwen | 1 lamp, 1024² (instelling "Laag": uit) |
| JS per frame | < 4 ms |

## 5. Mobiele builds (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/haptics @capacitor/screen-orientation
bash tools/build-www.sh          # kopieert index.html, src, lib, assets naar www/
npx cap add android               # Android Studio nodig
npx cap add ios                   # Mac met Xcode nodig
npx cap sync
npx cap open android|ios
```

- `capacitor.config.json` staat al klaar (appId `nl.hokorimeiyo.fightgame`, webDir `www`).
- Liggend vergrendelen met `@capacitor/screen-orientation`. Haptische feedback bij treffers met `@capacitor/haptics` (nu `navigator.vibrate`).
- Leaderboards in fase 3 via Game Center (iOS) en Play Games (Android), of de eigen backend (§6).
- iOS-builds vragen een Mac met Xcode en een Apple Developer-account (€99/jaar). Google Play vraagt eenmalig $25.

## 6. Online

### Leaderboards (fase 3a)
- Backend: Supabase (Postgres + RLS) of Firebase (Firestore). Je gebruikt beide al in andere apps.
- Anonieme login, een bijnaam, een **dojo-code** voor het dojo-bord.
- Een server-side controle tegen valse scores: de server berekent de punten uit de wedstrijdresultaten, niet de client.

### Online versus (fase 3b)
- **Rollback-netcode** (zoals GGPO): de input van beide spelers per frame uitwisselen en bij een late input terugspoelen en opnieuw simuleren.
- Wat daarvoor nog moet:
  - een **vaste tijdstap** (60 Hz) in plaats van variabele `dt`
  - een **seeded RNG** in plaats van `Math.random` (knock-down-kans, hantei-ruis, AI)
  - een state snapshot/restore van `Fighter` en `Match`
- Transport: WebRTC-datachannel (peer-to-peer) met een kleine signaling-server (bijvoorbeeld op de thuisserver of een Cloudflare Worker).

## 7. Testen

| Test | Commando | Controleert |
|---|---|---|
| Data | `node tools/test/data.mjs` | roster compleet (29, geen Jalissa/tweede Jaylee), technieken en poses bestaan |
| Rooktest | `node tools/test/smoke.cjs` | splash → menu → toernooi → gevecht, screenshots, JS-fouten |
| Posegalerij | `node tools/test/poses.cjs` | screenshot van elke techniek op het treffermoment |
| Regels | `node tools/test/rules.cjs 8` | AI tegen AI: elke wedstrijd eindigt (ippon/hantei/encho) |

De browsertests verwachten een server op poort 8766 (`npm run serve`) en Playwright met Chromium (`NODE_PATH=/root/tools/pw/node_modules`). Headless draait het met SwiftShader op ongeveer 5 fps. Daarom stappen de regel- en posetests de simulatie zelf af via `window.__game.sim()` en `step()`.

## 8. Bekende beperkingen van het prototype

- Procedurele figuren in plaats van echte modellen; geen gezichten of handen met vingers.
- 2,5D-beweging (één lijn), nog geen zijstappen.
- Geen post-processing (bloom/DOF).
- Spraak via de stem van het toestel. Niet elk toestel heeft een Japanse stem; dan verschijnt alleen tekst.
- Online en controller-ondersteuning ontbreken nog.
- Een variabele tijdstap en `Math.random` maken de simulatie niet deterministisch (nodig voor online).
