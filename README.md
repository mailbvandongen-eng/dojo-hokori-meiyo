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
| Diagonaal achteruit (↖ ↙) | W+A / S+A | joystick schuin naar achteren |
| Omhoog / omlaag | W / S | joystick omhoog/omlaag |
| Tsuki (stoot) | J | 突 TSUKI |
| Geri (trap) | K | 蹴 GERI |
| Uke (blok) | L (vasthouden) | 受 UKE |
| Kiai (special/super) | I | 気 KIAI |
| Pauze | Esc / P | II |

2 spelers op één toetsenbord: speler 1 WASD + F G H R, speler 2 pijltjes + J K L I.

## Wat zit erin

- **Toernooi** (single elimination, 8 vechters), **Story** (naar Sensei Wesley), **Versus** (CPU of 2 spelers), **Training** (met uitleg), **Photo Mode**.
- Kyokushin-wedstrijdregels: rei-ceremonie, Hajime/Yame, waza-ari, ippon, awasete ippon, knock-down-telling, hantei met de vlaggen van de hoekscheidsrechters, encho-sen, chui/genten/hansoku, jogai.
- 37 vechters (mannen en vrouwen, met de echte graden en bandkleuren van de dojo), elk met stats, 3 signatures, een super en een finisher. 18 technieken met Japanse naam en uitleg, waaronder Ushiro Mawashi Geri en de Rol Kick.
- Schademodel met beenschade (lage trappen), rompschade en hoofdtreffers.
- Toernooihal met tatami, scheidsrechter, 2 hoekscheidsrechters met rode en witte vlaggen, publiek, banners en wapperende Hokori Meiyo-vlaggen.
- Graden van 10e kyu tot 3e dan, keiko-punten en vrij te spelen dogi.
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
```

## Licenties

Three.js (MIT, `lib/THREE-LICENSE`), Yuji Boku-font (SIL OFL 1.1, `assets/fonts/OFL-YujiBoku.txt`). Namen en het logo van Dojo Hokori Meiyo zijn van de dojo.
