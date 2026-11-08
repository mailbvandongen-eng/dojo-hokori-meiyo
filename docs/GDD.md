# Game Design Document: Dojo Hokori Meiyo Fight Game

Versie 0.1 · 8 november 2026 · status: prototype (fase 1)

> **Eer & Trots (誇り名誉, Hokori Meiyo) · Osu no Seishin (押忍の精神)**
> Een full-contact Kyokushin-vechtgame voor en over de vechters van Dojo Hokori Meiyo in Zoetermeer.

---

## 1. Visie

Een mobiele vechtgame (iOS en Android) met de klap en het spektakel van Tekken en Mortal Kombat. Elke wedstrijd voelt als een echte Kyokushin-knockdownwedstrijd: rei-ceremonie, scheidsrechter en hoekscheidsrechters met vlaggen, waza-ari en ippon, hantei en encho-sen.

### Pijlers

1. **Authentiek Kyokushin.** Echte technieken, echte regels en echte terminologie. Geen vuurballen, geen bloed. Het spektakel komt uit timing, impact en presentatie.
2. **Full-contact hardheid.** Lage trappen stapelen beenschade op, rompstoten breken de conditie en een schone jodan geri beslist een wedstrijd. Je ziet en voelt de schade.
3. **Onze dojo.** De echte vechters van Dojo Hokori Meiyo, met de sensei als eindbaas. Het logo, de banners en de spirit staan overal.
4. **Respect.** Winnen met eer, verliezen met opgeheven hoofd. Elke wedstrijd begint en eindigt met rei en Osu.

### Doelgroep

- **Primair:** leden van Dojo Hokori Meiyo (kinderen, jeugd, volwassenen) en hun families.
- **Secundair:** Kyokushin- en vechtsportliefhebbers.
- **Leeftijd:** realistische vechtsport zonder bloed of verwondingen. Richtpunt PEGI 7 tot 12. De definitieve classificatie volgt uit de IARC-vragenlijst bij publicatie.

### Platform

- iOS en Android (telefoon en tablet), liggend, 60 fps.
- Speelbaar in de browser (PWA) tijdens de ontwikkeling. Zo kan de dojo meetesten zonder app store.
- Besturing: touch (virtuele joystick en 4 knoppen), controller (fase 2) en toetsenbord (ontwikkeling en lokaal 2 spelers).

---

## 2. Kerngameplay

### 2.1 Besturing

| Knop | Japans | Functie |
|---|---|---|
| **TSUKI** 突 | stoot | stoten en ellebogen (alleen naar de romp) |
| **GERI** 蹴 | trap | trappen en knieën |
| **UKE** 受 | wering | vasthouden = dekking hoog/midden; met ↓ = sune uke (scheenblok) |
| **KIAI** 気 | strijdkreet | signature (1/3 meter) of super (volle meter) |

