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
