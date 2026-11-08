// Technieken-bibliotheek. Eén bron van waarheid voor gameplay, AI, training en docs.
//
// Tijden in seconden: startup (tot de klap raakt), active (venster waarin hij raakt),
// recovery (herstel daarna). reach in meters, gemeten vanaf het midden van de vechter.
// target: jodan (hoofd), chudan (romp), gedan (benen).
// zone: welke schadeteller van de tegenstander oploopt (head/body/legs).
// foul: in het toernooireglement verboden, levert een chui (waarschuwing) op.
// Poses staan in src/game/poses.js; frames verwijzen ernaar.

export const MOVES = {
  // ── Tsuki (stoten). In Kyokushin alleen naar de romp. ──
  seiken_jab: {
    jp: 'Hidari Seiken Chudan Tsuki', nl: 'Voorste vuiststoot naar de romp', type: 'tsuki',
    target: 'chudan', zone: 'body', startup: 0.11, active: 0.08, recovery: 0.2,
    reach: 1.05, dmg: 5, push: 0.12, meter: 4,
    frames: [['guard', 0], ['jab', 0.11], ['jab', 0.19], ['guard', 0.39]],
    uitleg: 'Snelle stoot met de voorste vuist (seiken = de eerste twee knokkels). Opent combinaties.',
  },
  seiken_gyaku: {
    jp: 'Migi Seiken Chudan Gyaku-tsuki', nl: 'Achterste vuiststoot naar de romp', type: 'tsuki',
    target: 'chudan', zone: 'body', startup: 0.16, active: 0.08, recovery: 0.28,
    reach: 1.1, dmg: 9, push: 0.2, meter: 6,
    frames: [['guard', 0], ['gyaku', 0.16], ['gyaku', 0.24], ['guard', 0.52]],
    uitleg: 'Krachtstoot vanuit de heup. De basis van het Kyokushin-infight: stoten op de ribben en het middenrif.',
  },
  shita_tsuki: {
    jp: 'Shita-tsuki', nl: 'Opwaartse stoot naar de lever of maag', type: 'tsuki',
    target: 'chudan', zone: 'body', startup: 0.14, active: 0.08, recovery: 0.26,
    reach: 0.85, dmg: 8, push: 0.1, meter: 6, bodyBonus: 1.4,
    frames: [['guard', 0], ['shita', 0.14], ['shita', 0.22], ['guard', 0.48]],
    uitleg: 'Korte opwaartse stoot onder de ribben. Doet extra schade aan de romp.',
  },
  jodan_tsuki: {
    jp: 'Jodan Seiken Tsuki', nl: 'Vuiststoot naar het hoofd', type: 'tsuki',
    target: 'jodan', zone: 'head', startup: 0.15, active: 0.08, recovery: 0.3,
    reach: 1.1, dmg: 11, push: 0.2, meter: 6, foul: 'kao',
    frames: [['guard', 0], ['jodanTsuki', 0.15], ['jodanTsuki', 0.23], ['guard', 0.53]],
    uitleg: 'Verboden in een Kyokushin-wedstrijd (stoot naar het gezicht). Alleen in sommige specials en in de dojo-regels van Versus.',
  },
  hiji_ate: {
    jp: 'Mae Hiji-ate', nl: 'Elleboogstoot naar de romp', type: 'hiji',
    target: 'chudan', zone: 'body', startup: 0.13, active: 0.08, recovery: 0.3,
    reach: 0.7, dmg: 10, push: 0.15, meter: 7,
    frames: [['guard', 0], ['hiji', 0.13], ['hiji', 0.21], ['guard', 0.51]],
    uitleg: 'Elleboog op korte afstand. Let op: naar het hoofd is verboden, en niet elke bond staat ellebogen naar de romp toe.',
  },

  // ── Geri (trappen) ──
  mae_geri: {
    jp: 'Chudan Mae Geri', nl: 'Voorwaartse trap naar de buik', type: 'geri',
    target: 'chudan', zone: 'body', startup: 0.2, active: 0.1, recovery: 0.3,
    reach: 1.45, dmg: 9, push: 0.45, meter: 6,
    frames: [['guard', 0], ['maeChamber', 0.12], ['maeExt', 0.2], ['maeExt', 0.3], ['maeChamber', 0.42], ['guard', 0.6]],
    uitleg: 'Duwende trap met de bal van de voet (koshi). Houdt een aanstormende tegenstander op afstand.',
  },
  gedan_mawashi: {
    jp: 'Gedan Mawashi Geri', nl: 'Lage trap op het bovenbeen', type: 'geri',
    target: 'gedan', zone: 'legs', startup: 0.2, active: 0.1, recovery: 0.32,
    reach: 1.25, dmg: 7, legDmg: 16, push: 0.08, meter: 6,
    frames: [['guard', 0], ['gedanChamber', 0.1], ['gedanExt', 0.2], ['gedanExt', 0.3], ['guard', 0.62]],
    uitleg: 'Het handelsmerk van Kyokushin: een harde scheentrap op het bovenbeen. Stapelt beenschade op tot de tegenstander niet meer kan staan.',
  },
  chudan_mawashi: {
    jp: 'Chudan Mawashi Geri', nl: 'Ronde trap naar de ribben', type: 'geri',
    target: 'chudan', zone: 'body', startup: 0.24, active: 0.1, recovery: 0.34,
    reach: 1.35, dmg: 12, push: 0.25, meter: 8,
    frames: [['guard', 0], ['chudanChamber', 0.13], ['chudanExt', 0.24], ['chudanExt', 0.34], ['guard', 0.68]],
    uitleg: 'Ronde trap met de scheen tegen de ribben of onder de arm.',
  },
  jodan_mawashi: {
    jp: 'Jodan Mawashi Geri', nl: 'Ronde trap naar het hoofd', type: 'geri',
    target: 'jodan', zone: 'head', startup: 0.32, active: 0.1, recovery: 0.42,
    reach: 1.35, dmg: 18, push: 0.3, meter: 10, kdChance: 0.35,
    frames: [['guard', 0], ['jodanChamber', 0.18], ['jodanExt', 0.32], ['jodanExt', 0.42], ['guard', 0.84]],
    uitleg: 'Trap naar het hoofd. Traag en riskant, maar een schone treffer is vaak waza-ari of ippon.',
  },
  ushiro_geri: {
    jp: 'Ushiro Geri', nl: 'Draaiende achterwaartse trap', type: 'geri',
    target: 'chudan', zone: 'body', startup: 0.3, active: 0.1, recovery: 0.4,
    reach: 1.45, dmg: 16, push: 0.55, meter: 10, bodyBonus: 1.3,
    frames: [['guard', 0], ['ushiroTurn', 0.16], ['ushiroExt', 0.3], ['ushiroExt', 0.4], ['ushiroBack', 0.6], ['guard', 0.8]],
    uitleg: 'Je draait weg en stoot de hiel recht naar achteren in de maag. Gevaarlijk als counter.',
  },
  ushiro_mawashi: {
    jp: 'Ushiro Mawashi Geri', nl: 'Draaiende hiel naar het hoofd', type: 'geri',
    target: 'jodan', zone: 'head', startup: 0.36, active: 0.1, recovery: 0.45,
    reach: 1.4, dmg: 20, push: 0.3, meter: 12, kdChance: 0.45,
    frames: [['guard', 0], ['ushiroTurn', 0.18], ['uMawashiExt', 0.36], ['uMawashiExt', 0.46], ['ushiroBack', 0.66], ['guard', 0.91]],
    uitleg: 'De draaiende hieltrap naar het hoofd. Spectaculair, maar mis je, dan sta je met je rug naar de tegenstander.',
  },
  kakato_otoshi: {
    jp: 'Kakato Otoshi', nl: 'Bijltrap met de hiel', type: 'geri',
    target: 'jodan', zone: 'head', startup: 0.34, active: 0.1, recovery: 0.4,
    reach: 1.25, dmg: 19, push: 0.15, meter: 12, kdChance: 0.4,
    frames: [['guard', 0], ['kakatoUp', 0.24], ['kakatoDown', 0.34], ['kakatoDown', 0.44], ['guard', 0.84]],
    uitleg: 'Het been gaat hoog omhoog en de hiel valt neer op hoofd of sleutelbeen. Beroemd gemaakt door Kyokushin-kampioenen.',
  },
  hiza_geri: {
    jp: 'Hiza Geri', nl: 'Knie naar de romp', type: 'hiza',
    target: 'chudan', zone: 'body', startup: 0.17, active: 0.1, recovery: 0.3,
    reach: 0.8, dmg: 12, push: 0.2, meter: 8, bodyBonus: 1.2,
    frames: [['guard', 0], ['hiza', 0.17], ['hiza', 0.27], ['guard', 0.57]],
    uitleg: 'Knie op korte afstand. Zonder vast te pakken: grijpen is in Kyokushin een overtreding.',
  },
  tobi_hiza: {
    jp: 'Tobi Hiza Geri', nl: 'Vliegende knie', type: 'hiza',
    target: 'jodan', zone: 'head', startup: 0.3, active: 0.1, recovery: 0.45,
    reach: 1.15, dmg: 20, push: 0.3, meter: 12, kdChance: 0.45,
    frames: [['guard', 0], ['tobiPrep', 0.12], ['tobiHiza', 0.3], ['tobiHiza', 0.4], ['guard', 0.85]],
    uitleg: 'Een springende knie naar het hoofd. Toegestaan, maar met timing van een kampioen.',
  },

  // ── Uke (verdediging) ──
  uke: {
    jp: 'Jodan/Chudan Uke', nl: 'Dekking hoog en midden', type: 'uke', frames: [['block', 0]],
    uitleg: 'Ellebogen tegen de ribben, handen bij het gezicht. Vangt stoten en hoge trappen op, maar niet de lage trap.',
  },
  sune_uke: {
    jp: 'Sune Uke', nl: 'Scheenblok tegen de lage trap', type: 'uke', frames: [['suneUke', 0]],
    uitleg: 'Til de voorste knie op en vang de lage trap met je scheen. De aanvaller krijgt zelf beenschade.',
  },
  gedan_barai: {
    jp: 'Gedan Barai', nl: 'Lage veegwering', type: 'uke', frames: [['gedanBarai', 0]],
    uitleg: 'Klassieke lage wering met de onderarm; in kihon en kata de basis, in kumite tegen mae geri.',
  },
};

