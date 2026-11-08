# Changelog

## 0.4.0 (2026-11-08): campaign, vrijspelen en online leaderboard
- **Campaign Mode (hoofdmodus).** Maak je vechter (meisje of jongen, kapsel, huid, haar) en begin als witte band.
  - Om en om training en toernooi.
  - Trainingen: bokszak (ritmespel met een echte, meezwaaiende zak) en gewichtheffen (timing, steeds zwaarder).
  - Toernooien: club → regio → NK (kyu, open) → EK (kyu, open) → WK in Tokio, met Sensei Wesley in de finale. Winst geeft de zwarte band.
  - Titels: Clubkampioen, Regiokampioen, Nederlands, Europees en Wereldkampioen. Ze staan in de hub, op de vechterkeuze en op het overwinningsscherm.
  - Upgradepunten voor kracht, snelheid, techniek, uithouding en scheenharding (noob → legend).
  - Technieken komen vrij met je graad.
- **Vrijspelen.** Senpai en sensei zijn eerst niet speelbaar. Elke toernooizege speelt de volgende vrij: lagere senpai → hogere senpai → Sensei Conchita. Sensei Wesley pas door hem in een finale te verslaan.
- **Graadcurve.** Witte band → 5e kyu normaal, → bruine band 2× zo langzaam, → zwarte band 4× zo langzaam.
- **Online leaderboard** (meeste gevechten, meeste toernooizeges). Cloudflare Worker + D1 in `server/leaderboard`, lokaal getest. Online zetten vraagt nog een Cloudflare-account.
- Toernooisysteem algemeen gemaakt (4 of 8 deelnemers, eindbaas in de andere helft van het schema).
- Nieuwe tests: `campaign.cjs`, `unlocks.cjs`.

## 0.3.1 (2026-11-08): geen zoom meer tijdens het spelen
- Browser-zoom geblokkeerd: dubbel tikken, knijpen en iOS-gestures. Is er toch ingezoomd, dan springt de viewport terug. Keuzelijsten hebben 16 px tekst, want iOS zoomt in op kleinere velden.
- Rustigere camera: in het gevecht een vaste afstand (zoomt alleen uit als de vechters ver uit elkaar staan, nooit in). De close-ups bij een knock-down en een super zijn minder dichtbij en minder snel.

## 0.3.0 (2026-11-08): roster volgens de dojo
- 8 nieuwe vechters: Azad, Senpai Ferry, Senpai Micha, Mano, Leo, Nina, Naotaka en Niven (37 in totaal).
- Senpai Dave (2e dan), Senpai Daan en Senpai Niesje (1e dan). Sensei Conchita is 4e dan, Senpai Anjay 2e dan.
- Alle graden en geslachten volgens de opgave van de dojo. Bandkleuren van de dojo: 10e kyu wit, 9e rood, 8e-7e blauw, 6e-5e geel, 4e-3e groen, 2e-1e bruin, dan zwart.
- Figuren zien er mannelijk of vrouwelijk uit: bouw, kapsel (kort, staart, knot) en een wit T-shirt onder de dogi voor vrouwen.
- De graad telt mee in de kracht: 10e kyu 88% tot 4e dan 104%.
- Djordy: specialist high kicks (Hemelhoog, Rol Kick, Draaiende hiel; super Tenkū).
- Nieuwe techniek Rol Kick (Kaiten Kakato Geri). Ushiro Mawashi Geri (↖ + GERI) en Rol Kick (↙ + GERI) zitten in de basis-moveset van iedereen; de AI gebruikt ze ook.
- Vechterkeuze op graad gesorteerd, met graad en geslacht op de kaart. Story: kyu-graden en Skylar, dan twee senpai, Sensei Conchita, Sensei Wesley.
- De datatest controleert de opgave van de dojo letterlijk.

## 0.2.0 (2026-11-08): officieel logo
- Het officiële Dojo Hokori Meiyo-logo vervangt de benadering, overal: splash, menu, pauze, opties, laden, uitslag, HUD, banners, boarding, wandlogo, vlaggen, dogi-badge en het watermerk van foto's.
- `tools/logo/complete-logo.py` maakt het logo scherp, geeft het meer ruimte en vult de drie penseelstreken aan die links waren afgesneden.
- App-iconen (192/512 px) en een transparante variant. De oude SVG-benadering en `make-logo.py` zijn verwijderd.

## 0.1.0 (2026-11-08): eerste prototype
- Projectstructuur, GDD, roster met movesets (29 vechters) en technisch ontwerp.
- Speelbare web-build: toernooi, story, versus, training, photo mode.
- Kyokushin-wedstrijdregels met officials, vlaggen, waza-ari/ippon, hantei en encho-sen.
- Procedurele vechters in Kyokushin-dogi met de kanji 極真 en de Hokori Meiyo-badge.
- Logo-benadering als SVG (embleem en woordmerk); het officiële logo kan worden neergezet als `assets/logo-officieel.png`.
- Tests: data, rooktest, posegalerij en regelsimulatie.
