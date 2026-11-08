// Scheidsrechterscommando's en kreten. `kana` is wat de Japanse spraakstem uitspreekt,
// `nl` is de Nederlandse omroeper/ondertitel. Echte opnames (stemacteurs) vervangen dit later:
// bestandsnaam = assets/voice/<taal>/<sleutel>.mp3 (zie docs/TECH.md).
export const CALLS = {
  shomen_ni_rei: { romaji: 'Shomen ni rei!', kana: 'しょうめんに、れい', nl: 'Groet naar voren' },
  shushin_ni_rei: { romaji: 'Shushin ni rei!', kana: 'しゅしんに、れい', nl: 'Groet de scheidsrechter' },
  otagai_ni_rei: { romaji: 'Otagai ni rei!', kana: 'おたがいに、れい', nl: 'Groet elkaar' },
  kamaete: { romaji: 'Kamaete!', kana: 'かまえて', nl: 'Neem je houding aan' },
  hajime: { romaji: 'Hajime!', kana: 'はじめ！', nl: 'Begin!' },
  yame: { romaji: 'Yame!', kana: 'やめ！', nl: 'Stop!' },
  tsuzukete: { romaji: 'Tsuzukete hajime!', kana: 'つづけて、はじめ！', nl: 'Ga verder!' },
  waza_ari: { romaji: 'Waza-ari!', kana: 'わざあり！', nl: 'Halve punt!' },
  ippon: { romaji: 'Ippon!', kana: 'いっぽん！', nl: 'Volle punt, gewonnen!' },
  awasete: { romaji: 'Awasete Ippon!', kana: 'あわせて、いっぽん！', nl: 'Twee waza-ari: ippon!' },
  hantei: { romaji: 'Hantei!', kana: 'はんてい！', nl: 'Beslissing van de scheidsrechters' },
  hikiwake: { romaji: 'Hikiwake!', kana: 'ひきわけ', nl: 'Gelijkspel' },
  encho: { romaji: 'Encho-sen!', kana: 'えんちょうせん', nl: 'Verlenging' },
  aka_kachi: { romaji: 'Aka no kachi!', kana: 'あかの、かち', nl: 'Rood wint' },
  shiro_kachi: { romaji: 'Shiro no kachi!', kana: 'しろの、かち', nl: 'Wit wint' },
  chui: { romaji: 'Chui!', kana: 'ちゅうい', nl: 'Waarschuwing' },
  genten: { romaji: 'Genten!', kana: 'げんてん', nl: 'Strafpunt' },
  hansoku: { romaji: 'Hansoku!', kana: 'はんそく', nl: 'Diskwalificatie' },
  jogai: { romaji: 'Jogai!', kana: 'じょうがい', nl: 'Buiten de mat' },
  osu: { romaji: 'Osu!', kana: 'おす！', nl: 'Osu!' },
  kiai: { romaji: 'Kiai!', kana: 'えいっ！', nl: 'Kiai!' },
};
export const COUNT = ['いち', 'に', 'さん', 'し', 'ご', 'ろく', 'しち', 'はち', 'きゅう', 'じゅう'];
export const COUNT_ROMAJI = ['Ichi', 'Ni', 'San', 'Shi', 'Go', 'Roku', 'Shichi', 'Hachi', 'Ku', 'Ju'];

export const TIPS = [
  'Osu (押忍) betekent doorzetten onder druk. Je zegt het als groet, als bevestiging en als belofte.',
  'In Kyokushin-kumite zijn stoten naar het hoofd verboden. Trappen en knieën naar het hoofd mogen wel.',
  'Een waza-ari krijg je als de tegenstander korter dan drie seconden neergaat. Twee waza-ari = awasete ippon.',
  'Gedan mawashi geri: de lage trap op het bovenbeen. Stapel beenschade op tot de tegenstander niet meer kan staan.',
  'Sune uke: til je voorste knie op om een lage trap met je scheen op te vangen.',
  'Bij een gelijke stand na de reguliere tijd volgt encho-sen, een verlenging.',
  'Grijpen en vasthouden is een overtreding (chui). Twee chui worden één genten (strafpunt).',
  'Hokori Meiyo: eer en trots. Win met respect, verlies met opgeheven hoofd.',
  'Hyaku-nin kumite: honderd gevechten achter elkaar, de zwaarste beproeving in Kyokushin.',
  'Kiai komt uit je buik: het spant je lichaam aan op het moment van impact.',
];
