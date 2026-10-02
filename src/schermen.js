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
      TP.knop(this, x, 640, 500, 120, TP.BANEN[id].naam, () => this.scene.start('Vraag', { wereld: 'bos', baan: id }), 44).setDepth(5);
      this.add.text(x, 735, r && r > 10 ? 'Beste ronde: ' + r.toFixed(2) + ' s' : 'Nog geen record', knopStijl(24, '#ffd23f')).setOrigin(0.5).setDepth(5);
    });
    const hulp = [
      '← →  rennen        ↑  springen (2x = dubbel, tegen een muur = wall-jump)        ↓  bukken / sliden',
      'C  grijphaak (pakt plafonds en lianen)        X  item        V  schieten        Z  dash        R  opnieuw'
    ];
    this.add.text(W / 2, H - 150, hulp.join('\n'), { ...knopStijl(26), lineSpacing: 12 }).setOrigin(0.5).setDepth(5);
    this.add.text(W / 2, H - 50, 'Je speelt als vos tegen uil, bever en ijsbeer. Eerste met drie ronden wint.   M = muziek aan/uit', knopStijl(24, '#d9c9a8')).setOrigin(0.5).setDepth(5);
    this.add.text(W - 20, H - 12, 'Muziek: Kevin MacLeod (incompetech.com), CC BY 4.0', knopStijl(16, '#b8a888')).setOrigin(1, 1).setDepth(5);

    if (TP.heeft('vos_ref')) {
      const info = TP.manifest.beelden.vos_ref;
      const v = this.add.image(W - 330, H - 120, 'vos_ref').setOrigin(0.5, 1).setScale(520 / info.h).setDepth(5);
      this.tweens.add({ targets: v, y: H - 135, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Vraag', { wereld: 'bos', baan: 'bos1' }));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Vraag', { wereld: 'bos', baan: 'bos1' }));
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
    this.klaar = false; this.magDoor = false; this.gestart = false; this.tijd = 14; this.item = null;   // scene wordt hergebruikt: alles resetten
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
    this.uitleg = this.add.text(W / 2, 900, '', { ...knopStijl(30), wordWrap: { width: 1400 } }).setOrigin(0.5, 0).setDepth(6);
    this.input.keyboard.on('keydown', e => {
      if (!this.klaar && ['1', '2', '3'].includes(e.key)) this.antwoord(+e.key - 1);
      else if (this.klaar && this.magDoor && (e.code === 'Space' || e.code === 'Enter')) this.start();
    });
  }
  update(_, dms) {
    if (this.klaar) return;
    this.tijd -= dms / 1000;
    this.balk.width = Math.max(0, 1300 * this.tijd / 14);
    if (this.tijd <= 0) this.antwoord(-1);
  }
  antwoord(i) {
    if (this.klaar) return;
    this.klaar = true; this.balk.setVisible(false);
    const goed = i === this.vraag.goed;
    this.knoppen.forEach((k, n) => { k.list[0].disableInteractive(); if (!TP.heeft('ui_knop')) k.list[0].setFillStyle(n === this.vraag.goed ? 0x2e7d4f : n === i ? 0x8c3a2e : 0x5a3a1c); else k.list[0].setTint(n === this.vraag.goed ? 0x9bff9b : n === i ? 0xff9b9b : 0xaaaaaa); });
    let regel = (goed ? 'Goed!  ' : i < 0 ? 'Te laat.  ' : 'Niet goed.  ') + this.vraag.uitleg;
    this.geluid.speel(goed ? 'bevestig' : 'fout');
    if (goed) { this.item = Phaser.Utils.Array.GetRandom(Object.keys(TP.ITEMS)); regel += '\nJe start met: ' + TP.ITEMS[this.item].naam + '. ' + TP.ITEMS[this.item].uitleg; }
    this.uitleg.setText(regel + '\n\nSpatie om te starten');
    this.time.delayedCall(500, () => { this.magDoor = true; this.input.once('pointerdown', () => this.start()); });
  }
  start() { if (this.gestart) return; this.gestart = true; this.scene.start('Race', { ...this.opties, item: this.item }); }
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
