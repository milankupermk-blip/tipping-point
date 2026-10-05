// Schermen rond de race: Boot (laden), Menu, Vraag, Ronde (tussenstand), Einde.
window.TP = window.TP || {};

const knopStijl = (gr, kleur) => ({ fontFamily: TP.FONT, fontSize: gr + 'px', color: kleur || '#fff4dc', stroke: '#2a1a0c', strokeThickness: Math.round(gr / 7), align: 'center' });

TP.knop = function (scene, x, y, b, h, label, actie, grootte) {
  const heeft = TP.heeft('ui_knop');
  const c = scene.add.container(x, y);
  let vlak;
  if (heeft) { const i = TP.manifest.beelden.ui_knop; const r = i.h / h; vlak = scene.add.nineslice(0, 0, 'ui_knop', 0, b * r, i.h, 190, 190, 40, 40).setScale(1 / r); }
  else { vlak = scene.add.rectangle(0, 0, b, h, 0x5a3a1c, 0.92).setStrokeStyle(4, 0xf4d9a8); }
  const t = scene.add.text(0, 0, label, knopStijl(grootte || 34)).setOrigin(0.5);
  c.add([vlak, t]);
  vlak.setInteractive({ useHandCursor: true });
  vlak.on('pointerover', () => { scene.tweens.add({ targets: c, scale: 1.06, duration: 90 }); });
  vlak.on('pointerout', () => { scene.tweens.add({ targets: c, scale: 1, duration: 90 }); });
  vlak.on('pointerdown', () => { scene.geluid && scene.geluid.speel('klik'); actie(); });
  return c;
};

TP.paneel = function (scene, x, y, b, h) {
  if (TP.heeft('ui_paneel')) {
    const i = TP.manifest.beelden.ui_paneel; const r = Math.max(i.w / b, i.h / h, 0.5);
    const p = scene.add.nineslice(x, y, 'ui_paneel', 0, b * r, h * r, 200, 200, 110, 110).setScale(1 / r);
    scene.add.rectangle(x, y, b - 60, h - 60, 0x1d1208, 0.6).setDepth(p.depth);
    return p;
  }
  return scene.add.rectangle(x, y, b, h, 0x1d1208, 0.78).setStrokeStyle(4, 0x8a5a2a);
};

TP.achtergrond = function (scene, wereld) {
  const W = TP.W, H = TP.H;
  const w = TP.WERELDEN[wereld || 'bos'];
  const lagen = w.lagen.slice(0, 4);
  let geplaatst = 0;
  lagen.forEach((k, i) => {
    if (!TP.heeft(k)) return;
    const info = TP.manifest.beelden[k];
    const s = (H * 1.2) / info.h;
    const ts = scene.add.tileSprite(-W * 0.1, -H * 0.1, W * 1.2 / s + info.w, info.h, k).setOrigin(0).setScale(s).setDepth(i);
    scene.tweens.add({ targets: ts, tilePositionX: info.w, duration: 90000 * (1 + i * 0.6), repeat: -1 });
    geplaatst++;
  });
  if (!geplaatst) scene.add.rectangle(0, 0, W, H, 0x1a1008).setOrigin(0);
  scene.add.rectangle(0, 0, W, H, 0x120a04, 0.45).setOrigin(0).setDepth(4);
};

// Eenvoudig donker bord met houtkleurige rand (het sierpaneel heeft een te dikke rand voor veel inhoud).
TP.bord = function (scene, x, y, b, h, diepte) {
  const g = scene.add.graphics().setDepth(diepte);
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x - b / 2 + 8, y - h / 2 + 12, b, h, 28);
  g.fillStyle(0x1d1208, 0.97).fillRoundedRect(x - b / 2, y - h / 2, b, h, 28);
  g.lineStyle(8, 0x8a5a2a, 1).strokeRoundedRect(x - b / 2, y - h / 2, b, h, 28);
  g.lineStyle(2, 0xf4d9a8, 0.35).strokeRoundedRect(x - b / 2 + 12, y - h / 2 + 12, b - 24, h - 24, 20);
  return g;
};

