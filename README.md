# Dojo Hokori Meiyo Fight Game

Full-contact **Kyokushin**-vechtgame voor iOS en Android, met de vechters van Dojo Hokori Meiyo uit Zoetermeer. **Eer & Trots. Osu!**

Status: **fase 1, speelbaar prototype** (web/PWA, klaar voor Capacitor).

## Spelen

```bash
npm run serve        # python3 -m http.server 8766
# open http://127.0.0.1:8766  (liggend; op een telefoon via het LAN-adres)
```

| | Toetsenbord | Touch |
|---|---|---|
| Lopen | A / D | joystick links (overal op de linkerhelft) |
| Diagonalen (↖ ↙ ↗ ↘) | W/S + A/D | joystick schuin |
| Tai sabaki (uitwijken) | L + W | UKE + joystick omhoog |
| Snelle stap terug | twee keer A | twee keer naar achteren |
| Omhoog / omlaag | W / S | joystick omhoog/omlaag |
| Tsuki (stoot) | J | 突 TSUKI |
| Geri (trap) | K | 蹴 GERI |
| Uke (blok) | L (vasthouden) | 受 UKE |
| Kiai (special/super) | I | 気 KIAI |
| Pauze | Esc / P | II |

2 spelers op één toetsenbord: speler 1 WASD + F G H R, speler 2 pijltjes + J K L I.

## Wat zit erin

- **Campaign (hoofdmodus):** maak je eigen vechter (meisje of jongen) en groei van witte band naar zwarte band. Om en om trainen (bokszak, gewichtheffen) en toernooien (club → regio → **NK → EK → WK**), met titels als Nederlands, Europees en Wereldkampioen, upgrades van noob tot legend, en Sensei Wesley in de WK-finale.
- **Toernooi** (Hokori Meiyo Cup: speel senpai en sensei vrij), **Story**, **Versus** (CPU of 2 spelers), **Training** (met uitleg), **Photo Mode**.
- **Online leaderboard:** meeste gevechten en meeste toernooizeges (Cloudflare Worker, zie `server/leaderboard`).
- Kyokushin-wedstrijdregels: rei-ceremonie, Hajime/Yame, waza-ari, ippon, awasete ippon, knock-down-telling, hantei met de vlaggen van de hoekscheidsrechters, encho-sen, chui/genten/hansoku, jogai.
- Echte bewegingen: motion capture van een Kyokushin-karateka (gyaku zuki, mae geri, gedan en jodan mawashi geri, ushiro mawashi geri) en van een vechtsporter van ACCAD (stoten op het lichaam, blokken, voetenwerk, draai- en axe kick).
- 38 vechters als realistische MakeHuman-modellen (mannen en vrouwen, met de echte graden en bandkleuren van de dojo), elk met stats, 3 signatures, een super en een finisher. 19 technieken met Japanse naam en uitleg, waaronder Ushiro Mawashi Geri, Axe kick, de laag-hoog trap (double tap) en de Rol Kick.
- Gevechtssysteem:
  - raakdetectie op zichtbaar contact per doelzone
  - renzoku van maximaal 3 technieken met afbouw
  - blok-voordeel, perfect uke, kaeshi (counter) en kiai-uitbraak
  - tai sabaki en een snelle stap terug
  - geen vastzetten tegen de rand
- Schademodel met beenschade (lage trappen), rompschade en hoofdtreffers.
- Toernooihal met tatami, scheidsrechter, 2 hoekscheidsrechters met rode en witte vlaggen, publiek, banners en wapperende Hokori Meiyo-vlaggen.
- Graden van 10e kyu tot 3e dan: tot de 5e kyu normaal, tot bruin 2× en tot zwart 4× zo langzaam. Senpai en sensei speel je vrij door toernooien te winnen.
- Logo op het splash-scherm, in het menu, de pauze, de opties, het laden, de uitslag, de HUD, de arena, op de dogi en als watermerk op foto's.

## Documentatie

- [docs/GDD.md](docs/GDD.md): game design document (regels, modi, progressie, presentatie, audio, branding, roadmap, open vragen)
- [docs/ROSTER.md](docs/ROSTER.md): alle vechters met movesets (gegenereerd: `npm run docs:roster`)
- [docs/TECH.md](docs/TECH.md): architectuur, art pipeline, mobiele builds, online, testen

## Eerst regelen met de dojo

1. **Logo**: het officiële logo zit erin (aangevuld waar de uitsnede het afsneed). Een origineel vectorbestand van de ontwerper is welkom; zie `tools/logo/`.
2. **Toestemming** van de vechters (bij kinderen: ouders) voor het gebruik van hun naam, en hun eigen keuze van stijl en moves.
3. **Reglement** van de bond (ellebogen, yuko, aantal hoekscheidsrechters, rondetijden).

## Testen

```bash
node tools/test/data.mjs
NODE_PATH=/root/tools/pw/node_modules node tools/test/smoke.cjs
NODE_PATH=/root/tools/pw/node_modules node tools/test/rules.cjs 8
NODE_PATH=/root/tools/pw/node_modules node tools/test/poses.cjs
NODE_PATH=/root/tools/pw/node_modules node tools/test/mechanics.cjs   # gevechtssysteem
NODE_PATH=/root/tools/pw/node_modules node tools/test/moves.cjs       # filmstrip per techniek (motion capture)
NODE_PATH=/root/tools/pw/node_modules node tools/test/fight.cjs       # AI tegen AI, beeld voor beeld
NODE_PATH=/root/tools/pw/node_modules node tools/test/calibrate.cjs   # bereik per techniek meten
NODE_PATH=/root/tools/pw/node_modules node tools/test/unlocks.cjs
NODE_PATH=/root/tools/pw/node_modules node tools/test/campaign.cjs   # met lokale leaderboard-server, zie server/leaderboard
```

## Licenties

Three.js en de Three.js-addons (MIT, `lib/THREE-LICENSE`), Yuji Boku-font (SIL OFL 1.1, `assets/fonts/OFL-YujiBoku.txt`), hoofdmodel "Infinite, 3D Head Scan" door Lee Perry-Smith (CC BY 3.0, `assets/models/head/LeePerrySmith_License.txt`). Bewegingen: motion capture uit het [Open Motion Project](https://accad.osu.edu/research/motion-lab/system-data) van ACCAD/The Ohio State University (CC BY 3.0) en de Kyokushin-dataset "Multimodal dataset of Kyokushin karate athletes" van A. Szczęsna, M. Błaszczyszyn en M. Pawlyta, Silesian University of Technology (CC0, [figshare](https://doi.org/10.6084/m9.figshare.c.4981073)). Menselijke modellen gemaakt met MakeHuman-assets (CC0) via MPFB 2 (GPL, alleen gebruikt als bouwtool in Blender; de geëxporteerde modellen vallen daar niet onder). Namen en het logo van Dojo Hokori Meiyo zijn van de dojo.
