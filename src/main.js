// Start van het spel. Scenes staan in src/schermen.js en src/race.js.
window.spel = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'spel',
  backgroundColor: '#120a04',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: TP.W, height: TP.H },
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: 'high-performance' },
  fps: { target: 120, min: 30 },
  scene: [TP.Boot, TP.Menu, TP.Uitleg, TP.Vraag, TP.Race, TP.Ronde, TP.Einde, TP.Pauze]
});
window.addEventListener('resize', () => spel.scale.refresh());
// M = muziek en geluid aan/uit, in elk scherm (ook in de pauze); onthouden voor de volgende keer
// (de opgeslagen stand is de bron: spel.sound.mute loopt via WebAudio een fractie achter en is direct na het zetten nog oud)
window.addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat) { const uit = !TP.lees('tp_mute', false); TP.bewaar('tp_mute', uit); spel.sound.mute = uit; } });
