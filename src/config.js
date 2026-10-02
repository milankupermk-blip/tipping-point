// Alle afstemknoppen op één plek. Eenheden: pixels en seconden, bij een interne resolutie van 1920x1080.
window.TP = window.TP || {};

TP.W = 1920;
TP.H = 1080;
TP.STAP = 1 / 120;          // vaste fysicastap
TP.FONT = "'Lilita One', 'Trebuchet MS', sans-serif";
TP.FONT_TITEL = "'Titan One', 'Trebuchet MS', sans-serif";

TP.FYS = {
  // lopen: snel op snelheid, scherp keren en stoppen zodra je loslaat
  versnelling: 4200, keren: 8000, topsnelheid: 1000, rem: 4200,
  // lucht: strakke boog, veel controle; loslaten in de lucht remt af (anders drijf je door)
  zwaartekracht: 3600, zwaartekrachtVast: 1800, valMax: 2200, luchtSturing: 3000, luchtRem: 1400,
  // springen
  sprong: 1300, dubbeleSprong: 1150, vastTijd: 0.18, coyote: 0.1, buffer: 0.14,
  // muur
  muurGlij: 340, muurSprongOp: 1100, muurSprongAf: 820, muurKleef: 0.08,
  // slide
  slideRem: 150, slideHoogte: 0.5, slideBergafBonus: 1.4,
  // hellingen: deel van de zwaartekrachtcomponent dat meetelt
  hellingKracht: 0.7,
  // haak: ver bereik, nauwelijks demping, loslaten geeft vaart
  haakBereik: 1150, haakTouwMin: 120, haakDemping: 0.999, haakLosBonus: 1.15, haakTrek: 0,
  // schade
  verdoving: 0.6, klapSnelheid: 0.3, hupje: 700,
  // boost
  boostplaat: 1600, boostplaatTijd: 0.9, rakelingsBonus: 1.08, rakelingsTijd: 0.4, rakelingsAfstand: 14,
  // dash (vos)
  dashSnelheid: 1700, dashTijd: 0.35, dashAfkoel: 7
};

// Hitbox van een renner, voeten op (x, y).
TP.RENNER = { breedte: 84, hoogte: 200 };

TP.CAMERA = { vooruit: 340, volgX: 11, volgY: 7, zoomMin: 0.3, zoomMax: 0.45, zoomSnelheid: 0.9, frontMarge: 0 };

TP.FRONT = { basisSnelheid: 420, perRonde: 40, aantrek: 0.9 };

TP.ROLLEN = {
  vos:     { naam: 'Vos',     kracht: 'dash',   tint: 0xffffff },
  uil:     { naam: 'Uil',     kracht: 'zicht',  tint: 0xd9c9a0 },
  bever:   { naam: 'Bever',   kracht: 'dam',    tint: 0xa87850 },
  ijsbeer: { naam: 'IJsbeer', kracht: 'beuk',   tint: 0xcfe0ff }
};

TP.ITEMS = {
  raket:    { naam: 'Eikelraket', uitleg: 'Raakt de eerste tegenstander voor je.' },
  val:      { naam: 'Honingval',  uitleg: 'Wie erin stapt, wordt traag.' },
  olie:     { naam: 'Olieplas',   uitleg: 'Wie erover rent, verliest grip.' },
  peper:    { naam: 'Chilipeper', uitleg: 'Twee seconden turbo.' },
  schild:   { naam: 'Bladschild', uitleg: 'De eerste klap telt niet.' },
  sneeuwbal:{ naam: 'Sneeuwbal',  uitleg: 'Bevriest de tegenstander voor je.' },
  magneet:  { naam: 'Magneet',    uitleg: 'Trekt je naar het dichtstbijzijnde ankerpunt.' }
};

TP.WERELDEN = {
  bos: {
    naam: 'Bosbrand', front: 'Vuurmuur', frontKleur: 0xff5a1f, gloed: 0xff8a2a,
    vonken: [0xffd23f, 0xff7a1a, 0xff3b1f], lagen: ['bos_lucht', 'bos_ver', 'bos_midden', 'bos_dichtbij', 'bos_voor'],
    tegels: 'bos_tegels', banen: ['bos1', 'bos2']
  }
};

TP.WEDSTRIJD = { rondesNodig: 3, bots: 3 };

// Moeilijkheid. Bots: vaardigheid 0.6 .. 0.95. Inhalen: snelheidsbonus voor de speler als die achter de koploper ligt.
// Camera: hoeveel het beeld naar de speler meeschuift als die achterligt (deel van de beeldbreedte).
TP.NIVEAU = {
  bots: [0.74, 0.66, 0.6],
  inhalen: [[1600, 1.25], [900, 1.15], [400, 1.07]],
  botsVoorSpeler: [[1400, 0.82], [700, 0.9], [300, 0.96]],
  cameraNaarSpeler: 0.28,
  // de camera volgt alleen wie nog meedoet: niet verder dan dit achter de koploper (langs het circuit) en niet langer vast dan vastTijd s
  cameraAchterstand: 5000, vastTijd: 3,
  klapSpeler: 0.6
};
