// Wereld 1, baan 1: "Vuurlinie". Een gesloten circuit zoals in SpeedRunners:
// onderlangs naar rechts, aan de rechterkant omhoog klimmen, bovenlangs terug naar links, links weer omlaag.
// Drie routes: veilig (grond, vijanden en obstakels), gevaar (platforms en hellingen), expert (hoog, haak en wall-jumps).
// Cues zijn aanwijzingen voor bots: a = spring | dubbel | slide | haak | muur, vast = seconden vasthouden. x is lokaal in de looprichting.
window.TP = window.TP || {};
TP.BANEN = TP.BANEN || {};

(function () {
  const G = TP.GROND;
  const vlak = (x1, x2, y) => [x1, y, x2, y];
  const helling = (x1, y1, x2, y2) => [x1, y1, x2, y2];
  const plat = (x1, x2, y) => [x1, y, x2];

  // ---- stukken voor de horizontale benen
  const S = {
    start: { w: 2400,
      grond: [vlak(0, 2400, G)],
      kratten: [[1700, G - 60]],
      decor: [{ t: 'bos_obstakel_2', x: 300, y: G, laag: -1 }, { t: 'bos_obstakel_3', x: 2100, y: G, laag: 1 }],
      cues: {} },

    aanloop: { w: 1800,
      grond: [vlak(0, 1800, G)],
      platforms: [plat(500, 1100, G - 480), plat(1400, 1800, G - 640)],
      ankers: [[850, G - 780]],
      kratten: [[1300, G - 60]],
      decor: [{ t: 'bos_obstakel_2', x: 200, y: G, laag: -1 }],
      cues: { gevaar: [{ x: 380, a: 'dubbel', vast: 0.3 }, { x: 1250, a: 'spring', vast: 0.3 }], expert: [{ x: 380, a: 'dubbel', vast: 0.3 }, { x: 1250, a: 'spring', vast: 0.3 }] } },

    schans: { w: 3000,
      grond: [vlak(0, 900, G), helling(900, G, 1300, G - 200), vlak(1300, 1600, G - 200), vlak(1900, 2500, G - 120), helling(2500, G - 120, 2800, G), vlak(2800, 3000, G)],
      blokken: [[1600, G - 160, 300, 160 + 400]],
      platforms: [plat(1150, 1850, G - 520), plat(2450, 3000, G - 430)],
      ankers: [[2250, G - 760]],
      obstakels: [{ t: 'bos_obstakel_4', x: 2300, y: G - 120, w: 90, h: 60 }],
      cues: {
        gevaar: [{ x: 1500, a: 'spring', vast: 0.28 }],
        expert: [{ x: 820, a: 'dubbel', vast: 0.3 }, { x: 1700, a: 'spring', vast: 0.2 }, { x: 1800, a: 'haak', vast: 0.55 }]
      } },

    stam: { w: 2200,
      grond: [vlak(0, 2200, G)],
      blokken: [[800, G - 420, 320, 290]],   // onderkant op G-130: sliden past, staand niet
      platforms: [plat(1300, 1900, G - 560)],
      vijanden: [{ t: 'vijand_gifblob', x: 1700, y: G, bereik: 200 }],
      cues: {
        veilig: [{ x: 620, a: 'slide', vast: 0.55 }],
        gevaar: [{ x: 340, a: 'dubbel', vast: 0.3 }],
        expert: [{ x: 340, a: 'dubbel', vast: 0.3 }, { x: 1180, a: 'dubbel', vast: 0.3 }]
      } },

    schacht: { w: 2600,
      grond: [vlak(0, 2600, G)],
      blokken: [[440, G - 860, 140, 560], [800, G - 700, 160, 520]],
      platforms: [plat(1050, 1450, G - 700), plat(1700, 2150, G - 780)],
      ankers: [[1580, G - 1050], [2450, G - 1000]],
      obstakels: [{ t: 'bos_obstakel_1', x: 1400, y: G, w: 200, h: 90 }],
      cues: {
        // de schacht is voor spelers; bots lopen eronderdoor (slide) en springen daarna de platforms op
        gevaar: [{ x: 640, a: 'slide', vast: 0.6 }, { x: 1420, a: 'spring', vast: 0.28 }],
        expert: [{ x: 640, a: 'slide', vast: 0.6 }, { x: 1400, a: 'spring', vast: 0.2 }, { x: 1480, a: 'haak', vast: 0.5 }]
      } },

    // heuvel: eerst omhoog (traag), dan de lange afdaling waar de slide het snelst is. Boven: platform en haak als shortcut.
    afdaling: { w: 3200,
      grond: [vlak(0, 300, G), helling(300, G, 900, G - 420), vlak(900, 1150, G - 420), helling(1150, G - 420, 2500, G), vlak(2500, 3200, G)],
      platforms: [plat(500, 1100, G - 760)],
      ankers: [[1500, G - 1050]],
      boost: [[200, G, 1], [2700, G, 1]],
      vijanden: [{ t: 'vijand_gifblob', x: 2900, y: G, bereik: 200 }],
      kratten: [[1000, G - 480]],
      cues: {
        veilig: [{ x: 1180, a: 'slide', vast: 1.3 }],
        gevaar: [{ x: 1180, a: 'slide', vast: 1.3 }],
        expert: [{ x: 320, a: 'dubbel', vast: 0.3 }, { x: 1100, a: 'spring', vast: 0.2 }, { x: 1160, a: 'haak', vast: 0.6 }]
      } },

    stammen: { w: 2600,
      grond: [vlak(0, 2600, G)],
      platforms: [plat(400, 1000, G - 380), plat(1300, 1900, G - 380)],
      ankers: [[1150, G - 760], [2200, G - 790]],
      obstakels: [{ t: 'bos_obstakel_1', x: 700, y: G, w: 200, h: 90 }, { t: 'bos_obstakel_3', x: 1500, y: G, w: 120, h: 110 }],
      cues: {
        gevaar: [{ x: 220, a: 'spring', vast: 0.3 }, { x: 950, a: 'spring', vast: 0.3 }, { x: 1850, a: 'spring', vast: 0.2 }],
        expert: [{ x: 220, a: 'spring', vast: 0.3 }, { x: 900, a: 'spring', vast: 0.2 }, { x: 960, a: 'haak', vast: 0.5 }, { x: 1900, a: 'haak', vast: 0.5 }]
      } },

    ravijn: { w: 2800,
      grond: [vlak(0, 2800, G), helling(400, G, 700, G - 220), vlak(700, 1000, G - 220), vlak(1900, 2400, G - 300), helling(2400, G - 300, 2700, G)],
      ankers: [[1500, G - 760]],
      obstakels: [{ t: 'bos_obstakel_6', x: 1300, y: G, w: 140, h: 90 }, { t: 'bos_obstakel_4', x: 1800, y: G, w: 90, h: 60 }],
      vijanden: [{ t: 'vijand_zaagrobot', x: 2200, y: G, bereik: 260, snelheid: 160 }],
      cues: {
        gevaar: [{ x: 950, a: 'spring', vast: 0.3 }, { x: 1000, a: 'haak', vast: 0.6 }],
        expert: [{ x: 950, a: 'spring', vast: 0.3 }, { x: 1000, a: 'haak', vast: 0.6 }]
      } },

    trap: { w: 2600,
      grond: [vlak(0, 2600, G)],
      platforms: [plat(300, 700, G - 250), plat(700, 1100, G - 500), plat(1100, 1700, G - 750), plat(1900, 2500, G - 600)],
      ankers: [[1800, G - 1050]],
      vijanden: [{ t: 'vijand_zaagrobot', x: 900, y: G, bereik: 300, snelheid: 170 }],
      obstakels: [{ t: 'bos_obstakel_1', x: 1900, y: G, w: 200, h: 90 }],
      cues: {
        gevaar: [{ x: 150, a: 'spring', vast: 0.3 }, { x: 560, a: 'spring', vast: 0.3 }, { x: 980, a: 'spring', vast: 0.3 }, { x: 1650, a: 'spring', vast: 0.25 }],
        expert: [{ x: 150, a: 'spring', vast: 0.3 }, { x: 560, a: 'spring', vast: 0.3 }, { x: 980, a: 'spring', vast: 0.3 }, { x: 1650, a: 'haak', vast: 0.5 }]
      } },

    rechte: { w: 2600,
      grond: [vlak(0, 2600, G)],
      boost: [[900, G, 1]],
      kratten: [[500, G - 60], [1900, G - 420]],
      platforms: [plat(1600, 2200, G - 360)],
      vijanden: [{ t: 'vijand_smog', x: 1300, y: G - 330, bereik: 200, snelheid: 90, zweeft: true }],
      decor: [{ t: 'bos_obstakel_2', x: 2400, y: G, laag: -1 }],
      cues: { gevaar: [{ x: 1450, a: 'spring', vast: 0.3 }], expert: [{ x: 1450, a: 'spring', vast: 0.3 }] } },

    vallei: { w: 2600,
      grond: [vlak(0, 400, G), helling(400, G, 900, G + 200), vlak(900, 1400, G + 200), helling(1400, G + 200, 1900, G), vlak(1900, 2600, G)],
      platforms: [plat(600, 1150, G - 180), plat(1450, 1950, G - 180)],
      ankers: [[1300, G - 680]],
      obstakels: [{ t: 'bos_obstakel_6', x: 1150, y: G + 200, w: 160, h: 60 }],
      cues: {
        gevaar: [{ x: 420, a: 'spring', vast: 0.3 }, { x: 1120, a: 'spring', vast: 0.3 }],
        expert: [{ x: 420, a: 'spring', vast: 0.3 }, { x: 1100, a: 'spring', vast: 0.2 }, { x: 1150, a: 'haak', vast: 0.5 }]
      } },

    tunnel: { w: 2600,
      grond: [vlak(0, 2600, G)],
      blokken: [[400, G - 900, 1600, 600], [900, G - 300, 200, 180], [120, G - 1150, 140, 520]],
      platforms: [plat(2100, 2600, G - 700)],
      ankers: [[2300, G - 1050]],
      vijanden: [{ t: 'vijand_gifblob', x: 1500, y: G, bereik: 200 }],
      cues: {
        veilig: [{ x: 700, a: 'slide', vast: 0.5 }],
        gevaar: [{ x: 700, a: 'slide', vast: 0.5 }],
        expert: [{ x: 60, a: 'spring', vast: 0.3 }, { x: 150, a: 'muur', vast: 0.3 }, { x: 300, a: 'muur', vast: 0.3 }, { x: 1950, a: 'spring', vast: 0.3 }]
      } },

    finish: { w: 2000,
      grond: [vlak(0, 2000, G)],
      boost: [[600, G, 1]],
      kratten: [[1400, G - 60]],
      decor: [{ t: 'bos_obstakel_3', x: 1000, y: G, laag: 1 }],
      cues: {} }
  };

  // ---- de klim aan de rechterkant: platforms zigzag omhoog, expert wall-jumpt door de smalle schacht rechts
  const klim = { w: 1950, h: 1500, richtingX: 1, marge: 200, schacht: [1570, 1800],   // x-bereik van de wall-jump-schacht
    waypoints: [500, 800, 800, 800, 800, 800],   // per niveau (vloer, L1..L5): waar bots gaan staan om naar het volgende niveau te springen
    grond: [vlak(0, 1950, 1500)],
    blokken: [[0, 0, 150, 1000], [1800, 0, 150, 1500], [1450, 0, 120, 1250], [1800, -420, 300, 420]],   // laatste: stootrand rechtsboven
    platforms: [plat(150, 900, 1250), plat(700, 1450, 1000), plat(150, 900, 750), plat(700, 1450, 500), plat(150, 900, 250)],
    ankers: [[1100, 850], [500, 400]],
    vijanden: [{ t: 'vijand_smog', x: 800, y: 1120, bereik: 160, snelheid: 80, zweeft: true }],
    cues: {} };

  // ---- de afdaling aan de linkerkant: springen van platform naar platform, naar links
  const daal = { w: 2000, h: 1500, richtingX: -1, marge: 200,
    platforms: [plat(1500, 2600, 350), plat(700, 1600, 750), plat(0, 900, 1150)],
    ankers: [[1200, 520], [500, 950]],
    vijanden: [{ t: 'vijand_smog', x: 1200, y: 950, bereik: 200, snelheid: 90, zweeft: true }],
    kratten: [[1100, 690]],
    cues: {} };

  // ---- baan 2: "Kaalslag": de steilere stukken (schans, schacht, heuvel, trap)
  TP.BANEN.bos2 = {
    naam: 'Kaalslag', wereld: 'bos',
    start: { x: 1100, y: 2600 },
    benen: [
      // links moet eindigen boven de afdaling (x = 350 + 2000): links = rechts - 400
      { type: 'rechts', x: 0, y: 2600, stukken: [S.aanloop, S.schans, S.schacht, S.start, S.afdaling, S.ravijn] },   // 15800 breed
      { type: 'klim', x: 15800, y: 1100, stuk: klim },
      { type: 'links', x: 17750, y: 1100, stukken: [S.finish, S.trap, S.rechte, S.schans, S.stammen, S.tunnel] },   // 15400 breed, eindigt op x=2350
      { type: 'daal', x: 350, y: 1100, stuk: daal }
    ]
  };

  TP.BANEN.bos1 = {
    naam: 'Vuurlinie', wereld: 'bos',
    start: { x: 1100, y: 2600 },   // open grond in de aanloop, vóór de omgevallen stam
    benen: [
      // links moet eindigen boven de afdaling (x = 1550 + 2000): links = rechts - 1600
      { type: 'rechts', x: 0, y: 2600, stukken: [S.aanloop, S.stam, S.schans, S.stammen, S.afdaling, S.ravijn, S.schacht] },   // 18200 breed
      { type: 'klim', x: 18200, y: 1100, stuk: klim },
      { type: 'links', x: 20150, y: 1100, stukken: [S.rechte, S.vallei, S.trap, S.tunnel, S.start, S.finish, S.aanloop] },      // 16600 breed, eindigt op x=3550
      { type: 'daal', x: 1550, y: 1100, stuk: daal }
    ]
  };
})();
