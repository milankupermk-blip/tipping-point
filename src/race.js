// De race: circuit, renners, camera die de koploper volgt, het front aan de rand waar de meute vandaan komt,
// items, vijanden, HUD. Wie uit beeld raakt, is gepakt.
window.TP = window.TP || {};

const RENNER_SCHAAL_HOOGTE = 200;   // beeldhoogte van een staand personage in px

TP.Race = class extends Phaser.Scene {
  constructor() { super('Race'); }

  init(data) {
    this.opties = data;
    this.wereld = TP.WERELDEN[data.wereld];
    this.baanDef = TP.BANEN[data.baan];
    this.stand = data.stand;              // {namen: [], punten: [], ronde}
  }

  create() {
    this.tijd = 0; this.acc = 0; this.fase = 'aftel'; this.aftel = 2.6; this.rondeTijd = 0;
    this.debug = false;
    this.geluid = new TP.Geluid(this);
    this.schaal = {};
    this.projectielen = [];
    this.wereldObjecten = []; this.camerasKlaar = false;
    this.maakAchtergrond();
    this.laagBaan = this.wereldObject(this.add.layer().setDepth(5));
    this.laagObjecten = this.wereldObject(this.add.layer().setDepth(6));
    this.laagRenners = this.wereldObject(this.add.layer().setDepth(8));
    this.laagFx = this.wereldObject(this.add.layer().setDepth(9));
    this.baan = new TP.Baan(this, this.baanDef);
    this.wereldOnder = Math.max(...this.baan.grond.map(s => Math.max(s.y1, s.y2))) + 700;
    this.tekenBaan();
    this.maakRenners();
    this.maakFront();
    this.maakParticles();
    this.maakHud();
    this.debugG = this.wereldObject(this.add.graphics().setDepth(7).setVisible(false));
    this.touw = this.wereldObject(this.add.graphics().setDepth(8));
    this.maakCameras();
    this.input.keyboard.on('keydown-F3', () => { this.debug = !this.debug; this.debugG.setVisible(this.debug); });
    this.input.keyboard.on('keydown-ESC', () => this.pauzeer());
    this.input.keyboard.on('keydown-P', () => this.pauzeer());
    // na de pauze: toetsen die tijdens de pauze zijn losgelaten niet als ingedrukt blijven zien
    this.events.on('resume', () => this.input.keyboard.resetKeys());
    // R: meteen opnieuw (zelfde ronde, zelfde item), zonder vraag
    this.input.keyboard.on('keydown-R', () => { this.geluid.stopVuur(); this.scene.restart(this.opties); });
    const cam = this.cameras.main;
    cam.setZoom(TP.CAMERA.zoomMin);
    cam.centerOn(this.speler.x + 500, this.speler.y - 300);
    this.frontKant = -1; this.frontAlpha = 1; this.frontKantBeeld = undefined; this.frontX = undefined;
    this.rondeNr = 0; this.spelerUitSinds = 0; this.laatsteStuk = -1;
    TP.muziek(this, 'muziek_race', 0.35);
    this.input.keyboard.on('keydown-M', () => { this.sound.mute = !this.sound.mute; TP.bewaar('tp_mute', this.sound.mute); });
  }

  pauzeer() {
    if (!this.scene.isActive()) return;
    if (TP.muziekSpoor && TP.muziekSpoor.isPlaying) TP.muziekSpoor.pause();
    this.scene.launch('Pauze');
    this.scene.pause();
  }

  // Drie camera's: achtergrond (vast), wereld (zoomt en volgt), interface (vast). Alles wat in de wereld staat
  // moet via wereldObject() worden aangemeld, anders tekenen de andere camera's het er dubbel overheen.
  maakCameras() {
    const W = TP.W, H = TP.H;
    this.camWereld = this.cameras.main;
    this.camAchter = this.cameras.add(0, 0, W, H, false, 'achter');
    this.camUi = this.cameras.add(0, 0, W, H, false, 'ui');
    // achtergrond moet als eerste tekenen
    const lijst = this.cameras.cameras;
    lijst.splice(lijst.indexOf(this.camAchter), 1); lijst.unshift(this.camAchter);
    this.camAchter.setBackgroundColor('#120a04');
    this.camWereld.transparent = true;
    this.camUi.transparent = true;
    const achter = this.lagen.map(l => l.ts);
    const ui = [this.hud, this.front, this.gloed];
    this.camWereld.ignore(achter.concat(ui));
    this.camAchter.ignore(ui);
    this.camUi.ignore(achter);
    for (const o of this.wereldObjecten) { this.camAchter.ignore(o); this.camUi.ignore(o); }
    this.camerasKlaar = true;
  }

  wereldObject(o) {
    if (!o) return o;
    this.wereldObjecten.push(o);
    if (this.camerasKlaar) { this.camAchter.ignore(o); this.camUi.ignore(o); }
    return o;
  }

  // ---------------------------------------------------------------- opbouw
  maakAchtergrond() {
    const W = TP.W, H = TP.H;
    this.lagen = [];
    // Elke laag is precies één kopie hoog (geen verticale herhaling), horizontaal herhaald.
    const defs = [
      { k: this.wereld.lagen[0], f: 0.0, d: 0, y: 0, hoog: 1.3, top: -0.15 },
      { k: this.wereld.lagen[1], f: 0.15, d: 1, y: 0.03, hoog: 1.25, top: -0.1 },
      { k: this.wereld.lagen[2], f: 0.35, d: 2, y: 0.07, hoog: 1.25, top: -0.08 },
      { k: this.wereld.lagen[3], f: 0.55, d: 3, y: 0.1, hoog: 1.3, top: -0.1, alpha: 0.55 }
    ];   // geen voorgrondbladeren in de race: de baan moet leesbaar blijven, zoals in SpeedRunners
    for (const d of defs) {
      if (!TP.heeft(d.k)) continue;
      const info = TP.manifest.beelden[d.k];
      const schaal = (H * d.hoog) / info.h;
      const ts = this.add.tileSprite(0, 0, W * 1.3 / schaal, info.h, d.k).setOrigin(0, 0).setScrollFactor(0).setDepth(d.d).setScale(schaal);
      ts.setPosition(-W * 0.15, H * d.top);
      if (d.alpha) ts.setAlpha(d.alpha);
      this.lagen.push({ ts, f: d.f, fy: d.y, schaal, basisY: H * d.top });
    }
    this.gloed = this.add.rectangle(0, 0, W, H, this.wereld.gloed, 0).setOrigin(0).setScrollFactor(0).setDepth(13);
  }

  maakRenners() {
    this.renners = [];
    const st = this.baanDef.start;
    const rollen = ['vos', 'uil', 'bever', 'ijsbeer'];
    const vaardigheden = TP.NIVEAU.bots;
    this.speler = new TP.Renner(this, { id: 0, rol: 'vos', naam: 'Jij', speler: true, invoer: new TP.Toetsenbord(this), x: st.x, y: st.y, item: this.opties.item || null });
    this.renners.push(this.speler);
    for (let i = 0; i < TP.WEDSTRIJD.bots; i++) {
      const rol = rollen[(i + 1) % rollen.length];
      const bot = new TP.Bot(this, vaardigheden[i % vaardigheden.length]);
      this.renners.push(new TP.Renner(this, { id: i + 1, rol, speler: false, invoer: bot, x: st.x - 120 * (i + 1), y: st.y }));
    }
    for (const r of this.renners) { r.p = this.baan.voortgang(r.x, r.y, r); r.vooruit = r.p; }
  }

  maakRennerBeeld(r) {
    const rol = r.rol;
    const refKey = TP.heeft(rol + '_ref') ? rol + '_ref' : TP.heeft('vos_ref') ? 'vos_ref' : null;
    const beeld = { sprite: null, schaduw: null, naam: null, huidig: null, rol: refKey ? (TP.heeft(rol + '_ref') ? rol : 'vos') : null };
    if (!refKey) return beeld;
    const info = TP.manifest.beelden[refKey];
    const schaal = RENNER_SCHAAL_HOOGTE / info.h;
    this.schaal[rol] = schaal;
    beeld.schaduw = this.wereldObject(this.add.ellipse(r.x, r.y, 110, 26, 0x000000, 0.28).setDepth(7));
    beeld.sprite = this.add.sprite(r.x, r.y, refKey).setOrigin(0.5, 1).setScale(schaal);
    this.laagRenners.add(beeld.sprite);
    const p = beeld.rol;
    if (TP.heeft(p + '_ren') && !this.anims.exists(p + '_ren')) {
      this.anims.create({ key: p + '_ren', frames: this.anims.generateFrameNumbers(p + '_ren'), frameRate: 14, repeat: -1 });
    }
    if (!TP.heeft(rol + '_ref') && rol !== 'vos') beeld.tint = TP.ROLLEN[rol].tint;
    beeld.naam = this.wereldObject(this.add.text(r.x, r.y - 175, r.isSpeler ? 'JIJ' : r.naam, { fontFamily: TP.FONT, fontSize: r.isSpeler ? '34px' : '26px', color: r.isSpeler ? '#ffd23f' : '#fff4dc', stroke: '#2a1a0c', strokeThickness: 6 }).setOrigin(0.5).setDepth(10));
    if (r.isSpeler) {
      // duidelijk wie jij bent: gouden pijl boven je hoofd en een gouden gloed onder je voeten
      beeld.pijl = this.wereldObject(this.add.triangle(r.x, r.y - 230, 0, 0, 44, 0, 22, 30, 0xffd23f).setStrokeStyle(4, 0x2a1a0c).setOrigin(0.5, 0).setDepth(10));
      beeld.gloed = this.wereldObject(this.add.ellipse(r.x, r.y, 150, 40, 0xffd23f, 0.35).setDepth(7));
      beeld.schaduw.setFillStyle(0x000000, 0.2);
    }
    return beeld;
  }

  maakFront() {
    // Geen vlammenzee: de schermrand is de dood. Wel een hittegloed met vonken zodat je voelt waar de rand is.
    const H = TP.H;
    this.front = this.add.container(0, 0).setDepth(11).setScrollFactor(0);
    const g = this.add.graphics();
    const breedte = 90;
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      g.fillStyle(this.wereld.frontKleur, 0.45 * (1 - t) * (1 - t));
      g.fillRect(-breedte + i * (breedte / 24), 0, breedte / 24 + 1, H);
    }
    this.frontGloed = g;
    this.front.add(g);
    this.frontBeeld = null;
  }

  maakParticles() {
    const heeft = k => this.textures.exists(k);
    this.fx = {};
    if (heeft('p_rook')) {
      this.fx.stof = this.add.particles(0, 0, 'p_rook', { lifespan: 500, speed: { min: 20, max: 120 }, angle: { min: 200, max: 340 }, scale: { start: 0.25, end: 0.6 }, alpha: { start: 0.5, end: 0 }, tint: 0xd8c3a0, emitting: false }).setDepth(7);
      this.fx.slideStof = this.add.particles(0, 0, 'p_rook', { lifespan: 400, speed: { min: 40, max: 90 }, angle: { min: 160, max: 200 }, scale: { start: 0.15, end: 0.45 }, alpha: { start: 0.45, end: 0 }, tint: 0xd8c3a0, emitting: false }).setDepth(7);
      this.fx.rook = this.add.particles(0, 0, 'p_rook', { lifespan: 1600, speedX: { min: 60, max: 220 }, speedY: { min: -260, max: -80 }, scale: { start: 0.9, end: 2.2 }, alpha: { start: 0.5, end: 0 }, tint: [0x2a1a14, 0x4a2a1a], emitting: false }).setDepth(10);
    }
    if (heeft('p_vonk')) {
      this.fx.vonken = this.add.particles(0, 0, 'p_vonk', { lifespan: { min: 500, max: 1100 }, speedX: { min: 120, max: 520 }, speedY: { min: -420, max: -60 }, gravityY: 260, scale: { start: 0.35, end: 0 }, tint: this.wereld.vonken, blendMode: 'ADD', emitting: false }).setDepth(10);
      this.fx.inslag = this.add.particles(0, 0, 'p_vonk', { lifespan: 350, speed: { min: 150, max: 420 }, scale: { start: 0.4, end: 0 }, tint: [0xfff1b0, 0xffb347], blendMode: 'ADD', emitting: false }).setDepth(9);
      this.fx.boost = this.add.particles(0, 0, 'p_vonk', { lifespan: 300, speedX: { min: -500, max: -200 }, speedY: { min: -40, max: 40 }, scale: { start: 0.3, end: 0 }, tint: [0xfff1b0, 0x9bff6a], blendMode: 'ADD', emitting: false }).setDepth(7);
    }
    if (heeft('p_streep')) {
      this.fx.strepen = this.add.particles(0, 0, 'p_streep', { lifespan: 220, speedX: { min: -900, max: -600 }, scale: { start: 0.6, end: 0.1 }, alpha: { start: 0.5, end: 0 }, emitting: false }).setDepth(7);
    }
    for (const e of Object.values(this.fx)) this.wereldObject(e);
    for (const k of ['fx_vuur', 'fx_stof', 'fx_inslag', 'fx_explosie', 'fx_boost']) {
      if (TP.heeft(k) && !this.anims.exists(k)) this.anims.create({ key: k, frames: this.anims.generateFrameNumbers(k), frameRate: k === 'fx_vuur' ? 14 : 18, repeat: k === 'fx_vuur' ? -1 : 0 });
    }
  }

  speelFx(naam, x, y, schaal) {
    if (!TP.heeft(naam)) return;
    const s = this.add.sprite(x, y, naam).setOrigin(0.5, 0.8).setScale(schaal || 0.3).setDepth(9);
    this.laagFx.add(s);
    s.play(naam);
    s.once('animationcomplete', () => s.destroy());
  }

  maakHud() {
    const W = TP.W, H = TP.H;
    const stijl = (gr, kleur) => ({ fontFamily: TP.FONT, fontSize: gr + 'px', color: kleur || '#fff4dc', stroke: '#2a1a0c', strokeThickness: Math.round(gr / 6) });
    this.hud = this.add.container(0, 0).setDepth(20).setScrollFactor(0);
    const voeg = o => { this.hud.add(o); return o; };
    const paneel = (x, y, b, h, smal) => {
      const k = smal && TP.heeft('ui_paneel_smal') ? 'ui_paneel_smal' : TP.heeft('ui_paneel') ? 'ui_paneel' : null;
      if (!k) return voeg(this.add.rectangle(x, y, b, h, 0x1d1208, 0.7).setStrokeStyle(3, 0x8a5a2a));
      const i = TP.manifest.beelden[k]; const r = Math.max(i.w / b, i.h / h, 0.6);
      const n = voeg(this.add.nineslice(x, y, k, 0, b * r, h * r, 170, 170, 90, 90).setScale(1 / r));
      voeg(this.add.rectangle(x, y, b - 50, h - 44, 0x1d1208, 0.55));
      return n;
    };
    const slot = (x, y, d) => {
      if (TP.heeft('ui_rond')) { const i = TP.manifest.beelden.ui_rond; return voeg(this.add.image(x, y, 'ui_rond').setScale(d / i.h)); }
      return voeg(this.add.circle(x, y, d / 2, 0x5a3a1c, 0.9).setStrokeStyle(3, 0xf4d9a8));
    };

    // onderbalk: item, dash, plek, tijd
    paneel(W / 2, H - 78, 1180, 150, true);
    slot(W / 2 - 440, H - 80, 118);
    this.hudItemBeeld = voeg(this.add.image(W / 2 - 440, H - 84, 'vos_ref').setVisible(false));
    this.hudItemTekst = voeg(this.add.text(W / 2 - 340, H - 100, '', stijl(26, '#ffd23f')).setOrigin(0, 0.5));
    this.hudItemHint = voeg(this.add.text(W / 2 - 340, H - 66, 'X  item', stijl(20, '#d9c9a8')).setOrigin(0, 0.5));
    slot(W / 2 - 120, H - 80, 118);
    this.hudDashSchaduw = voeg(this.add.graphics());
    this.hudDashTekst = voeg(this.add.text(W / 2 - 120, H - 84, 'DASH', stijl(22)).setOrigin(0.5));
    voeg(this.add.text(W / 2 - 20, H - 100, 'Dash', stijl(26, '#ffd23f')).setOrigin(0, 0.5));
    this.hudDashSub = voeg(this.add.text(W / 2 - 20, H - 66, 'Z  klaar', stijl(20, '#d9c9a8')).setOrigin(0, 0.5));
    this.hudPlek = voeg(this.add.text(W / 2 + 230, H - 84, '1e', stijl(64)).setOrigin(0.5));
    this.hudPlekSub = voeg(this.add.text(W / 2 + 230, H - 36, '', stijl(20, '#d9c9a8')).setOrigin(0.5));
    this.hudTijd = voeg(this.add.text(W / 2 + 470, H - 92, '0.00', stijl(44)).setOrigin(0.5));
    this.hudRondje = voeg(this.add.text(W / 2 + 470, H - 44, '', stijl(20, '#d9c9a8')).setOrigin(0.5));

    // linksboven: stand van de wedstrijd
    paneel(300, 70, 560, 100, true);
    this.hudStand = voeg(this.add.text(300, 70, '', { ...stijl(24), align: 'center' }).setOrigin(0.5));
    // rechtsboven: snelheid
    this.hudSnelheid = voeg(this.add.text(W - 250, 30, '', stijl(26)).setOrigin(1, 0));
    voeg(TP.knop(this, W - 110, 52, 180, 72, 'II  Pauze', () => this.pauzeer(), 26));
    this.hudRonde = voeg(this.add.text(W / 2, 30, '', stijl(24, '#ffd23f')).setOrigin(0.5, 0));

    this.hudMelding = voeg(this.add.text(W / 2, H * 0.36, '', { fontFamily: TP.FONT_TITEL, fontSize: '150px', color: '#fff4dc', stroke: '#2a1a0c', strokeThickness: 14 }).setOrigin(0.5).setAlpha(0));
    this.hudTussen = voeg(this.add.text(W / 2, H * 0.5, '', stijl(34, '#9bff6a')).setOrigin(0.5).setAlpha(0));

    // tips voor de eerste races
    this.tipsGezien = TP.lees('tp_tips', 0);
    this.tips = null;   // scene wordt hergebruikt: geen tips van de vorige race laten doorlopen
    if (this.tipsGezien < 3) {
      this.tipPaneel = paneel(W / 2, 150, 760, 90, true);
      this.tipTekst = voeg(this.add.text(W / 2, 150, '', stijl(28)).setOrigin(0.5));
      this.tips = ['Pijltjes links en rechts: rennen. Pijltje omhoog: springen, 2x = dubbele sprong', 'Pijltje omlaag: bukken en sliden onder lage takken. Bergaf is sliden het snelst.', 'Houd C vast bij een plafond of liaan: grijphaak. Loslaten geeft vaart.', 'Spring tegen een muur en spring opnieuw: wall-jump.', 'Wie opzij uit beeld raakt, is gepakt. Blijf bij de koploper.', 'Z: dash. X: item uit een krat gebruiken.'];
      this.tipIndex = -1; this.tipTimer = 0;
      TP.bewaar('tp_tips', this.tipsGezien + 1);
    }
    this.toonMelding('Klaar...', 1.0);
    this.hudRonde.setText('Ronde ' + this.stand.ronde + '  ·  eerste met ' + TP.WEDSTRIJD.rondesNodig + ' wint');
  }

  toonMelding(tekst, duur, grootte) {
    const b = (grootte || 110) / 150;
    this.hudMelding.setText(tekst).setAlpha(1).setScale(1.25 * b);
    this.hudTussen.setAlpha(0);
    this.tweens.killTweensOf(this.hudMelding);
    this.tweens.add({ targets: this.hudMelding, scale: b, duration: 180, ease: 'Back.Out' });
    this.tweens.add({ targets: this.hudMelding, alpha: 0, delay: duur * 1000, duration: 300 });
  }

  toonTussentijd(tekst) {
    this.hudTussen.setText(tekst).setAlpha(1);
    this.tweens.killTweensOf(this.hudTussen);
    this.tweens.add({ targets: this.hudTussen, alpha: 0, delay: 1400, duration: 400 });
  }

  // ---------------------------------------------------------------- het circuit in beeld
  tekenBaan() {
    for (const s of this.baan.grond) { if (!s.blokTop) this.tekenGrond(s); }
    for (const b of this.baan.blokken) this.tekenBlok(b);
    for (const a of this.baan.ankers) {
      if (TP.heeft('bos_obstakel_5')) {
        const info = TP.manifest.beelden['bos_obstakel_5'];
        a.sprite = this.add.image(a.x, a.y - 30, 'bos_obstakel_5').setOrigin(0.5, 0.08).setScale(150 / info.h);
        this.laagObjecten.add(a.sprite);
        this.tweens.add({ targets: a.sprite, angle: { from: -4, to: 4 }, duration: 1600 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }
    for (const o of this.baan.objecten) this.maakObjectBeeld(o);
  }

  // Tegelt textuur k over een rechthoek van b x h wereldpixels. (px, py) is het draaipunt, (ox, oy) de linkerbovenhoek
  // ten opzichte daarvan vóór het draaien. patroonX/Y: waar in de rechthoek het patroon begint (voor een wereldvast patroon).
  // Losse beelden in plaats van een tileSprite: een tileSprite maakt per stuk een eigen canvas en textuur aan, wat bij
  // elke rondestart seconden kost en veel videogeheugen. Losse beelden delen één textuur.
  tegelVlak(k, px, py, ox, oy, b, h, schaal, o = {}) {
    const info = TP.manifest.beelden[k];
    const tw = info.w * schaal, th = info.h * schaal;
    const cos = Math.cos(o.hoek || 0), sin = Math.sin(o.hoek || 0);
    const beelden = [];
    const u0 = -(((o.patroonX || 0) % tw) + tw) % tw, v0 = -(((o.patroonY || 0) % th) + th) % th;
    for (let v = v0; v < h - 0.01; v += th) {
      for (let u = u0; u < b - 0.01; u += tw) {
        const lx = ox + u, ly = oy + v;
        const img = this.add.image(px + cos * lx - sin * ly, py + sin * lx + cos * ly, k).setOrigin(0, 0).setScale(schaal);
        if (o.hoek) img.setRotation(o.hoek);
        if (o.flipX) img.setFlipX(true);
        if (o.tint !== undefined) img.setTint(o.tint);
        const cx = Math.max(0, -u), cy = Math.max(0, -v);
        const cw = Math.min(tw, b - u) - cx, ch = Math.min(th, h - v) - cy;
        if (cx > 0 || cy > 0 || cw < tw - 0.01 || ch < th - 0.01) img.setCrop(cx / schaal, cy / schaal, cw / schaal, ch / schaal);
        this.laagBaan.add(img);
        beelden.push(img);
      }
    }
    return beelden;
  }

  tekenGrond(s) {
    const lengte = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    const k = s.oneWay ? 'tegel_platform' : 'tegel_grond';
    if (!TP.heeft(k)) return;
    const info = TP.manifest.beelden[k];
    const hoog = s.oneWay ? 70 : 120;
    const schaal = hoog / info.h;
    s.beelden = this.tegelVlak(k, s.x1, s.y1, 0, -0.18 * hoog, lengte, hoog, schaal, { hoek: s.hoek });
    if (s.oneWay) {
      // uiteinden van een zwevend platform
      for (const [kant, x, flip] of [['tegel_platform_links', s.x1, false], ['tegel_platform_rechts', s.x2, true]]) {
        if (!TP.heeft(kant)) continue;
        const ki = TP.manifest.beelden[kant];
        const ks = (hoog * 1.15) / ki.h;
        const e = this.add.image(x, s.y1 - hoog * 0.18, kant).setOrigin(flip ? 0.15 : 0.85, 0.1).setScale(ks);
        this.laagBaan.add(e);
      }
      return;
    }
    if (TP.heeft('tegel_vulling')) {
      const vi = TP.manifest.beelden['tegel_vulling'];
      const vs = 256 / vi.h;
      const stap = s.y1 === s.y2 ? Infinity : 128;   // vlak: één stuk; helling: smalle kolommen die de helling volgen
      // onderste niveau krijgt diepe grond; hogere niveaus zijn een dikke plaat zodat je eronderdoor kunt kijken
      const laagste = Math.max(s.y1, s.y2) > this.wereldOnder - 900;
      const bodem = Math.min(this.wereldOnder - 300, Math.max(s.y1, s.y2) + (laagste ? 380 : 200));
      for (let x = s.x1; x < s.x2; x += stap) {
        const b = Math.min(stap, s.x2 - x);
        const y = TP.Baan.hoogteOp(s, Math.min(x + b / 2, s.x2)) + hoog * 0.6;
        // vulling donkerder dan de loopstrook, zodat platforms en randen opvallen
        this.tegelVlak('tegel_vulling', x, y, 0, 0, b, Math.max(1, bodem - y), vs, { patroonX: x, patroonY: y, tint: 0x8a7a66 });
      }
    }
  }

  tekenBlok(b) {
    if (!TP.heeft('tegel_vulling')) return;
    const vi = TP.manifest.beelden['tegel_vulling'];
    const vs = 256 / vi.h;
    b.beelden = this.tegelVlak('tegel_vulling', b.x, b.y, 0, 0, b.w, b.h, vs, { patroonX: b.x, patroonY: b.y, tint: 0x9a8a74 });
    if (TP.heeft('tegel_muur')) {
      const mi = TP.manifest.beelden['tegel_muur'];
      const ms = 110 / mi.w;
      this.tegelVlak('tegel_muur', b.x, b.y, 0, 0, mi.w * ms, b.h, ms);
      this.tegelVlak('tegel_muur', b.x + b.w, b.y, -mi.w * ms, 0, mi.w * ms, b.h, ms, { flipX: true });
    }
    if (TP.heeft('tegel_plafond') && b.h > 200) {
      const pi = TP.manifest.beelden['tegel_plafond'];
      const ps = 90 / pi.h;
      this.tegelVlak('tegel_plafond', b.x, b.y + b.h, 0, -0.75 * pi.h * ps, b.w, pi.h * ps, ps);
    }
    if (TP.heeft('tegel_grond')) {
      const gi = TP.manifest.beelden['tegel_grond'];
      const gs = 120 / gi.h;
      this.tegelVlak('tegel_grond', b.x, b.y, 0, -0.18 * gi.h * gs, b.w, gi.h * gs, gs);
    }
  }

  maakObjectBeeld(o) {
    let k = null, hoogte = 110;
    if (o.type === 'boost') { k = TP.heeft('bos_boostplaat') ? 'bos_boostplaat' : null; hoogte = 60; }
    else if (o.type === 'krat') { k = TP.heeft('item_krat') ? 'item_krat' : TP.heeft('bos_krat') ? 'bos_krat' : null; hoogte = 90; }
    else if (o.type === 'obstakel' || o.type === 'decor') { k = TP.heeft(o.t) ? o.t : null; hoogte = o.h || 140; if (o.type === 'decor') hoogte = o.hoogte || 180; }
    else if (o.type === 'vijand') { k = TP.heeft(o.t) ? o.t : null; hoogte = o.h || 120; }
    else if (o.type === 'val') { k = TP.heeft('item_' + o.t) ? 'item_' + o.t : null; hoogte = 50; }
    if (!k) return;
    const info = TP.manifest.beelden[k];
    const s = hoogte / info.h;
    const spr = this.add.image(o.x, o.y, k).setOrigin(0.5, 1).setScale(s);
    if (o.type === 'obstakel' || o.type === 'vijand') { o.w = Math.max(o.w, spr.displayWidth * 0.8); o.h = Math.max(o.h, spr.displayHeight * 0.9); }
    if (o.type === 'decor') { this.wereldObject(spr); spr.setDepth(o.laag < 0 ? 4 : 10).setAlpha(o.laag < 0 ? 0.9 : 1); if (o.laag < 0) spr.setScale(s * 0.9).setTint(0xbbaa99); }
    else this.laagObjecten.add(spr);
    if (o.type === 'boost') { spr.setOrigin(0.5, 0.85).setFlipX(o.richting < 0); this.tweens.add({ targets: spr, alpha: { from: 1, to: 0.65 }, duration: 350, yoyo: true, repeat: -1 }); }
    if (o.type === 'krat') this.tweens.add({ targets: spr, y: o.y - 14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    o.sprite = spr;
    o.schaal = s;
  }

  // ---------------------------------------------------------------- spel-acties
  gebruikItem(r) {
    const item = r.item; r.item = null;
    if (r.isSpeler) this.toonTussentijd(TP.ITEMS[item].naam + '!');
    const doel = this.renners.filter(a => a !== r && !a.dood && a.vooruit > r.vooruit).sort((a, b) => a.vooruit - b.vooruit)[0];
    this.geluid.speel('item');
    if (item === 'raket') {
      const p = { x: r.x + 40 * r.richting, y: r.y - 80, vx: r.richting * (Math.max(Math.abs(r.vx), 600) + 900), van: r, leven: 2.6, raket: true, doel: doel || null };
      p.sprite = this.maakProjectielBeeld(p);
      this.projectielen.push(p);
    } else if (item === 'peper') { r.boost(2.0); }
    else if (item === 'schild') { r.schild = true; }
    else if (item === 'sneeuwbal') { const doelen = this.renners.filter(a => a !== r && !a.dood && a.vooruit > r.vooruit && a.vooruit - r.vooruit < 1500); for (const d of doelen) { d.t.bevroren = 0.8; d.meld('bevroren'); this.speelFx('fx_inslag', d.x, d.y - 70, 0.45); if (d.isSpeler) this.toonMelding('Bevroren door ' + r.naam + '!', 1.0, 70); } this.cameras.main.flash(250, 160, 220, 255); if (r.isSpeler) this.toonTussentijd(doelen.length ? doelen.length + ' tegenstander(s) bevroren!' : 'Niemand voor je om te bevriezen'); }
    else if (item === 'magneet') { r.t.magneet = 1.5; }
    else if (item === 'val' || item === 'olie') {
      const o = { type: 'val', t: item, x: r.x - 80 * r.richting, x0: r.x, y: r.y, w: 150, h: 40, levend: true, van: r, armTijd: 0.6 };
      this.baan.objecten.push(o); this.maakObjectBeeld(o);
    }
  }

  maakProjectielBeeld(p) {
    const k = p.raket ? 'item_raket' : 'item_eikel';
    if (TP.heeft(k)) return this.wereldObject(this.add.image(p.x, p.y, k).setScale((p.raket ? 80 : 36) / TP.manifest.beelden[k].h).setDepth(9));
    // eigen tekening: gloeiende eikel
    return this.wereldObject(this.add.circle(p.x, p.y, p.raket ? 22 : 12, p.raket ? 0xff9a3c : 0xffd23f).setStrokeStyle(4, 0x3a2412).setDepth(9));
  }

  schiet(r) {
    if (r.t.schot > 0) return;
    r.t.schot = 0.5;
    const p = { x: r.x + 30 * r.richting, y: r.y - r.hoogte * 0.6, vx: r.richting * (Math.abs(r.vx) + 1300), van: r, leven: 0.7, raket: false };
    p.sprite = this.maakProjectielBeeld(p);
    this.projectielen.push(p);
    r.meld('schiet');
  }

  valtUitBeeld(r) {
    r.x = r.laatsteGrondX !== undefined ? r.laatsteGrondX : r.x; r.y = r.laatsteGrondY !== undefined ? r.laatsteGrondY - 2 : r.y;
    r.vy = 0; r.vx = 0; r.opGrond = false; r.haak = null;
    r.t.verdoofd = 0.7; r.meld('klap');
  }

  // ---------------------------------------------------------------- hoofdlus
  update(_, dms) {
    const dt = Math.min(dms / 1000, 0.05);
    if (this.fase === 'aftel') {
      const v = this.aftel; this.aftel -= dt;
      if (v > 1.9 && this.aftel <= 1.9) { this.toonMelding('3', 0.5, 140); this.geluid.speel('tel'); }
      if (v > 1.3 && this.aftel <= 1.3) { this.toonMelding('2', 0.5, 140); this.geluid.speel('tel'); }
      if (v > 0.7 && this.aftel <= 0.7) { this.toonMelding('1', 0.5, 140); this.geluid.speel('tel'); }
      if (this.aftel <= 0) { this.fase = 'race'; this.toonMelding('REN!', 0.7, 150); this.geluid.speel('start'); }
      this.volgCamera(dt, true);
      this.tekenAlles(dt);
      return;
    }
    if (this.fase === 'race' || this.fase === 'uitloop') {
      this.rondeTijd += dt;
      this.acc += dt;
      let n = 0;
      while (this.acc >= TP.STAP && n < 8) { this.fysicaStap(TP.STAP); this.acc -= TP.STAP; n++; }
      this.volgCamera(dt, false);
      this.controleerFront(dt);
    }
    this.tekenAlles(dt);
  }

  fysicaStap(dt) {
    const koploper = this.koploper();
    for (const r of this.renners) {
      if (r.dood) continue;
      // rubberband: de speler haalt in als die achterligt; bots ver vóór de speler lopen zachter, bots achteraan iets harder
      const trap = (lijst, v) => { for (const [grens, f] of lijst) if (v > grens) return f; return 1; };
      const achter = koploper.vooruit - r.vooruit;
      if (r.isSpeler) r.rubber = trap(TP.NIVEAU.inhalen, achter);
      else { const voorOpSpeler = this.speler.dood ? 0 : r.vooruit - this.speler.vooruit; r.rubber = voorOpSpeler > 300 ? trap(TP.NIVEAU.botsVoorSpeler, voorOpSpeler) : achter > 900 ? 1.06 : 1; }
      r.vorigX = r.x; r.vorigY = r.y;
      r.stap(dt);
      if (r.vooruitMerk === undefined || r.afstand > r.vooruitMerk + 40) { r.vooruitMerk = r.afstand; r.vooruitTijd = this.rondeTijd; }
      this.botsObjecten(r, dt);
      if (r.t.magneet > 0) {
        const a = this.baan.ankerVoor(r.x, r.handY(), r.richting, 900);
        if (a) { r.vx += Math.sign(a.x - r.x) * 2400 * dt; r.vy += Math.sign(a.y - r.y) * 1800 * dt; if (r.opGrond && a.y < r.y - 100) { r.opGrond = false; r.vy = -600; } }
      }
    }
    this.stapVijanden(dt);
    this.stapProjectielen(dt);
    this.tijd += dt;
  }

  koploper() {
    let k = null;
    for (const r of this.renners) if (!r.dood && (!k || r.vooruit > k.vooruit)) k = r;
    return k || this.speler;
  }

  botsObjecten(r, dt) {
    const hb = r.breedte / 2, h = r.hoogte;
    for (const o of this.baan.objecten) {
      if (!o.levend || o.type === 'decor') continue;
      const ol = o.x - o.w / 2, orr = o.x + o.w / 2, ot = o.y - o.h, ob = o.y;
      const raakt = r.x + hb > ol && r.x - hb < orr && r.y > ot && r.y - h < ob;
      if (o.type === 'boost') {
        if (raakt && !(o.laatst && o.laatst[r.id] > this.tijd - 1)) { (o.laatst = o.laatst || {})[r.id] = this.tijd; r.vx = o.richting * Math.max(Math.abs(r.vx), TP.FYS.boostplaat); r.richting = o.richting; r.boost(TP.FYS.boostplaatTijd); r.meld('boostplaat'); }
        continue;
      }
      if (o.type === 'krat') {
        if (raakt) { o.levend = false; this.vernietig(o); const nieuw = !r.item; r.item = r.item || Phaser.Utils.Array.GetRandom(Object.keys(TP.ITEMS)); r.meld('krat'); this.speelFx('fx_inslag', o.x, o.y - 40, 0.3); o.respawn = this.tijd + 12; if (r.isSpeler && nieuw) { this.toonTussentijd(TP.ITEMS[r.item].naam + ': ' + TP.ITEMS[r.item].uitleg + '  Druk op X'); this.itemPop = 0.5; } }
        continue;
      }
      if (o.type === 'val') {
        if (o.armTijd > 0) { o.armTijd -= dt; continue; }
        if (raakt && !(o.geraakt && o.geraakt[r.id])) {
          (o.geraakt = o.geraakt || {})[r.id] = true;
          if (o.t === 'val') { r.t.traag = 1.0; r.meld('traag'); if (r.isSpeler) this.toonMelding('Honingval van ' + (o.van ? o.van.naam : '?') + '!', 1.0, 70); } else { r.t.grip = 0.9; r.vx *= 0.5; r.richting *= -1; r.meld('traag'); if (r.isSpeler) this.toonMelding('Olie! Je glijdt weg', 1.0, 70); }
          o.levend = false; this.vernietig(o);
        }
        continue;
      }
      const rakelings = !raakt && r.x + hb + TP.FYS.rakelingsAfstand > ol && r.x - hb - TP.FYS.rakelingsAfstand < orr && r.y > ot - TP.FYS.rakelingsAfstand && r.y - h < ob + TP.FYS.rakelingsAfstand;
      if (rakelings && !(o.rakelings && o.rakelings[r.id]) && Math.abs(r.vx) > 400) { (o.rakelings = o.rakelings || {})[r.id] = true; r.t.rakelings = TP.FYS.rakelingsTijd; r.meld('rakelings'); }
      if (!raakt) continue;
      if (o.type === 'vijand' && r.vy > 0 && r.y < ot + 50) { o.levend = false; this.vernietig(o, true); r.hupje(); this.speelFx('fx_inslag', o.x, ot, 0.4); o.respawn = this.tijd + 15; continue; }
      if (o.type === 'vijand' && r.t.dash > 0) { o.levend = false; this.vernietig(o, true); r.meld('stamp'); o.respawn = this.tijd + 15; continue; }
      if (o.geraaktDoor && o.geraaktDoor[r.id] > this.tijd - 1.0) continue;
      (o.geraaktDoor = o.geraaktDoor || {})[r.id] = this.tijd;
      // obstakels remmen je af, ze leggen je niet plat; vijanden en raketten doen meer
      if (r.struikel(o.type, o.type === 'obstakel' ? 'licht' : 'normaal')) { if (o.type === 'vijand') o.richting *= -1; }
    }
  }

  vernietig(o) {
    if (!o.sprite) return;
    const s = o.sprite; o.sprite = null;
    this.tweens.add({ targets: s, alpha: 0, scaleY: s.scaleY * 0.2, y: s.y + 20, duration: 220, onComplete: () => s.destroy() });
  }

  stapVijanden(dt) {
    for (const o of this.baan.objecten) {
      // kratten en vijanden komen terug (het circuit wordt meerdere keren gereden)
      if (!o.levend && o.respawn && this.tijd > o.respawn) { o.levend = true; o.respawn = 0; o.x = o.x0; this.maakObjectBeeld(o); if (o.sprite) { o.sprite.setAlpha(0); this.tweens.add({ targets: o.sprite, alpha: 1, duration: 400 }); } }
      if (!o.levend || o.type !== 'vijand') continue;
      o.x += o.richting * o.snelheid * dt;
      if (Math.abs(o.x - o.x0) > o.bereik) { o.richting = -Math.sign(o.x - o.x0); o.x = o.x0 + Math.sign(o.x - o.x0) * o.bereik * 0.999; }
      if (o.sprite) { o.sprite.setX(o.x).setFlipX(o.richting > 0); if (o.zweeft) o.sprite.setY(o.y + Math.sin(this.tijd * 3 + o.x0) * 18); }
    }
  }

  stapProjectielen(dt) {
    for (const p of this.projectielen) {
      p.x += p.vx * dt; p.leven -= dt;
      if (p.raket && p.doel && !p.doel.dood) { p.y += Phaser.Math.Clamp((p.doel.y - 80) - p.y, -900 * dt, 900 * dt); if (Math.sign(p.doel.x - p.x) !== Math.sign(p.vx)) p.vx *= -1; }   // raket zoekt zijn doel
      if (p.sprite) { p.sprite.setPosition(p.x, p.y); if (p.sprite.setFlipX) p.sprite.setFlipX(p.vx < 0); p.sprite.setAngle(p.raket ? Math.sin(this.tijd * 20) * 4 : p.sprite.angle + 600 * dt); }
      if (p.raket && this.fx.vonken && Math.random() < 0.5) this.fx.vonken.emitParticleAt(p.x - 30 * Math.sign(p.vx), p.y, 1);
      // een gewoon schot raakt alleen vijanden; alleen de eikelraket (item) raakt tegenstanders
      for (const r of this.renners) {
        if (!p.raket || r === p.van || r.dood) continue;
        if (Math.abs(r.x - p.x) < r.breedte / 2 + 30 && p.y > r.y - r.hoogte - 20 && p.y < r.y + 20) {
          p.leven = 0;
          if (p.raket) { r.struikel('raket', 'zwaar'); this.speelFx('fx_explosie', p.x, p.y + 40, 0.5); this.cameras.main.shake(120, 0.004); if (r.isSpeler) this.toonMelding('Raket van ' + p.van.naam + '!', 1.0, 70); }
          else { r.vx *= 0.75; r.meld('geduwd'); this.speelFx('fx_inslag', p.x, p.y, 0.3); }
        }
      }
      for (const o of this.baan.objecten) {
        if (!o.levend || o.type !== 'vijand') continue;
        if (Math.abs(o.x - p.x) < o.w / 2 + 20 && p.y > o.y - o.h - 10 && p.y < o.y + 10) { p.leven = 0; o.levend = false; this.vernietig(o, true); o.respawn = this.tijd + 15; this.speelFx('fx_inslag', o.x, o.y - o.h / 2, 0.4); }
      }
      if (p.leven <= 0 && p.sprite) { p.sprite.destroy(); p.sprite = null; }
    }
    this.projectielen = this.projectielen.filter(p => p.leven > 0);
  }

  // ---------------------------------------------------------------- camera en front
  beeldRand() {
    const cam = this.cameras.main;
    const bw = TP.W / cam.zoom, bh = TP.H / cam.zoom;
    return { links: cam.midPoint.x - bw / 2, rechts: cam.midPoint.x + bw / 2, boven: cam.midPoint.y - bh / 2, onder: cam.midPoint.y + bh / 2 };
  }

  volgCamera(dt, start) {
    const cam = this.cameras.main, C = TP.CAMERA;
    const k = this.koploper();
    // alleen wie nog meedoet bepaalt het beeld (ook in de hoogte): wie vastzit of ver achterligt, raakt vanzelf uit beeld en is af
    const N = TP.NIVEAU;
    const meedoen = this.renners.filter(r => !r.dood && (r === k || (k.vooruit - r.vooruit < N.cameraAchterstand && this.rondeTijd - (r.vooruitTijd || 0) < N.vastTijd)));
    const xs = meedoen.map(r => r.x), ys = meedoen.map(r => r.y);
    const bx1 = Math.min(...xs), bx2 = Math.max(...xs), by1 = Math.min(...ys), by2 = Math.max(...ys);
    // zoom: de meute in beeld, maar in de loop van de ronde steeds krapper
    // ronde eindigt altijd: het beeld wordt krapper, eerst rustig, na 45 s hard; sneller zodra de speler af is
    const tijd = this.rondeTijd * (this.speler.dood ? 2.5 : 1);
    const zoomMin = tijd < 45 ? Phaser.Math.Linear(C.zoomMin, 0.45, tijd / 45) : Phaser.Math.Linear(0.45, 0.9, Math.min(1, (tijd - 45) / 40));
    const zoomMax = Math.max(C.zoomMax, zoomMin);
    const nodig = Math.min(TP.W / (bx2 - bx1 + 1900), TP.H / (by2 - by1 + 1100));
    this.zoomDoel = Phaser.Math.Clamp(Math.min(zoomMax, nodig), zoomMin, zoomMax);
    const z = Phaser.Math.Linear(cam.zoom, this.zoomDoel, 1 - Math.exp(-C.zoomSnelheid * dt));
    cam.setZoom(z);
    // de koploper staat op 62 procent van het beeld in zijn looprichting; de meute weegt licht mee
    const d = this.baan.richtingOp(k.x, k.y, k);
    const been = k.been || this.baan.beenOp(k.x, k.y);
    const verticaal = been && (been.type === 'klim' || been.type === 'daal');
    let doelX = verticaal ? (k.x * 0.6 + (bx1 + bx2) / 2 * 0.4) : k.x - d * (TP.W / z) * 0.08;
    // ligt de speler achter, dan schuift het beeld een stuk zijn kant op (de koploper blijft in beeld)
    const sp = this.speler;
    if (!verticaal && meedoen.includes(sp) && sp !== k) {
      const terug = (doelX - sp.x) * d;
      if (terug > 0) doelX -= d * Math.min(terug * 0.5, (TP.W / z) * TP.NIVEAU.cameraNaarSpeler);
    }
    // verticaal: tussen de hoogste en laagste renner in, met een lichte voorkeur voor de koploper
    const doelY = (by1 + by2) / 2 * 0.55 + k.y * 0.45 - 120;
    const cx = Phaser.Math.Linear(cam.midPoint.x, doelX, start ? 1 : 1 - Math.exp(-C.volgX * dt));
    const cy = Phaser.Math.Linear(cam.midPoint.y, doelY, start ? 1 : 1 - Math.exp(-C.volgY * dt));
    cam.centerOn(cx, cy);
    // front aan de kant waar de koploper vandaan komt
    if (!verticaal) this.frontKant = d > 0 ? -1 : 1;
  }

  controleerFront(dt) {
    const cam = this.cameras.main;
    const rand = this.beeldRand();
    const m = TP.CAMERA.frontMarge / cam.zoom;
    const k = this.koploper();
    for (const r of this.renners) {
      if (r.dood) continue;
      // gelapt: de koploper is je (bijna) een heel rondje voor
      if (r !== k && k.vooruit - r.vooruit > this.baan.lengte - 200) { this.uitschakelen(r, 'gelapt'); continue; }
      const hb = r.breedte / 2;
      // opzij uit beeld = gepakt door het front; boven of onder uit beeld krijgt wat extra ruimte (hoge en lage routes)
      if (r.x + hb < rand.links + m || r.x - hb > rand.rechts - m || r.y - r.hoogte > rand.onder + 60 || r.y < rand.boven - 60) this.uitschakelen(r);
    }
    const levend = this.renners.filter(r => !r.dood);
    // de ronde loopt door tot er één over is, ook als jij al af bent (je kijkt dan mee met de koploper)
    if (this.fase === 'race' && levend.length <= 1) {
      this.fase = 'uitloop';
      // vallen de laatste twee in hetzelfde moment af, dan wint wie het verst was
      const winnaar = levend[0] || k;
      this.stand.punten[winnaar.id]++;
      if (winnaar === this.speler) {
        const sleutel = 'tp_record_' + this.opties.baan, oud = TP.lees(sleutel, null);
        if (this.rondeTijd > 10 && (oud === null || oud < 10 || this.rondeTijd < oud)) { TP.bewaar(sleutel, this.rondeTijd); this.toonTussentijd('Nieuw record: ' + this.rondeTijd.toFixed(2)); }
      }
      this.toonMelding(winnaar === this.speler ? 'Jij wint de ronde!' : winnaar.naam + ' wint de ronde', 2.2, 84);
      this.geluid.speel(winnaar === this.speler ? 'winst' : 'verlies', { volume: 0.6 });
      this.time.delayedCall(1800, () => { this.geluid.stopVuur(); this.scene.start('Ronde', { ...this.opties, stand: this.stand, winnaar: winnaar ? winnaar.id : 0 }); });
    }
    // gloed en vuurgeluid op basis van afstand speler tot het front
    const frontX = this.frontKant < 0 ? rand.links : rand.rechts;
    const d = Math.abs(this.speler.x - frontX) * cam.zoom;
    const nabij = Phaser.Math.Clamp(1 - d / 700, 0, 1);
    this.gloed.setAlpha(nabij * 0.35);

    this.frontX = frontX;
  }

  uitschakelen(r, reden) {
    r.dood = true;
    if (r.kijk && r.kijk.sprite) {
      const s = r.kijk.sprite;
      this.tweens.add({ targets: s, alpha: 0, angle: -60, y: s.y - 80, duration: 450, onComplete: () => s.setVisible(false) });
      r.kijk.naam && r.kijk.naam.setVisible(false); r.kijk.schaduw && r.kijk.schaduw.setVisible(false); r.kijk.pijl && r.kijk.pijl.setVisible(false); r.kijk.gloed && r.kijk.gloed.setVisible(false);
    }
    this.fx.rook && this.fx.rook.emitParticleAt(r.x, r.y - 60, 10);
    this.geluid.speel(r.isSpeler ? 'dood' : 'uit');
    if (r.isSpeler) { this.cameras.main.shake(400, 0.014); this.cameras.main.flash(300, 255, 120, 30); this.toonMelding(reden === 'gelapt' ? 'Gelapt! Je bent af' : 'Gepakt door het vuur!', 2.0, 92); this.gloed.setAlpha(0.6); }
    else this.toonTussentijd(r.naam + (reden === 'gelapt' ? ' is gelapt' : ' is gepakt'));
  }

  // ---------------------------------------------------------------- tekenen
  tekenAlles(dt) {
    const cam = this.cameras.main;
    const z = cam.zoom;
    for (const l of this.lagen) {
      l.ts.tilePositionX = (cam.scrollX * l.f) / l.schaal;
      l.ts.y = l.basisY - (cam.scrollY - (this.baanDef.start.y - 760)) * l.fy;
    }
    // gloed aan de rand waar de meute vandaan komt, met een korte overgang als de kant wisselt
    if (this.frontGloed) {
      const doelAlpha = this.frontKantBeeld === this.frontKant ? 1 : 0;
      this.frontAlpha = Phaser.Math.Linear(this.frontAlpha, doelAlpha, 1 - Math.exp(-6 * dt));
      if (this.frontAlpha < 0.05 && this.frontKantBeeld !== this.frontKant) { this.frontKantBeeld = this.frontKant; }
      const kant = this.frontKantBeeld === undefined ? this.frontKant : this.frontKantBeeld;
      const puls = 1 + Math.sin(this.tijd * 5) * 0.08;
      this.frontGloed.setScale(kant > 0 ? -puls : puls, 1);
      this.front.setPosition(kant > 0 ? TP.W - TP.CAMERA.frontMarge : TP.CAMERA.frontMarge, 0);
      this.front.setAlpha(this.frontAlpha);
    }
    if (this.fx.vonken && this.frontX !== undefined && this.fase !== 'aftel') {
      const rand = this.beeldRand();
      const kant = this.frontKant;
      for (let i = 0; i < 3; i++) this.fx.vonken.emitParticleAt(this.frontX - kant * Math.random() * 120, rand.boven + Math.random() * (rand.onder - rand.boven), 1);
      if (Math.random() < 0.35) this.fx.rook.emitParticleAt(this.frontX - kant * Math.random() * 60, rand.boven + Math.random() * (rand.onder - rand.boven), 1);
    }
    for (const r of this.renners) {
      this.tekenRenner(r, dt);
      this.verwerkGebeurtenissen(r);
    }
    this.touw.clear();
    for (const r of this.renners) {
      if (!r.haak) continue;
      this.touw.lineStyle(7, 0x3a2412, 1).lineBetween(r.x + r.richting * 10, r.handY(), r.haak.anker.x, r.haak.anker.y);
      this.touw.lineStyle(3, 0xa8743c, 1).lineBetween(r.x + r.richting * 10, r.handY(), r.haak.anker.x, r.haak.anker.y);
      this.touw.fillStyle(0xffd23f, 1).fillCircle(r.haak.anker.x, r.haak.anker.y, 9);
    }
    // hud
    const sp = this.speler;
    this.hudTijd.setText(this.rondeTijd.toFixed(1));
    const levend = this.renners.filter(r => !r.dood);
    const plek = 1 + levend.filter(r => r.vooruit > sp.vooruit).length;
    this.hudPlek.setText(sp.dood ? 'Uit' : plek + 'e');
    this.hudPlekSub.setText(levend.length + ' in de race');
    this.hudRondje.setText('rondje ' + (Math.floor(Math.max(0, sp.vooruit) / this.baan.lengte) + 1));
    this.hudStand.setText(this.stand.namen.map((n, i) => n + ' ' + '●'.repeat(this.stand.punten[i]) + '○'.repeat(TP.WEDSTRIJD.rondesNodig - this.stand.punten[i])).join('   '));
    if (sp.item && TP.heeft('item_' + sp.item)) { const i = TP.manifest.beelden['item_' + sp.item]; this.itemPop = Math.max(0, (this.itemPop || 0) - dt); const pop = 1 + Math.sin(Math.min(1, this.itemPop / 0.5) * Math.PI) * 0.6; this.hudItemBeeld.setTexture('item_' + sp.item).setScale(76 / Math.max(i.w, i.h) * pop).setVisible(true); } else this.hudItemBeeld.setVisible(false);
    this.hudItemTekst.setText(sp.item ? TP.ITEMS[sp.item].naam : (sp.schild ? 'Bladschild' : 'geen item'));
    this.hudItemHint.setText(sp.item ? 'X  gebruiken' : 'X  item');
    const hintKleur = sp.item && Math.floor(this.tijd * 3) % 2 ? '#ffd23f' : '#d9c9a8';
    if (this.hudItemHint.style.color !== hintKleur) this.hudItemHint.setColor(hintKleur);
    const af = sp.t.dashAfkoel / TP.FYS.dashAfkoel;
    this.hudDashSchaduw.clear();
    if (af > 0) { this.hudDashSchaduw.fillStyle(0x000000, 0.55).slice(TP.W / 2 - 120, TP.H - 80, 46, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * af, false).fillPath(); }
    this.hudDashTekst.setText(af > 0 ? String(Math.ceil(sp.t.dashAfkoel)) : 'DASH');
    this.hudDashSub.setText(af > 0 ? 'Z  laden' : 'Z  klaar');
    this.hudSnelheidKlok = (this.hudSnelheidKlok || 0) - dt;
    if (this.hudSnelheidKlok <= 0) { this.hudSnelheidKlok = 0.12; this.hudSnelheid.setText(Math.round(Math.abs(sp.vx) / 10) + ' km/u'); }
    if (this.tips) {
      this.tipTimer -= dt;
      if (this.tipTimer <= 0) { this.tipIndex++; if (this.tipIndex >= this.tips.length) { this.tips = null; this.tipPaneel.setVisible(false); this.tipTekst.setVisible(false); } else { this.tipTekst.setText(this.tips[this.tipIndex]); this.tipTimer = 5.5; } }
    }
    // vastloop-detector voor de speler: richting ingedrukt maar geen vaart -> laat zien waarom
    const inp = sp.laatsteInvoer || {};
    if (!sp.dood && this.fase === 'race' && inp.x !== 0 && Math.abs(sp.vx) < 150) this.stilTijd = (this.stilTijd || 0) + dt; else this.stilTijd = 0;
    if (this.stilTijd > 1.5) {
      const T = sp.t;
      const redenen = [];
      if (T.verdoofd > 0) redenen.push('verdoofd'); if (T.bevroren > 0) redenen.push('bevroren'); if (T.traag > 0) redenen.push('honing'); if (T.grip > 0) redenen.push('olie');
      if (sp.haak) redenen.push('aan de haak'); if (sp.slidet) redenen.push('slide'); if (sp.aanMuur) redenen.push('tegen muur'); if (!sp.opGrond) redenen.push('in de lucht');
      const blok = this.baan.blokkenIn(sp.x - 60, sp.y - sp.hoogte - 10, sp.x + 60, sp.y + 5)[0];
      if (blok) redenen.push('blok ' + Math.round(blok.x) + ',' + Math.round(blok.y) + ' ' + blok.w + 'x' + blok.h);
      const tekst = 'VAST: ' + (redenen.join(', ') || 'geen reden gevonden') + ' | x=' + Math.round(sp.x) + ' y=' + Math.round(sp.y) + ' vx=' + Math.round(sp.vx) + ' invoer=' + inp.x + (inp.springVast ? ' spring' : '') + (inp.slide ? ' slide' : '') + (inp.haak ? ' haak' : '');
      this.hudTussen.setText(tekst).setAlpha(1).setColor('#ff9b6a');
      if (!this.stilGelogd) { console.warn(tekst); this.stilGelogd = true; }
    } else if (this.stilTijd === 0) this.stilGelogd = false;
    // rondetelling van de speler
    const ronde = Math.floor(sp.vooruit / this.baan.lengte);
    if (ronde > this.rondeNr && this.fase === 'race') { this.rondeNr = ronde; this.toonTussentijd('Rondje ' + ronde + ' · ' + this.rondeTijd.toFixed(2)); this.geluid.speel('tussentijd'); }
    if (this.debug) this.tekenDebug();
  }

  tekenRenner(r, dt) {
    const k = r.kijk;
    if (!k || !k.sprite) return;
    const s = k.sprite, p = k.rol;
    // tekenen tussen de laatste twee fysicastappen in, zodat de beweging vloeiend is op elk scherm (60, 75, 144 Hz)
    const f = Phaser.Math.Clamp(this.acc / TP.STAP, 0, 1);
    const x = r.vorigX === undefined ? r.x : r.vorigX + (r.x - r.vorigX) * f;
    const y = r.vorigY === undefined ? r.y : r.vorigY + (r.y - r.vorigY) * f;
    s.setPosition(x, y + 4);
    s.setFlipX(r.richting < 0);
    let pose = null, anim = null;
    if (r.dood) return;
    if (r.t.verdoofd > 0 && TP.heeft(p + '_geraakt')) pose = p + '_geraakt';
    else if (r.haak && TP.heeft(p + '_slinger')) pose = p + '_slinger';
    else if (r.aanMuur && !r.opGrond && TP.heeft(p + '_muur')) pose = p + '_muur';
    else if (r.slidet && TP.heeft(p + '_slide')) pose = p + '_slide';
    else if (!r.opGrond && r.vy < -50 && TP.heeft(p + '_sprong')) pose = p + '_sprong';
    else if (!r.opGrond && r.vy >= -50 && TP.heeft(p + '_val')) pose = p + '_val';
    else if (r.opGrond && Math.abs(r.vx) > 40 && TP.heeft(p + '_ren')) anim = p + '_ren';
    else if (TP.heeft(p + '_ren')) { pose = p + '_ren'; }
    else pose = p + '_ref';
    if (anim) {
      if (k.huidig !== anim) { s.play(anim); k.huidig = anim; }
      s.anims.timeScale = Phaser.Math.Clamp(Math.abs(r.vx) / 700, 0.5, 2.0);
    } else if (pose && k.huidig !== pose) {
      s.stop(); s.setTexture(pose, 0); k.huidig = pose;
    }
    // bij de muur kijkt de vos van de muur af; het muurbeeld zelf leunt naar rechts
    if (pose === p + '_muur') s.setFlipX(r.aanMuur < 0);
    const basis = this.schaal[r.rol] || 1;
    let sx = 1, sy = 1;
    if (!r.opGrond && !r.haak) { const v = Phaser.Math.Clamp(r.vy / 1600, -1, 1); sy = 1 + Math.abs(v) * 0.12; sx = 1 - Math.abs(v) * 0.08; }
    if (r.t.landSquash > 0) { r.t.landSquash -= dt; const q = r.t.landSquash / 0.12; sy = 1 - 0.18 * q; sx = 1 + 0.14 * q; }
    s.setScale(basis * sx, basis * sy);
    s.setRotation(r.opGrond ? r.hoek * 0.6 : (r.haak ? Phaser.Math.Clamp(r.vx / 2500, -0.5, 0.5) : 0));
    const basisTint = k.tint || 0xffffff;
    if (r.t.verdoofd > 0) s.setTint(Math.floor(this.tijd * 20) % 2 ? 0xff9977 : basisTint); else if (r.t.bevroren > 0) s.setTint(0x9fd8ff); else if (r.t.traag > 0 || r.t.grip > 0) s.setTint(0xffe27a); else if (r.t.boost > 0 || r.t.dash > 0) s.setTint(0xfff0c0); else s.setTint(basisTint);
    if (k.schaduw) { const g = this.baan.grondOnder(x, y, 0, 600, false); k.schaduw.setPosition(x, g ? g.y : y).setVisible(!!g).setScale(1 - Math.min(0.5, (g ? g.y - y : 0) / 1000), 1); }
    if (k.naam) k.naam.setPosition(x, y - r.hoogte - 30);
    if (k.pijl) { k.pijl.setPosition(x, y - r.hoogte - 100 + Math.sin(this.tijd * 6) * 8); k.pijl.setVisible(!r.dood); }
    if (k.gloed) { const g = this.baan.grondOnder(x, y, 0, 600, false); k.gloed.setPosition(x, g ? g.y : y).setVisible(!r.dood && !!g).setAlpha(0.25 + Math.sin(this.tijd * 5) * 0.1); }
    if (r.slidet && r.opGrond && this.fx.slideStof && Math.random() < 0.6) this.fx.slideStof.emitParticleAt(r.x - r.richting * 20, r.y, 1);
    if ((r.t.boost > 0 || r.t.dash > 0 || Math.abs(r.vx) > 1250) && this.fx.strepen && Math.random() < 0.7) this.fx.strepen.emitParticleAt(r.x - r.richting * 40, r.y - 60 - Math.random() * 60, 1);
    if (r.opGrond && Math.abs(r.vx) > 300 && this.fx.stof && Math.random() < 0.12) this.fx.stof.emitParticleAt(r.x - r.richting * 30, r.y, 1);
  }

  verwerkGebeurtenissen(r) {
    const dichtbij = r.isSpeler ? 1 : Phaser.Math.Clamp(1 - Math.hypot(r.x - this.speler.x, r.y - this.speler.y) / 2500, 0.1, 0.6);
    for (const e of r.gebeurtenissen) {
      const n = e.naam;
      if (n === 'land' || n === 'landHard') { r.t.landSquash = 0.12; this.fx.stof && this.fx.stof.emitParticleAt(r.x, r.y, n === 'landHard' ? 10 : 4); this.speelFx('fx_stof', r.x, r.y, 0.25); if (n === 'landHard' && r.isSpeler) this.cameras.main.shake(80, 0.003); }
      if (n === 'sprong' || n === 'dubbelesprong' || n === 'muursprong') { this.fx.stof && this.fx.stof.emitParticleAt(r.x, r.y, 3); }
      if (n === 'klap') { this.fx.inslag && this.fx.inslag.emitParticleAt(r.x, r.y - 70, 12); this.speelFx('fx_inslag', r.x, r.y - 60, 0.4); if (r.isSpeler) this.cameras.main.shake(140, 0.006); }
      if (n === 'boost' || n === 'boostplaat' || n === 'dash') { this.fx.boost && this.fx.boost.emitParticleAt(r.x, r.y - 60, 14); this.speelFx('fx_boost', r.x, r.y - 40, 0.35); if (n === 'dash' && r.isSpeler) { this.toonTussentijd('Dash!'); this.cameras.main.shake(90, 0.003); } }
      if (n === 'rakelings') { this.fx.inslag && this.fx.inslag.emitParticleAt(r.x, r.y - 60, 4); if (r.isSpeler) this.toonTussentijd('Rakelings!'); }
      if (n === 'stamp') { this.fx.inslag && this.fx.inslag.emitParticleAt(r.x, r.y, 8); }
      if (n === 'haak') { this.fx.inslag && this.fx.inslag.emitParticleAt(r.haak ? r.haak.anker.x : r.x, r.haak ? r.haak.anker.y : r.y, 5); }
      const geluidNaam = { boostplaat: 'boost', geduwd: 'kop' }[n] || n;
      this.geluid.speel(geluidNaam, { volume: 0.5 * dichtbij });
    }
    r.gebeurtenissen.length = 0;
  }

  tekenDebug() {
    const g = this.debugG; g.clear();
    for (const s of this.baan.grond) { g.lineStyle(3, s.oneWay ? 0x66aaff : 0x00ff88, 1); g.lineBetween(s.x1, s.y1, s.x2, s.y2); }
    g.lineStyle(2, 0xff8800, 1);
    for (const b of this.baan.blokken) g.strokeRect(b.x, b.y, b.w, b.h);
    g.fillStyle(0xffff00, 1);
    for (const a of this.baan.ankers) g.fillCircle(a.x, a.y, 10);
    for (const o of this.baan.objecten) { if (!o.levend || o.type === 'decor') continue; g.lineStyle(2, o.type === 'vijand' ? 0xff00ff : o.type === 'krat' ? 0xffff00 : 0xff4444, 1); g.strokeRect(o.x - o.w / 2, o.y - o.h, o.w, o.h); }
    for (const r of this.renners) { if (r.dood) continue; g.lineStyle(2, r.isSpeler ? 0xffffff : 0xaaaaaa, 1); g.strokeRect(r.x - r.breedte / 2, r.y - r.hoogte, r.breedte, r.hoogte); }
    for (const q of this.baan.cues) { g.fillStyle(q.route === 'expert' ? 0xff44ff : q.route === 'gevaar' ? 0xffaa00 : 0x44ff44, 0.8); g.fillCircle(q.x, (q.y !== undefined ? q.y : this.baanDef.start.y) - 20, 6); }
    const rand = this.beeldRand();
    g.lineStyle(4, 0xff0000, 1); g.lineBetween(this.frontX || rand.links, rand.boven, this.frontX || rand.links, rand.onder);
  }
};
