// Laadt artwork via assets/manifest.json (gemaakt door tools/assets.py).
// index.html haalt het manifest op vóór het spel start; hier worden de bestanden in preload gezet.
// Een sleutel bestaat alleen als het bestand er is; code vraagt met TP.heeft(sleutel).
window.TP = window.TP || {};

TP.manifest = TP.manifest || { beelden: {}, audio: {} };

TP.NIET_LADEN = ['bos_tegels', 'ui_knoppen', 'ui_hud', 'ui_pijlen', 'ui_plekken', 'vos_delen', 'ui_plek_1', 'ui_plek_2', 'ui_plek_3', 'ui_plek_4'];

TP.heeft = sleutel => !!TP.manifest.beelden[sleutel];

// Roep aan in preload van de Boot-scene.
TP.zetInWachtrij = function (scene) {
  const m = TP.manifest;
  const loader = scene.load;
  loader.on('loaderror', f => console.warn('niet geladen:', f.key, f.src));
  // bronbladen waaruit tools/assets.py de losse stukken knipt; het spel zelf gebruikt ze niet
  for (const k of TP.NIET_LADEN) delete m.beelden[k];
  for (const [sleutel, info] of Object.entries(m.beelden)) {
    const url = 'assets/' + info.pad + '?v=' + (info.v || 0);
    if (info.frames) loader.spritesheet(sleutel, url, { frameWidth: info.w, frameHeight: info.h });
    else loader.image(sleutel, url);
  }
  for (const sleutel of TP.GELUIDEN.nodig()) if (m.audio[sleutel]) loader.audio('snd_' + sleutel, 'assets/' + m.audio[sleutel]);
};
