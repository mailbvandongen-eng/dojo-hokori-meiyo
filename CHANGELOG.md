# Changelog

## 0.6.1 (2026-11-09): bokszak en weergave hersteld
- **Kritiek:** op grafische instelling "Laag" liep de game vast (de renderfunctie riep zichzelf eindeloos aan). Hersteld.
- **Snel tikken op knoppen** (bijvoorbeeld "Jongen" en direct "Begin") werd soms genegeerd door de zoombeveiliging. Die geldt nu alleen buiten knoppen.
- **Bokszak:**
  - de vechter staat dichter bij de zak, zodat stoten en trappen zichtbaar raken
  - een gewone trap op een lage noot (en andersom) telt als OK in plaats van gemist
  - ruimere timing: perfect ±0,1 s, goed ±0,2 s
  - duidelijkere uitleg
- **Vechtermodel:**
  - de hals van de hoofdscan loopt door tot in de jas (geen gekartelde snijrand of losse hals meer)
  - de jas is van boven dicht, de kraag sluit om de hals, de revers en de borst liggen plat op de stof
  - armen en gezicht hebben dezelfde huidtint
  - het haar sluit strakker om het hoofd
- **Automatische kwaliteit:** haalt een toestel geen ~30 fps op "Hoog", dan gaan nabewerking en resolutie vanzelf omlaag. Op grote tabletschermen staat de resolutie standaard op 1,5×.

## 0.6.0 (2026-11-09): realistische vechters
- **Gescand hoofd:** "Infinite, 3D Head Scan" van Lee Perry-Smith (CC BY 3.0), met de schouders eraf geknipt. Per vechter een huidtint, een vrouwelijke variant (smaller gezicht en kaak) en haar dat de vorm van de schedel volgt (kort, staart of knot). Ook de scheidsrechters hebben dit hoofd.
- **Nieuwe dogi:**
  - een gevormde romp met kraag en revers
  - borst (man) of wit T-shirt (vrouw) in de V van de jas
  - wijde mouwen tot net onder de elleboog, een uitlopende jasrok en wijde broek
  - een band met twee lussen en knoop
  - handen met knokkels en duim, en blote voeten
- **Stof:** fysiek materiaal met glans (sheen) en een normal map met weefsel en zachte plooien.
- **Belichting:** omgevingsreflecties (RoomEnvironment), warmer hoofdlicht met scherpere schaduwen. Op "Hoog" een nabewerking: gloed, filmkorrel en vignet.
- **Hata zonder zwarte rand:** de vlaggen lichten zelf iets op. De gevechtscamera staat iets dichterbij, nog steeds op een vaste afstand.
- Gewrichten en hun posities zijn ongewijzigd: de raakdetectie en alle tests kloppen nog.

## 0.5.0 (2026-11-09): gevechtssysteem vernieuwd
- **Raakdetectie op contact:** per frame wordt het raakvlak (scheen, vuist, knie, elleboog) gemeten tegen de doelzone van de tegenstander (hoofd, romp of benen). Het bereik is opnieuw gemeten; het was 0,35-0,5 m te ruim.
- **Ushiro Mawashi Geri gerepareerd:** het lichaam draaide de verkeerde kant op, waardoor het been bij het treffermoment naar achteren wees. Hij draait nu correct en de hiel raakt het hoofd.
- **Trappen op de juiste hoogte:** de jodan-trap raakt het hoofd in plaats van de schouder, de lage trap de dij in plaats van de enkel. De ronde trappen wijzen recht op de tegenstander.
- **Nieuw:** Axe kick (↗ + GERI) en de laag-hoog trap / double tap (↘ + GERI, twee treffers: laag en hoog).
- **Geen eindeloze combo's meer:** de lussen in de combinatietabel zijn weg, maximaal 3 technieken per reeks, met schade- en stun-afbouw.
- **Blokken en counteren:**
  - Blok geeft voordeel en een counter-venster.
  - Perfect uke laat de aanvaller wankelen.
  - Kaeshi: snellere, hardere counter.
  - Kiai-uitbraak uit een combo.
  - Missers en geblokte technieken kosten extra herstel.
  - In de tweede helft van het herstel mag je al blokken.
- **Rand van de mat:** terugslag tegen de rand gaat naar de aanvaller (geen jogai meer door terugslag), en er is tai sabaki (UKE + ↑) om uit de hoek te komen. Twee keer snel naar achteren = snelle stap terug.
- **Vloeiender:**
  - Lopen met versnelling, vloeiend draaien bij het wisselen van kant.
  - Geen terugdraai meer na een draaitrap.
  - De aanvaller maakt bij een knock-down zijn trap af.
  - Een witte of oranje (counter) treffer-flits op het lichaam, en meldingen voor renzoku, kaeshi, perfect uke en tai sabaki.
- **Vlaggen van de hoekscheidsrechters:** grotere hata met donkere rand en eigen licht. De hoekscheidsrechters staan op en wapperen met de vlag, de camera toont bij de hantei de hele mat, en in beeld komen stemkaarten (AKA/SHIRO/HIKIWAKE) per scheidsrechter.
- **De AI** blokt per treffer (laag/hoog), countert na een blok, wijkt uit de hoek en breekt uit combo's.
- **Nieuwe vechter:** Sensei Crystal (vrouw, 3e dan), vrij te spelen na de senpai en vóór Sensei Conchita.
- **Nieuwe tests:** `mechanics.cjs` (16 controles) en `calibrate.cjs`.

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