// Basisbesturing. Richting is relatief: "voor" = naar de tegenstander toe.
// Sleutel: knop + richting (n, f, b, d, u).
export const INPUT_MAP = {
  'tsuki.n': 'seiken_jab',
  'tsuki.f': 'seiken_gyaku',
  'tsuki.d': 'shita_tsuki',
  'tsuki.b': 'hiji_ate',
  'tsuki.u': 'seiken_gyaku',
  'geri.n': 'chudan_mawashi',
  'geri.d': 'gedan_mawashi',
  'geri.f': 'hiza_geri',      // op afstand wordt het mae geri, zie fighter.js
  'geri.b': 'ushiro_geri',
  'geri.u': 'jodan_mawashi',
};

// Combinaties (renzoku waza): na een treffer of blok kun je in het venster doorzetten.
export const CHAINS = {
  seiken_jab: { tsuki: 'seiken_gyaku', geri: 'gedan_mawashi' },
  seiken_gyaku: { tsuki: 'shita_tsuki', geri: 'gedan_mawashi' },
  shita_tsuki: { geri: 'jodan_mawashi', tsuki: 'seiken_gyaku' },
  gedan_mawashi: { geri: 'jodan_mawashi', tsuki: 'seiken_jab' },
  hiza_geri: { tsuki: 'seiken_gyaku', geri: 'hiza_geri' },
};

export function moveDuration(m) { return m.startup + m.active + m.recovery; }
