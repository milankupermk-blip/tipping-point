// Invoerbronnen. Elke bron geeft per fysicastap hetzelfde object terug:
// { x: -1..1, spring (net ingedrukt), springVast, slide, haak (vast), item (net), schiet (net), kracht (net) }
window.TP = window.TP || {};

TP.LegeInvoer = () => ({ x: 0, spring: false, springVast: false, slide: false, haak: false, item: false, schiet: false, kracht: false });

// Toetsenbord: pijltjes links/rechts lopen, omhoog springen, omlaag bukken (slide). WASD werkt ook.
// Spatie = vuur: gebruikt je item als je er een hebt, anders een eikelschot. Shift = dash.
TP.Toetsenbord = class {
  constructor(scene) {
    this.k = scene.input.keyboard.addKeys({
      links: 'LEFT', rechts: 'RIGHT', op: 'UP', neer: 'DOWN', a: 'A', d: 'D', w: 'W', s: 'S',
      vuur: 'SPACE', dash: 'SHIFT', c: 'C'
    });
    this.vorig = {};
    // toetsen die ingedrukt stonden bij een scenewissel of focusverlies blijven anders "aan"
    scene.input.keyboard.resetKeys();
    const reset = () => scene.input.keyboard.resetKeys();
    window.addEventListener('blur', reset);
    scene.events.once('shutdown', () => window.removeEventListener('blur', reset));
  }
  net(naam, nu) { const r = nu && !this.vorig[naam]; this.vorig[naam] = nu; return r; }
  lees(renner) {
    const k = this.k;
    const spring = k.op.isDown || k.w.isDown;
    const vuur = this.net('vuur', k.vuur.isDown);
    const metItem = !!(renner && renner.item);
    return {
      x: (k.links.isDown || k.a.isDown ? -1 : 0) + (k.rechts.isDown || k.d.isDown ? 1 : 0),
      spring: this.net('spring', spring), springVast: spring,
      slide: k.neer.isDown || k.s.isDown,
      haak: TP.HAAK && k.c.isDown,
      item: vuur && metItem,
      schiet: vuur && !metItem,
      kracht: this.net('kracht', k.dash.isDown)
    };
  }
};