De richting telt mee en is relatief (→ = naar de tegenstander toe). Zo heeft elke knop 4 tot 5 technieken. De volledige tabel staat in [ROSTER.md](ROSTER.md#basis-moveset-alle-vechters).

**Renzoku waza (combinaties):** druk opnieuw op TSUKI of GERI terwijl een techniek raakt of geblokt wordt. Voorbeeld: hidari seiken → migi gyaku-tsuki → gedan mawashi geri, de klassieke Kyokushin-combinatie.

**Inputbuffer:** een druk blijft 150 ms geldig, zodat techniekjes niet "wegvallen" tijdens herstel.

### 2.2 Schademodel

Een gewone energiebalk past niet bij Kyokushin. Daarom zijn er vier tellers:

| Teller | Loopt op door | Gevolg | Herstel |
|---|---|---|---|
| **Ki** (uithouding) | elke treffer | op = knock-down, meestal ippon | langzaam (1,2/s) |
| **Benen** | gedan mawashi geri, uchi-momo | trager lopen, hinken, bij 130 = knock-down ("het been geeft het op") | nauwelijks |
| **Romp** | stoten, knieën, chudan-trappen | bij 170 en een harde treffer = knock-down (door de knieën) | matig |
| **Hoofd** | jodan geri, tobi hiza, kakato | geen teller: elke schone treffer heeft een kans op knock-down, die groter wordt naarmate de ki lager is | n.v.t. |

Extra regels:

- **Counter:** raak je iemand tijdens de opbouw van diens techniek, dan doe je 25% meer schade en is de kans op knock-down groter.
- **Sune uke vs lage trap:** de aanvaller krijgt zelf beenschade. Dat is echt Kyokushin: checken doet pijn.
- **Blokken** kost een beetje ki en geeft terugduw, maar stopt de schadetellers.

### 2.3 Kiai-meter

- Vult bij treffers (aanvaller 60%, verdediger 30% van de waarde van de techniek).
- **1/3 meter:** signature move (KIAI, → KIAI, ↓ KIAI). Dat kan een reeks zijn, een counterhouding, een harnas ("loopt door een treffer heen") of een verbeterde techniek.
- **Volle meter:** super move. Slow motion, een cinematic camera en een reeks van 3 tot 5 technieken.
- **Finisher:** raakt de laatste techniek van de super een tegenstander met minder dan 25% ki, dan volgt de finisher-cinematic en direct ippon.

### 2.4 Beweging en ruimte

- Gevechten spelen zich af op één lijn (2,5D), zoals de klassieke Tekken-camera. Zijstappen (sabaki) en echte 3D-beweging volgen in fase 2.
- **Jogai:** wie buiten het wedstrijdvlak komt, wordt teruggezet ("Yame! Jogai!"). Drie keer jogai levert een chui op.

---

## 3. Wedstrijdregels in de game

> De regels volgen gangbare Kyokushin-knockdownreglementen. De details verschillen per bond (IKO, KWU, WKO, nationale bonden). **Laat Sensei Wesley de regels toetsen aan het reglement van de eigen bond.** De afwijkingen in de game staan in §3.8.

### 3.1 Officials

| Official | Japans | In de game |
|---|---|---|
| Hoofdscheidsrechter | **Shushin** | staat op de mat, roept commando's, geeft de stem met de hand |
| Hoekscheidsrechters | **Fukushin** | 2 op stoelen in de hoeken, met een rode en een witte vlag (hata); 4 als optie (fase 2) |
| Jury/tijdwaarneming | **Kansa** | jurytafel met taiko voor het einde van de tijd |

### 3.2 Hoeken

**Aka** (rood) staat rechts van de scheidsrechter, **shiro** (wit) links. Elke vechter draagt een rood of wit lint achter op de band. In de game is de speler aka (links in beeld).

### 3.3 Ceremonie

1. *Shomen ni rei*: groet naar voren
2. *Otagai ni rei*: groet elkaar, gevolgd door **Osu!**
3. *Kamaete*: houding aannemen
4. **Hajime!**: begin

Na afloop: uitslag, groet en Osu.

### 3.4 Scoring

| Score | Japans | Hoe | Gevolg |
|---|---|---|---|
| **Ippon** | 一本 | tegenstander > 3 s neer, kan niet verder, of finisher | wedstrijd gewonnen |
| **Waza-ari** | 技有り | tegenstander < 3 s neer (knock-down) | halve punt; scheidsrechter strekt de arm zijwaarts naar de scorer |
| **Awasete ippon** | 合わせて一本 | 2× waza-ari | wedstrijd gewonnen |
| **Hantei** | 判定 | einde tijd: scheidsrechter en hoekscheidsrechters stemmen (vlag op = die hoek, vlaggen gekruist = hikiwake) | meerderheid wint, anders encho-sen |
| *Yuko* | 有効 | **niet in de standaardmodus.** De meeste knockdownbonden kennen geen yuko. Komt als optionele regelset als de bond van de dojo die gebruikt. | |

Een waza-ari wint altijd de hantei als de ander er geen heeft (*waza-ari yusei*).

### 3.5 Knock-down en telling

- Bij een knock-down roept de scheidsrechter "Yame" en de telling begint (ichi, ni, san, ...).
- Hoe lang een vechter neer blijft, hangt af van de resterende ki en de oorzaak (benen = langer).
- Opstaan vóór 3 s = **waza-ari**; later = **ippon**.
- Na een waza-ari: posities terug, "Tsuzukete hajime!" De getroffen vechter herstelt deels (benen en romp × 0,5).

### 3.6 Tijd en verlengingen

| Fase | Japans | Standaard | Opties |
|---|---|---|---|
| Reguliere tijd | hon-sen | 2 min | 3 min (senioren), 1 min (snel) |
| Verlenging 1 | encho-sen | 2 min | |
| Verlenging 2 (laatste) | saishu encho-sen | 2 min, de scheidsrechters moeten beslissen | |

Echte reglementen kennen soms nog een beslissing op gewicht of tameshiwari. Die stap slaat de game over.

### 3.7 Toegestane en verboden technieken (modus "Toernooi")

| Toegestaan | Verboden (chui) |
|---|---|
| stoten naar de romp (seiken, shita-tsuki) | stoten en ellebogen naar hoofd of gezicht (*kao*) |
| ellebogen naar de romp, als de bond dat toestaat (zie §3.8) | vastpakken en vasthouden (*tsukami*) |
| trappen naar benen, romp en hoofd | duwen met de handen (*oshi*) |
| knieën naar romp en hoofd | aanvallen op kruis, knie(gewricht), achterhoofd, nek, rug |
| | kopstoten, aanvallen na "Yame" |

**2× chui = 1 genten** (strafpunt, telt zwaar mee in hantei). **2× genten = hansoku** (diskwalificatie).

In de modus **Dojo (vrij)** mag de jodan-stoot (↑ + TSUKI) en zijn er geen chui voor gezichtsstoten. Dat is bedoeld voor specials en voor de lol, niet voor de toernooimodus.

### 3.8 Bewuste afwijkingen en open punten (te toetsen met de sensei)

- **Ellebogen naar de romp** zijn toegestaan in de game, maar niet elke bond staat ze toe. Moet dit een chui worden?
- **Clinch en body checks** uit de briefing: vasthouden is in echte Kyokushin een overtreding. Voorstel: een korte **clinch-knie** (knie zonder vast te houden) is toegestaan. Echt vasthouden langer dan ±1 s wordt chui (fase 2). Een body check zonder handen (schouderduw) is in de meeste reglementen ook verboden. Daarom staat die er niet in.
- **Hoofdstoten in specials:** de briefing vraagt "geen head punches behalve bij bepaalde specials". Dat is opgelost via de modus Dojo (vrij). In de modus Toernooi geeft een gezichtsstoot altijd chui. Zo blijft de toernooimodus zuiver.
- **2 hoekscheidsrechters** (briefing) in plaats van de 4 die op grote toernooien gangbaar zijn. 4 wordt een optie.
- **Hantei-criteria** in de game: schade, schone treffers, initiatief (naar voren), strafpunten, met per scheidsrechter wat ruis. Officieel zijn de criteria: waza-ari > strafpunten > schade > initiatief/aantal technieken. Dat moet nog fijner worden afgestemd.

### 3.9 Wedstrijdvlak

- 8 × 8 m wedstrijdvlak van tatami-matten (1 × 2 m), met een rode veiligheidszone van 1 m (verschilt per bond).
- Startlijnen voor aka en shiro, en een scheidsrechterslijn.
- Hoekscheidsrechters op stoelen in de hoeken. Jurytafel met Kyokushin-doek aan de kopse kant.

---

## 4. Spelmodi

### 4.1 Toernooi (hoofdmodus)

- **Single elimination** met 8 vechters: kwartfinale, halve finale, finale. Later ook 16 vechters en categorieën (jeugd/senioren, gewichtsklassen).
- Het schema laat de uitslagen van de andere partijen zien (gesimuleerd op stats).
- In de finale is de tegenstander een niveau sterker.
- Winst: +200 keiko-punten en een toernooititel in het profiel.
- **Fase 2:** "Hokori Meiyo Cup" met een openingsceremonie, de vechters in een rij, een prijsuitreiking met podium en een dojo-foto (Photo Mode).

### 4.2 Story / Arcade

- Je kiest een vechter en klimt via 6 dojogenoten (op graad gesorteerd) naar **Skylar** (rivaal, de dochter van de sensei) en tot slot **Sensei Wesley**.
- Elke stap heeft een korte tekst en de quote van de tegenstander.
- Sensei Wesley verslaan speelt Sensei Wesley vrij voor alle modi.
- **Fase 2:** een echte verhaallijn per vechter in stripstijl (stills), met momenten in de dojo: training, examen (graduatie), wintertraining aan het strand (*fuyu geiko*) en het eerste toernooi.

### 4.3 Versus

- **Lokaal:** tegen de computer (4 niveaus: Kohai, Senpai, Sensei, Shihan) of met 2 spelers op één toetsenbord of met 2 controllers.
- **Online (fase 3):** vrienden uitnodigen met een dojo-code, plus ranked. Dit vraagt rollback-netcode, zie [TECH.md](TECH.md#6-online).

### 4.4 Training

- Sensei Conchita legt uit; een partner (de pop) die stil staat, hoog blokt, laag blokt of aanvalt.
- Bij elke techniek verschijnt de Japanse naam, de vertaling, de schade en de uitleg.
- Technieken-overzicht met alle inputs en uitleg (ook in het pauzemenu).
- **Fase 2:** kihon-lessen ("doe 5× gedan mawashi geri"), een combo-uitdaging, een uitleg van de wedstrijdregels met de scheidsrechter, en een kata-modus op ritme (Taikyoku sono ichi, Pinan) als rustpunt.

### 4.5 Photo Mode

- Vanuit het pauzemenu: tijd bevroren, HUD weg, vrije camera (slepen = draaien, knijpen = zoomen).
- Filters: normaal, zwart-wit, sepia, toernooi.
- De foto krijgt automatisch het Hokori Meiyo-logo als watermerk en kan via het deelmenu van de telefoon gedeeld worden.

---

## 5. Roster

Het volledige roster met movesets staat in **[ROSTER.md](ROSTER.md)** (gegenereerd uit de data).

- **29 vechters**, met Sensei Wesley (4e dan, bondscoach) als eindbaas en Skylar als rivaal in Story.
- Elke vechter heeft een **stijl-archetype**, 5 stats, 3 signatures, een super, een finisher en een AI-profiel.
- Archetypes: Compleet · Technicus · Counter-vechter · Infighter · Lowkick-specialist · Tank · Hoogtrapper · Snelheidsvechter · Allrounder · Spinner · Afstandsvechter.
- **Afstemmen met de dojo:** persoonlijkheden, stijlen en graden zijn een voorstel. Laat iedere vechter de eigen signature moves kiezen. Dat maakt het spel van hen. Voor kinderen is toestemming van de ouders nodig (zie §12).

---

## 6. Progressie

### 6.1 Graden (kyu/dan)

De speler begint als **10e kyu (oranje band)** en verdient **keiko-punten**:

| Actie | Punten |
|---|---|
| Wedstrijd gewonnen | 60 (+40 bij ippon, +20 in Story) |
| Wedstrijd verloren | 15 (Osu no seishin: doorzetten loont) |
| Toernooi gewonnen | +200 |
| Story uitgespeeld | +300 |

Gradenreeks: 10e kyu oranje → 9e (oranje, blauwe streep) → 8e blauw → 7e → 6e geel → 5e → 4e groen → 3e → 2e bruin → 1e (bruin, gouden streep) → **shodan** (zwart) → 2e dan → 3e dan. Elke promotie wordt gevierd met "Osu!" en een promotiescherm. Fase 2: een **examen**-wedstrijd per promotie (bijvoorbeeld 3 partijen achter elkaar, net als bij een echt examen).

### 6.2 Vrij te spelen

| Item | Hoe |
|---|---|
| Zwarte trainingsdogi | vanaf 5e kyu ✅ (in prototype) |
| Sensei Wesley speelbaar | Story uitspelen ✅ |
| Hokori Meiyo dojo-shirt (training) | 7e kyu (fase 2) |
| Wedstrijddogi met bondsembleem | toernooi winnen (fase 2) |
| Jubileumdogi / gouden band-borduursel | shodan (fase 2) |
| Arena: Dojo Hokori Meiyo | 3 toernooizeges (fase 2) |
| Arena: wintertraining strand | Story met 3 vechters (fase 2) |

### 6.3 Leaderboards en online ranking

- Lokaal bord (prototype).
- Fase 3: een **dojo-leaderboard** (alleen leden, via dojo-code), weekklassement en toernooiranking. Spelers verschijnen met een zelfgekozen bijnaam, niet automatisch met hun echte naam.

---

## 7. Arena's

| Arena | Beschrijving | Status |
|---|---|---|
| **Toernooihal** | sporthal met tatami 8×8, rode veiligheidszone, officials, jurytafel, tribunes met publiek, Hokori Meiyo- en Kyokushin-banners, wapperende dojovlaggen, boarding met logo | ✅ prototype |
| **Dojo Hokori Meiyo** | eigen dojo: spiegelwand, kamiza met portret en kanji-doek, zandzakken, dojo kun aan de muur, ochtendlicht | fase 2 |
| **Fuyu geiko** | wintertraining aan het strand bij zonsopgang, adem zichtbaar, golven | fase 2 |
| **Bondskampioenschap** | grote hal, 4 hoekscheidsrechters, schermen met close-ups, lichtshow bij de finale | fase 3 |

---

## 8. Kostuums

- Standaard: **witte Kyokushin-dogi** met korte mouwen (net onder de elleboog), met de **Kyokushin-kanji 極真** op de linkerborst en de **Hokori Meiyo-badge** eronder. Op de rug staat "DOJO HOKORI MEIYO".
- De band toont de graad van de vechter (met strepen). Dan-graden hebben gouden strepen.
- Aka/shiro-lint achter op de band, zoals in een echte wedstrijd.
- Fase 2: dojo-shirt, zwarte dogi, wedstrijddogi met bondsembleem, en een eigen bandkleur = graad van de speler.

---

## 9. Presentatie

### 9.1 Camera

| Moment | Camera |
|---|---|
| Ceremonie | langzame boog om de mat, van hoog naar ooghoogte |
| Gevecht | zijcamera (Tekken-stijl), zoomt mee met de afstand |
| Knock-down | lage close-up op de gevallen vechter, slow motion |
| Super | draaiende camera om de aanvaller, slow motion |
| Finisher | extreme slow motion (15%), flits, naam van de finisher in beeld |
| Uitslag | baan om de winnaar, scheidsrechter met de arm omhoog, vlaggen omhoog |

### 9.2 Impact

- Hit-stop (45 tot 90 ms), camera shake, vonken en zweetdruppels, een schokgolf-ring, een witte of oranje (counter) flits, stof van de tatami bij een val.
- Schade zichtbaar: hinken bij beenschade, ineenkrimpen bij rompschade. Fase 2: rode plekken op de scheen en dij, een zwetende huid en een gescheurde dogi-mouw als cosmetisch effect.

### 9.3 HUD

- Bovenaan: naam en hoek (AKA/SHIRO), ki-balk met vertraagde rode "schadebalk", waza-ari-stippen, chui/genten, beenschade en rompschade.
- Midden: klok, fase (HON-SEN / ENCHO-SEN), klein logo.
- Onderaan: kiai-meter in 3 segmenten. Bij een volle meter knippert de KIAI-knop.
- Grote scheidsrechtersteksten in het midden (romaji) met een Nederlandse ondertitel.

---

## 10. Audio

| Onderdeel | Prototype | Eindversie |
|---|---|---|
| Soundtrack | procedurele taiko-loop met een pentatonische pluk (miyako-bushi) | moderne martial-arts tracks met taiko, shakuhachi en shamisen over elektronische beats. Per arena een eigen track, plus een eindbaas-thema voor Sensei Wesley |
| Effecten | gesynthetiseerde treffers (scheen op dij klinkt anders dan een stoot op de romp), zwiepen, val, blok | foley-opnames: dogi-zwiep, scheen op pao, tatami-val |
| Kiai | gesynthetiseerde kreet | echte kiai's van de dojoleden, per vechter |
| Scheidsrechter | spraakstem van het toestel (ja-JP) | opnames van Sensei Wesley en Sensei Conchita ("Hajime!", "Yame!", "Ippon!"...) |
| Omroeper | spraakstem van het toestel (nl-NL) | Nederlandse omroeper bij intro, uitslag en promotie |
| Publiek | gefilterde ruis die aanzwelt | publieksopnames van een echt toernooi |

Stemopnames zet je neer volgens [assets/voice/README.md](../assets/voice/README.md). De sleutels staan in `src/data/terms.js`.

---

## 11. Branding: plaatsing van het logo

| Plek | Status |
|---|---|
| Splash (groot, fade-in, met kiai en Osu) | ✅ |
| Hoofdmenu (woordmerk en embleem) | ✅ |
| Pauzemenu en opties | ✅ |
| Laadschermen (met een Kyokushin-tip) | ✅ |
| Overwinnings- en verliesscherm | ✅ |
| HUD (klein, onder de klok) | ✅ |
| Arena: banners, groot logo aan de wand, boarding, wapperende vlaggen, jurytafel | ✅ |
| Dogi: badge onder de kanji, dojonaam op de rug | ✅ |
| Photo Mode-watermerk | ✅ |
| App-icoon | ✅ (192 en 512 px); iOS/Android-sets in fase 2 |

> **Het logo** is het officiële logo van de dojo: de Kanku-vorm in rood, de penseelkanji links, 誇り名誉 in het midden, de trappende vechter en "Dojo Hokori Meiyo" in penseelschrift. De aangeleverde versie was aan de linkerkant afgesneden. `tools/logo/complete-logo.py` maakt het scherp (alleen de drie logokleuren, 8× vergroot), geeft het meer ruimte en vult de drie afgesneden penseelstreken aan. Die aanvulling is een reconstructie. Heeft de ontwerper het originele bestand, dan gaat dat voor: vervang `tools/logo/logo-bron.png` en draai het script opnieuw.
> "Eer & Trots" staat niet in het logo zelf. De game gebruikt het als ondertitel naast het logo.

---

## 12. Echte personen, kinderen en rechten

- **Toestemming:** de game gebruikt de namen van echte dojoleden, onder wie minderjarigen. Vraag vóór publicatie schriftelijke toestemming van iedere vechter, en bij kinderen van de ouders. Laat iedere vechter de eigen persoonlijkheid, stijl en moves goedkeuren. De checklist staat onderaan [ROSTER.md](ROSTER.md#checklist-voor-de-dojo).
- **Uiterlijk:** het prototype gebruikt neutrale standaardfiguren. Lengte, bouw, huidskleur en haar stelt de dojo per persoon in (`uiterlijk` in `roster.js`), samen met de persoon zelf. Er worden geen foto's van kinderen in de app gebruikt zonder expliciete toestemming.
- **Positief neerzetten:** iedere vechter is sterk en sympathiek. Er zijn geen vernederende verlies-animaties: de verliezer staat op en groet.
- **Privacy (AVG):** leaderboards gebruiken bijnamen; er wordt geen persoonsdata verzameld zonder toestemming. Bij online functies komt er een privacyverklaring.
- **Kyokushin-naam en -kanji:** de naam en de kanji 極真 worden door meerdere organisaties gebruikt, soms als beschermd merk. Voor een publieke release in de app stores: vraag na bij de bond waar de dojo bij aangesloten is of gebruik in een game is toegestaan.
- **Font:** de kanji zijn gemaakt met het open-source font Yuji Boku (SIL Open Font License, zie `assets/fonts/`).

---

## 13. UI-flow

```
Splash (logo, Osu) ─► Hoofdmenu (demo-gevecht op de achtergrond)
   ├─ Toernooi ─► Vechterkeuze ─► Schema ─► Laden ─► Gevecht ─► Uitslag ─► Schema … ─► Kampioen
   ├─ Story    ─► Vechterkeuze ─► Ladder/VS ─► Laden ─► Gevecht ─► Uitslag ─► Ladder … ─► Sensei Wesley
   ├─ Versus   ─► Speler 1 ─► Speler 2 (CPU/toetsenbord) ─► Laden ─► Gevecht ─► Uitslag
   ├─ Training ─► Vechterkeuze ─► Laden ─► Training (pop-instellingen, technieken)
   └─ Opties
Gevecht ─► Pauze ─► Hervatten / Fotomodus / Technieken / Opties / Menu
```

---

## 14. Woordenlijst

| Term | Betekenis |
|---|---|
| Osu 押忍 | groet en houding: doorzetten onder druk |
| Kiai 気合 | strijdkreet die het lichaam aanspant |
| Hajime / Yame | begin / stop |
| Tsuzukete hajime | ga verder |
| Ippon / Waza-ari | volle punt (winst) / halve punt |
| Awasete ippon | twee waza-ari samen = ippon |
| Hantei | beslissing van de scheidsrechters |
| Hikiwake | gelijkspel |
| Encho-sen | verlenging |
| Chui / Genten / Hansoku | waarschuwing / strafpunt / diskwalificatie |
| Jogai | buiten het wedstrijdvlak |
| Shushin / Fukushin | hoofdscheidsrechter / hoekscheidsrechter |
| Aka / Shiro | rood / wit |
| Rei | groet (buiging) |
| Kamae | gevechtshouding |
| Seiken | vuist (de eerste twee knokkels) |
| Tsuki | stoot · *gyaku-tsuki* = stoot met de achterste hand · *shita-tsuki* = opwaartse stoot |
| Geri | trap · *mae* = voorwaarts · *mawashi* = rond · *ushiro* = achterwaarts · *kakato otoshi* = bijltrap |
| Hiza geri | kniestoot · *tobi hiza* = vliegende knie |
| Hiji-ate | elleboogstoot |
| Uke | wering · *gedan barai* = lage veegwering · *sune uke* = scheenblok |
| Jodan / Chudan / Gedan | hoog (hoofd) / midden (romp) / laag (benen) |
| Renzoku waza | combinatie van technieken |
| Kihon / Kata / Kumite | basis / vormen / vrij gevecht |
| Keiko | training |
| Kohai / Senpai / Sensei / Shihan | jongere leerling / oudere leerling / leraar / meester |
| Dogi / Obi | karatepak / band |
| Hyaku-nin kumite | honderd gevechten achter elkaar |

---

## 15. Roadmap

| Fase | Doel | Inhoud |
|---|---|---|
| **1. Prototype** ✅ | is het leuk en voelt het als Kyokushin? | speelbare web-build: 29 vechters (data), alle modi in basisvorm, regels, officials, logo overal |
| **2. Verticale slice** | hoe ziet de eindkwaliteit eruit? | 4 vechters met echte 3D-modellen en motion capture (Sensei Wesley, Skylar, Senpai Anjay, Djordy), de arena Dojo Hokori Meiyo, echte stemopnames, controller, Capacitor-builds via TestFlight en Play intern testen |
| **3. Content en online** | compleet spel | alle vechters gemodelleerd, Story met verhaal, kostuums, dojo-leaderboard, online versus |
| **4. Release** | stores | balans, toegankelijkheid, localisatie (NL/EN/JP), store-assets, IARC-rating, privacyverklaring |

## 16. Open vragen voor de dojo

1. ~~Officieel logo~~ ✅ ontvangen. Heeft de ontwerper een vectorbestand of een niet-afgesneden origineel? Zijn er huisstijlkleuren?
2. Bij welke bond is de dojo aangesloten, en welk reglement geldt (ellebogen, yuko, 2 of 4 hoekscheidsrechters, rondetijden per leeftijd)?
3. Mogen de dojoleden (en ouders) meedoen met hun naam? Willen ze zelf hun moves kiezen?
4. Willen Sensei Wesley en Sensei Conchita de scheidsrechterscommando's inspreken?
5. Is er een opname van een echte toernooisfeer (publiek, taiko) die we mogen gebruiken?
6. Wordt het een publieke app of eerst alleen voor de dojo (TestFlight en een interne Play-test)?