// Schematische spelinstructies rond (cx, cy): bewegen, actie en doel. Gebruikt door het uitlegscherm en de pauze.
TP.tekenUitleg = function (scene, cx, cy, diepte) {
  const c = scene.add.container(0, 0).setDepth(diepte);
  const tekst = (x, y, t, gr, kleur) => { const o = scene.add.text(x, y, t, knopStijl(gr, kleur)).setOrigin(0.5); c.add(o); return o; };
  const toets = (x, y, label, b, gr) => {
    const w = b || 96, h = 96;
    const g = scene.add.graphics();
    g.fillStyle(0x2a1a0c, 1).fillRoundedRect(x - w / 2, y - h / 2 + 7, w, h, 16);
    g.fillStyle(0xf4e6c8, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    g.lineStyle(4, 0x8a5a2a, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    c.add(g);
    c.add(scene.add.text(x, y, label, { fontFamily: TP.FONT, fontSize: (gr || 48) + 'px', color: '#2a1a0c' }).setOrigin(0.5));
  };
  const kolom = 560;
  tekst(cx, cy - 370, 'ZO SPEEL JE', 64, '#ffd23f').setFontFamily(TP.FONT_TITEL);
  for (const x of [cx - kolom / 2, cx + kolom / 2]) c.add(scene.add.rectangle(x, cy - 30, 4, 520, 0x8a5a2a, 0.8));

  // 1. bewegen
  const bx = cx - kolom;
  tekst(bx, cy - 260, 'Bewegen', 44, '#ffd23f');
  toets(bx, cy - 150, '↑'); toets(bx - 108, cy - 42, '←'); toets(bx, cy - 42, '↓'); toets(bx + 108, cy - 42, '→');
  tekst(bx, cy + 70, '← →  rennen', 32);
  tekst(bx, cy + 125, '↑  springen  (2x = dubbel)', 32);
  tekst(bx, cy + 180, '↓  bukken', 32);

  // 2. actie: twee knoppen
  tekst(cx, cy - 260, 'Actie', 44, '#ffd23f');
  toets(cx, cy - 150, 'spatie', 320, 40);
  tekst(cx, cy - 70, 'VUUR', 44, '#ffd23f');
  tekst(cx, cy - 28, 'item gebruiken of eikel schieten', 24, '#d9c9a8');
  toets(cx, cy + 70, 'shift', 230, 40);
  tekst(cx, cy + 150, 'DASH', 44, '#ffd23f');
  tekst(cx, cy + 192, 'snelle sprint vooruit', 24, '#d9c9a8');

  // 3. doel: klein schema (vuur, vos, pijl) en drie regels
  const dx = cx + kolom;
  tekst(dx, cy - 260, 'Doel', 44, '#ffd23f');
  for (let i = 0; i < 5; i++) c.add(scene.add.rectangle(dx - 190 + i * 20, cy - 130, 20, 150, 0xff5a1f, 0.85 - i * 0.16));
  tekst(dx - 150, cy - 35, 'bosbrand', 24, '#ff9b6a');
  if (TP.heeft('vos_ref')) { const i = TP.manifest.beelden.vos_ref; c.add(scene.add.image(dx + 10, cy - 60, 'vos_ref').setOrigin(0.5, 1).setScale(140 / i.h)); }
  tekst(dx + 160, cy - 130, '➜', 80, '#ffd23f');
  ['Ren weg van de bosbrand en blijf in beeld.', 'Laatste die overblijft wint de ronde.', 'Eerste met 3 rondes wint.'].forEach((t, i) => {
    const o = tekst(dx, cy + 40 + i * 70, t, 28); o.setWordWrapWidth(470);
  });

  tekst(cx, cy + 300, 'P = pauze     M = muziek aan/uit', 26, '#d9c9a8');
  return c;
};

// Muziek: één spoor tegelijk, loopt door over scenes heen; M dempt alles (onthouden).
TP.muziek = function (scene, sleutel, volume) {
  const sm = scene.sound;
  if (TP.muziekSpoor && TP.muziekSpoor.key === sleutel && TP.muziekSpoor.isPlaying) return;
  if (TP.muziekSpoor) { TP.muziekSpoor.stop(); TP.muziekSpoor.destroy(); TP.muziekSpoor = null; }
  if (!scene.cache.audio.exists(sleutel)) return;
  TP.muziekSpoor = sm.add(sleutel, { loop: true, volume: volume || 0.4 });
  TP.muziekSpoor.play();
  sm.mute = TP.lees('tp_mute', false);
  if (!TP.muteToets) {
    TP.muteToets = true;
    scene.input.keyboard.on('keydown-M', () => { sm.mute = !sm.mute; TP.bewaar('tp_mute', sm.mute); });
  }
};

TP.bewaar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
TP.lees = (k, std) => { try { const v = localStorage.getItem(k); return v === null ? std : JSON.parse(v); } catch (e) { return std; } };

// ---------------------------------------------------------------- Boot
TP.Boot = class extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const p = 'assets/gratis/kenney_particle-pack/PNG (Transparent)/';
    this.load.image('p_rook', p + 'smoke_04.png');
    this.load.image('p_vonk', p + 'spark_04.png');
    this.load.image('p_streep', p + 'trace_01.png');
    this.load.image('p_ster', p + 'star_06.png');
    this.load.image('p_cirkel', p + 'circle_05.png');
    this.load.audio('muziek_menu', 'assets/muziek/menu_carefree.mp3');
    this.load.audio('muziek_race', 'assets/muziek/race_exhilarate.mp3');
    TP.zetInWachtrij(this);
    const W = TP.W, H = TP.H;
    this.add.rectangle(0, 0, W, H, 0x120a04).setOrigin(0);
    const t = this.add.text(W / 2, H / 2, 'Laden...', knopStijl(40)).setOrigin(0.5);
    this.load.on('progress', v => t.setText('Laden ' + Math.round(v * 100) + '%'));
  }
  create() {
    this.scene.start('Menu');
  }
};

