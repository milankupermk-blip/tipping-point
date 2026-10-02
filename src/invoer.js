// Invoerbronnen. Elke bron geeft per fysicastap hetzelfde object terug:
// { x: -1..1, spring (net ingedrukt), springVast, slide, haak (vast), item (net), schiet (net), kracht (net) }
window.TP = window.TP || {};

TP.LegeInvoer = () => ({ x: 0, spring: false, springVast: false, slide: false, haak: false, item: false, schiet: false, kracht: false });

// Toetsenbord: pijltjes links/rechts lopen, pijltje omhoog springen, pijltje omlaag bukken (slide).
// Ook WASD en spatie/shift. Haak = C of K, item = X of J, schiet = V of L, kracht = Z of H.
TP.Toetsenbord = class {
  constructor(scene) {
    this.k = scene.input.keyboard.addKeys({
      links: 'LEFT', rechts: 'RIGHT', op: 'UP', neer: 'DOWN', a: 'A', d: 'D', w: 'W', s: 'S',
      spatie: 'SPACE', shift: 'SHIFT', c: 'C', kk: 'K', x: 'X', j: 'J', v: 'V', l: 'L', z: 'Z', h: 'H'
    });
    this.vorig = {};
    // toetsen die ingedrukt stonden bij een scenewissel of focusverlies blijven anders "aan" (bijvoorbeeld shift = sliden)
    scene.input.keyboard.resetKeys();
    const reset = () => scene.input.keyboard.resetKeys();
    window.addEventListener('blur', reset);
    scene.events.once('shutdown', () => window.removeEventListener('blur', reset));
  }
  net(naam, nu) { const r = nu && !this.vorig[naam]; this.vorig[naam] = nu; return r; }
  lees() {
    const k = this.k;
    const spring = k.spatie.isDown || k.op.isDown || k.w.isDown;
    return {
      x: (k.links.isDown || k.a.isDown ? -1 : 0) + (k.rechts.isDown || k.d.isDown ? 1 : 0),
      spring: this.net('spring', spring), springVast: spring,
      slide: k.neer.isDown || k.s.isDown || k.shift.isDown,
      haak: k.c.isDown || k.kk.isDown,
      item: this.net('item', k.x.isDown || k.j.isDown),
      schiet: this.net('schiet', k.v.isDown || k.l.isDown),
      kracht: this.net('kracht', k.z.isDown || k.h.isDown)
    };
  }
};