// ---------------------------------------------------------------- Menu
TP.Menu = class extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    const W = TP.W, H = TP.H;
    this.geluid = new TP.Geluid(this);
    TP.muziek(this, 'muziek_menu', 0.45);
    TP.achtergrond(this, 'bos');
    if (TP.heeft('logo')) {
      const info = TP.manifest.beelden.logo;
      const l = this.add.image(W / 2, 250, 'logo').setScale(Math.min(900 / info.w, 420 / info.h)).setDepth(5);
      this.tweens.add({ targets: l, angle: { from: -1.5, to: 1.5 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else {
      this.add.text(W / 2, 220, 'TIPPING POINT', { fontFamily: TP.FONT_TITEL, fontSize: '150px', color: '#ffd23f', stroke: '#2a1a0c', strokeThickness: 18 }).setOrigin(0.5).setDepth(5);
    }
    this.add.text(W / 2, 470, 'Ren voor je leven. Wie achterblijft, wordt gepakt.', knopStijl(38)).setOrigin(0.5).setDepth(5);

    // baankeuze: één knop per baan van de wereld
    const banen = TP.WERELDEN.bos.banen;
    banen.forEach((id, i) => {
      const x = W / 2 + (i - (banen.length - 1) / 2) * 560;
      const r = TP.lees('tp_record_' + id, null);
      TP.knop(this, x, 640, 500, 120, TP.BANEN[id].naam, () => this.scene.start('Vraag', { wereld: 'bos', baan: id, uitleg: true }), 44).setDepth(5);
      this.add.text(x, 735, r && r > 10 ? 'Beste ronde: ' + r.toFixed(2) + ' s' : 'Nog geen record', knopStijl(24, '#ffd23f')).setOrigin(0.5).setDepth(5);
    });
    const hulp = ['← →  rennen      ↑  springen      ↓  bukken      Spatie  vuur      Shift  dash      P  pauze'];
    this.add.text(W / 2, H - 150, hulp.join('\n'), { ...knopStijl(26), lineSpacing: 12 }).setOrigin(0.5).setDepth(5);
    this.add.text(W / 2, H - 50, 'Je speelt als vos tegen uil, bever en ijsbeer. Eerste met drie ronden wint.   M = muziek aan/uit', knopStijl(24, '#d9c9a8')).setOrigin(0.5).setDepth(5);
    this.add.text(W - 20, H - 12, 'Muziek: Kevin MacLeod (incompetech.com), CC BY 4.0', knopStijl(16, '#b8a888')).setOrigin(1, 1).setDepth(5);

    if (TP.heeft('vos_ref')) {
      const info = TP.manifest.beelden.vos_ref;
      const v = this.add.image(W - 330, H - 120, 'vos_ref').setOrigin(0.5, 1).setScale(520 / info.h).setDepth(5);
      this.tweens.add({ targets: v, y: H - 135, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Vraag', { wereld: 'bos', baan: 'bos1', uitleg: true }));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Vraag', { wereld: 'bos', baan: 'bos1', uitleg: true }));
  }
};

// ---------------------------------------------------------------- Uitleg (na de vraag, aan het begin van een nieuw spel)
TP.Uitleg = class extends Phaser.Scene {
  constructor() { super('Uitleg'); }
  init(d) { this.opties = d; }
  create() {
    const W = TP.W, H = TP.H;
    this.geluid = new TP.Geluid(this);
    this.verder = false;   // scene wordt hergebruikt: resetten
    TP.achtergrond(this, this.opties.wereld);
    TP.bord(this, W / 2, H / 2, 1800, 1000, 5);
    TP.tekenUitleg(this, W / 2, H / 2 - 10, 6);
    const door = () => { if (this.verder) return; this.verder = true; this.scene.start('Race', { ...this.opties, uitleg: false }); };
    TP.knop(this, W / 2, H / 2 + 390, 600, 96, 'Start de race!  (spatie)', door, 34).setDepth(6);
    this.input.keyboard.on('keydown-SPACE', door);
    this.input.keyboard.on('keydown-ENTER', door);
  }
};

// ---------------------------------------------------------------- Pauze (over de stilgezette race heen)
TP.Pauze = class extends Phaser.Scene {
  constructor() { super('Pauze'); }
  create() {
    const W = TP.W, H = TP.H;
    this.geluid = new TP.Geluid(this);
    this.klaar = false;
    this.add.rectangle(0, 0, W, H, 0x0a0502, 0.72).setOrigin(0).setInteractive();   // vangt klikken op de race eronder af
    TP.bord(this, W / 2, H / 2, 1800, 1000, 5);
    TP.tekenUitleg(this, W / 2, H / 2 - 10, 6);
    this.add.text(W / 2 - 700, 92, 'PAUZE', { ...knopStijl(54, '#ffd23f'), fontFamily: TP.FONT_TITEL }).setOrigin(0.5).setDepth(6);
    TP.knop(this, W / 2 - 300, H / 2 + 390, 520, 96, 'Verder spelen  (P)', () => this.verder(), 34).setDepth(6);
    TP.knop(this, W / 2 + 300, H / 2 + 390, 520, 96, 'Naar menu', () => this.naarMenu(), 34).setDepth(6);
    ['keydown-P', 'keydown-ESC', 'keydown-ENTER'].forEach(k => this.input.keyboard.on(k, () => this.verder()));
  }
  verder() {
    if (this.klaar) return; this.klaar = true;
    if (TP.muziekSpoor && TP.muziekSpoor.isPaused) TP.muziekSpoor.resume();
    this.scene.resume('Race');
    this.scene.stop();
  }
  naarMenu() {
    if (this.klaar) return; this.klaar = true;
    this.scene.stop('Race');
    this.scene.start('Menu');
  }
};

// ---------------------------------------------------------------- Vraag vooraf
TP.Vraag = class extends Phaser.Scene {
  constructor() { super('Vraag'); }
  init(d) {
    this.opties = d;
    if (!d.stand) d.stand = { namen: ['Jij', 'Uil', 'Bever', 'IJsbeer'], punten: [0, 0, 0, 0], ronde: 1 };
  }
  create() {
    const W = TP.W, H = TP.H;
    this.geluid = new TP.Geluid(this);
    TP.achtergrond(this, this.opties.wereld);
    this.klaar = false; this.magDoor = false; this.gestart = false; this.tijd = TP.WEDSTRIJD.vraagTijd; this.item = null;   // scene wordt hergebruikt: alles resetten
    const gesteld = this.registry.get('gesteld') || [];
    const keuze = window.VRAGEN.filter((v, i) => !gesteld.includes(i));
    const index = window.VRAGEN.indexOf(Phaser.Utils.Array.GetRandom(keuze.length ? keuze : window.VRAGEN));
    gesteld.push(index); if (gesteld.length >= window.VRAGEN.length) gesteld.length = 0;
    this.registry.set('gesteld', gesteld);
    this.vraag = window.VRAGEN[index];

    TP.paneel(this, W / 2, H / 2 + 20, 1500, 900).setDepth(5);
    this.add.text(W / 2, 150, 'Ronde ' + this.opties.stand.ronde + '  ·  goed antwoord = item bij de start', knopStijl(32, '#ffd23f')).setOrigin(0.5).setDepth(6);
    this.add.text(W / 2, 270, this.vraag.v, { ...knopStijl(48), wordWrap: { width: 1340 } }).setOrigin(0.5).setDepth(6);
    this.knoppen = this.vraag.a.map((a, i) => TP.knop(this, W / 2, 440 + i * 130, 1300, 104, (i + 1) + '.  ' + a, () => this.antwoord(i), 32).setDepth(6));
    this.balk = this.add.rectangle(W / 2 - 650, 840, 1300, 16, 0xffd23f).setOrigin(0, 0.5).setDepth(6);
    this.teller = this.add.text(W / 2, 800, '', knopStijl(30, '#ffd23f')).setOrigin(0.5).setDepth(6);
    this.uitleg = this.add.text(W / 2, 900, '', { ...knopStijl(30), wordWrap: { width: 1400 } }).setOrigin(0.5, 0).setDepth(6);
    this.input.keyboard.on('keydown', e => {
      if (!this.klaar && ['1', '2', '3'].includes(e.key)) this.antwoord(+e.key - 1);
      else if (this.klaar && this.magDoor && (e.code === 'Space' || e.code === 'Enter')) this.start();
    });
  }
  update(_, dms) {
    if (this.klaar) return;
    this.tijd -= dms / 1000;
    this.balk.width = Math.max(0, 1300 * this.tijd / TP.WEDSTRIJD.vraagTijd);
    this.teller.setText('nog ' + Math.ceil(Math.max(0, this.tijd)) + ' seconden');
    if (this.tijd <= 0) this.antwoord(-1);
  }
  antwoord(i) {
    if (this.klaar) return;
    this.klaar = true; this.balk.setVisible(false); this.teller.setVisible(false);
    const goed = i === this.vraag.goed;
    this.knoppen.forEach((k, n) => { k.list[0].disableInteractive(); if (!TP.heeft('ui_knop')) k.list[0].setFillStyle(n === this.vraag.goed ? 0x2e7d4f : n === i ? 0x8c3a2e : 0x5a3a1c); else k.list[0].setTint(n === this.vraag.goed ? 0x9bff9b : n === i ? 0xff9b9b : 0xaaaaaa); });
    let regel = (goed ? 'Goed!  ' : i < 0 ? 'Te laat.  ' : 'Niet goed.  ') + this.vraag.uitleg;
    this.geluid.speel(goed ? 'bevestig' : 'fout');
    if (goed) { this.item = Phaser.Utils.Array.GetRandom(Object.keys(TP.ITEMS)); regel += '\nJe start met: ' + TP.ITEMS[this.item].naam + '. ' + TP.ITEMS[this.item].uitleg; }
    this.uitleg.setText(regel);
    // na het antwoord meteen door: knop, spatie of enter
    this.time.delayedCall(400, () => { this.magDoor = true; TP.knop(this, TP.W / 2, 830, 560, 90, this.opties.uitleg ? 'Verder  (spatie)' : 'Start de race  (spatie)', () => this.start(), 32).setDepth(7); });
  }
  start() { if (this.gestart) return; this.gestart = true; this.scene.start(this.opties.uitleg ? 'Uitleg' : 'Race', { ...this.opties, item: this.item }); }
};

// ---------------------------------------------------------------- Ronde (tussenstand)
TP.Ronde = class extends Phaser.Scene {
  constructor() { super('Ronde'); }
  init(d) { this.opties = d; }
  create() {
    const W = TP.W, H = TP.H, st = this.opties.stand;
    this.geluid = new TP.Geluid(this);
    TP.achtergrond(this, this.opties.wereld);
    const klaar = st.punten.findIndex(p => p >= TP.WEDSTRIJD.rondesNodig);
    TP.paneel(this, W / 2, H / 2, 1100, 700).setDepth(5);
    this.add.text(W / 2, H / 2 - 270, klaar >= 0 ? 'Wedstrijd voorbij' : 'Stand na ronde ' + st.ronde, knopStijl(54, '#ffd23f')).setOrigin(0.5).setDepth(6);
    const volgorde = st.namen.map((n, i) => i).sort((a, b) => st.punten[b] - st.punten[a]);
    volgorde.forEach((i, rij) => {
      const kleur = i === this.opties.winnaar ? '#9bff6a' : '#fff4dc';
      this.add.text(W / 2 - 380, H / 2 - 150 + rij * 90, st.namen[i], knopStijl(44, kleur)).setOrigin(0, 0.5).setDepth(6);
      this.add.text(W / 2 + 380, H / 2 - 150 + rij * 90, '●'.repeat(st.punten[i]) + '○'.repeat(TP.WEDSTRIJD.rondesNodig - st.punten[i]), knopStijl(44, kleur)).setOrigin(1, 0.5).setDepth(6);
    });
    if (klaar >= 0) {
      this.time.delayedCall(1600, () => this.scene.start('Einde', this.opties));
    } else {
      st.ronde++;
      this.add.text(W / 2, H / 2 + 260, 'Volgende ronde start vanzelf', knopStijl(28)).setOrigin(0.5).setDepth(6);
      this.time.delayedCall(2200, () => this.scene.start('Vraag', { wereld: this.opties.wereld, baan: this.opties.baan, stand: st }));
    }
  }
};

// ---------------------------------------------------------------- Einde
TP.Einde = class extends Phaser.Scene {
  constructor() { super('Einde'); }
  init(d) { this.opties = d; }
  create() {
    const W = TP.W, H = TP.H, st = this.opties.stand;
    this.geluid = new TP.Geluid(this);
    TP.achtergrond(this, this.opties.wereld);
    const winnaar = st.punten.indexOf(Math.max(...st.punten));
    const jij = winnaar === 0;
    TP.paneel(this, W / 2, H / 2, 1400, 800).setDepth(5);
    this.add.text(W / 2, H / 2 - 300, jij ? 'Jij wint de wedstrijd!' : st.namen[winnaar] + ' wint de wedstrijd', knopStijl(64, jij ? '#9bff6a' : '#ff9b6a')).setOrigin(0.5).setDepth(6);
    this.add.text(W / 2, H / 2 - 200, st.namen.map((n, i) => n + ' ' + st.punten[i]).join('   ·   '), knopStijl(36)).setOrigin(0.5).setDepth(6);
    this.add.text(W / 2, H / 2 - 40, Phaser.Utils.Array.GetRandom(window.FEITEN), { ...knopStijl(34, '#f4e4c4'), wordWrap: { width: 1200 } }).setOrigin(0.5).setDepth(6);
    TP.knop(this, W / 2 - 240, H / 2 + 260, 400, 100, 'Nog een keer', () => this.scene.start('Vraag', { wereld: this.opties.wereld, baan: this.opties.baan }), 36).setDepth(6);
    TP.knop(this, W / 2 + 240, H / 2 + 260, 400, 100, 'Menu', () => this.scene.start('Menu'), 36).setDepth(6);
    this.geluid.speel(jij ? 'winst' : 'verlies', { volume: 0.6 });
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Vraag', { wereld: this.opties.wereld, baan: this.opties.baan }));
  }
};
