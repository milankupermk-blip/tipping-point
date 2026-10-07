// Een renner: speler of bot. Eigen kinematische controller, vaste stap.
// Positie (x, y) is het voetpunt. Alle regels staan in TP.FYS.
window.TP = window.TP || {};

TP.Renner = class {
  constructor(scene, opties) {
    this.scene = scene;
    this.baan = scene.baan;
    this.id = opties.id;
    this.rol = opties.rol;
    this.naam = opties.naam || TP.ROLLEN[opties.rol].naam;
    this.isSpeler = !!opties.speler;
    this.invoer = opties.invoer;          // object met lees() -> invoer
    this.x = opties.x; this.y = opties.y;
    this.vx = 0; this.vy = 0;
    this.richting = 1;
    this.opGrond = false; this.hoek = 0; this.grondSeg = null;
    this.slidet = false; this.aanMuur = 0;
    this.sprongen = 0;
    this.haak = null;                      // {anker, lengte}
    this.t = { coyote: 0, buffer: 0, vast: 0, verdoofd: 0, boost: 0, dash: 0, dashAfkoel: 0, kleef: 0, bevroren: 0, traag: 0, rakelings: 0, grip: 0, magneet: 0, muurLock: 0, schot: 0, landSquash: 0, vuurWacht: 0 };
    this.boostFactor = 1;
    this.schild = false;
    this.item = opties.item || null;
    this.dood = false;
    this.afstand = 0;
    this.laatsteInvoer = TP.LegeInvoer();
    this.gebeurtenissen = [];              // voor geluid en particles: ['sprong', 'land', ...]
    this.ronden = 0;
    this.kijk = scene.maakRennerBeeld ? scene.maakRennerBeeld(this) : null;
  }

  get hoogte() { return TP.RENNER.hoogte * (this.slidet ? TP.FYS.slideHoogte : 1); }
  get breedte() { return TP.RENNER.breedte; }
  get snelheid() { return Math.hypot(this.vx, this.vy); }
  get topsnelheid() { return TP.FYS.topsnelheid * this.boostFactor * (this.rubber || 1) * (this.t.traag > 0 ? 0.55 : 1); }

  meld(naam, data) { this.gebeurtenissen.push({ naam, data }); }

  stap(dt) {
    if (this.dood) return;
    const F = TP.FYS, T = this.t, inp = this.invoer.lees(this);
    this.laatsteInvoer = inp;
    for (const k in T) if (T[k] > 0) T[k] = Math.max(0, T[k] - dt);

    const verdoofd = T.verdoofd > 0 || T.bevroren > 0;
    const ix = verdoofd ? 0 : inp.x;
    if (inp.spring && !verdoofd) T.buffer = F.buffer;
    if (T.bevroren > 0) { this.vx *= 0.9; }

    // dash (vos-kracht)
    if (inp.kracht && !verdoofd && T.dashAfkoel <= 0 && this.rol === 'vos') {
      T.dash = F.dashTijd; T.dashAfkoel = F.dashAfkoel; this.meld('dash');
      if (this.richting === 0) this.richting = 1;
    }
    if (T.dash > 0) { this.vx = this.richting * Math.max(Math.abs(this.vx), F.dashSnelheid); this.vy = Math.min(this.vy, 0); }

    // boost-factor
    this.boostFactor = 1;
    if (T.boost > 0) this.boostFactor = Math.max(this.boostFactor, 1.45);
    if (T.rakelings > 0) this.boostFactor = Math.max(this.boostFactor, F.rakelingsBonus);

    // item gebruiken
    // vuur ingedrukt terwijl je verdoofd of bevroren bent: onthouden en uitvoeren zodra het weer kan
    let item = inp.item, schiet = inp.schiet;
    if (verdoofd && (item || schiet)) { T.vuurWacht = 1; this.vuurMetItem = item; }
    if (!verdoofd && T.vuurWacht > 0) { T.vuurWacht = 0; if (this.vuurMetItem) item = true; else schiet = true; }
    if (item && this.item && !verdoofd) { this.scene.gebruikItem(this); }
    if (schiet && !verdoofd) this.scene.schiet(this);

    if (this.haak) this.stapHaak(dt, inp);
    else if (this.opGrond) this.stapGrond(dt, inp, ix);
    else this.stapLucht(dt, inp, ix);

    if (ix !== 0 && !this.haak && T.dash <= 0) this.richting = ix;
    if (this.opGrond) { this.laatsteGrondX = this.x; this.laatsteGrondY = this.y; }
    // voortgang langs het circuit, met rondetelling
    const p = this.baan.voortgang(this.x, this.y, this);
    if (this.p === undefined) { this.p = p; this.vooruit = p; }
    let delta = p - this.p;
    if (delta > this.baan.lengte / 2) delta -= this.baan.lengte; else if (delta < -this.baan.lengte / 2) delta += this.baan.lengte;
    this.vooruit += delta; this.p = p;
    this.afstand = Math.max(this.afstand, this.vooruit);
  }

  // ---- op de grond
  stapGrond(dt, inp, ix) {
    const F = TP.FYS, T = this.t;
    const top = this.topsnelheid;
    const wilSliden = inp.slide && T.verdoofd <= 0;
    if (this.slidet && !wilSliden && this.plafondBoven()) { /* blijft laag, zit onder iets */ }
    else {
      if (wilSliden && !this.slidet) this.meld('slide');
      this.slidet = wilSliden;
    }

    // helling: zwaartekrachtcomponent langs de grond
    const sinA = Math.sin(this.hoek), cosA = Math.cos(this.hoek);
    const hellingKracht = F.zwaartekracht * F.hellingKracht * sinA * cosA * (this.slidet ? F.slideBergafBonus : 1);
    this.vx += hellingKracht * dt;

    if (this.slidet) {
      this.vx = TP.naar(this.vx, 0, F.slideRem * dt);
      // kruipen: een slide vanuit stilstand komt langzaam op gang, zodat je onder een lage tak niet vast blijft staan
      if (ix !== 0 && Math.abs(this.vx) < 600) this.vx += ix * 1600 * dt;
    } else if (ix !== 0 && T.grip <= 0) {
      const keert = Math.sign(this.vx) === -ix && this.vx !== 0;
      const a = keert ? F.keren : F.versnelling;
      if (Math.abs(this.vx) < top || Math.sign(this.vx) !== ix) this.vx += ix * a * dt;
      if (Math.sign(this.vx) === ix && Math.abs(this.vx) > top && !keert) this.vx = TP.naar(this.vx, ix * top, 400 * dt);
    } else {
      this.vx = TP.naar(this.vx, 0, (T.grip > 0 ? 200 : F.rem) * dt);
    }
    // lopen langs de helling
    const nx = this.x + this.vx * dt;
    const muur = this.botsMuren(nx, this.y);
    this.x = muur.x;
    if (muur.geraakt) { this.vx = 0; }

    // grond volgen
    const tol = 40 + Math.abs(this.vx) * dt * 2;
    const g = this.baan.grondOnder(this.x, this.y, tol, tol, false);
    if (g) {
      this.y = g.y; this.hoek = g.hoek; this.grondSeg = g.seg;
      if (Math.abs(this.hoek) > 0.9) { /* te steil: valt */ this.opGrond = false; }
    } else {
      // van de rand of de helling af
      this.opGrond = false;
      this.vy = this.vx * Math.tan(this.hoek);
      T.coyote = F.coyote;
      this.grondSeg = null;
    }

    // springen
    if (T.buffer > 0 && T.verdoofd <= 0) {
      T.buffer = 0;
      this.vy = -F.sprong - Math.max(0, -this.vx * Math.sin(this.hoek) * 0.3);
      this.opGrond = false; this.slidet = false; this.sprongen = 1; T.vast = F.vastTijd; T.coyote = 0;
      this.meld('sprong');
    }
    this.aanMuur = 0;
  }

  // ---- in de lucht (ook muurglijden)
  stapLucht(dt, inp, ix) {
    const F = TP.FYS, T = this.t;
    const top = this.topsnelheid;
    this.slidet = false;
    // vlak na een wall-jump telt sturen richting de muur even niet mee, zodat de sprong van de muur af komt
    if (T.muurLock > 0 && ix === this.muurLockKant) ix = 0;

    // sturen
    if (ix !== 0 && T.verdoofd <= 0 && T.dash <= 0) {
      if (Math.abs(this.vx) < top || Math.sign(this.vx) !== ix) this.vx += ix * F.luchtSturing * dt;
    } else if (ix === 0 && T.dash <= 0 && T.muurLock <= 0) {
      this.vx = TP.naar(this.vx, 0, F.luchtRem * dt);
    }
    // zwaartekracht
    const licht = inp.springVast && this.vy < 0 && T.vast > 0;
    this.vy += (licht ? F.zwaartekrachtVast : F.zwaartekracht) * dt * (inp.slide ? 1.6 : 1);
    if (this.aanMuur && this.vy > F.muurGlij && (ix === this.aanMuur || T.kleef > 0)) this.vy = F.muurGlij;
    this.vy = Math.min(this.vy, F.valMax);

    // springen: muur, coyote, dubbel
    if (T.buffer > 0 && T.verdoofd <= 0) {
      if (this.aanMuur) {
        T.buffer = 0;
        this.vy = -F.muurSprongOp; this.vx = -this.aanMuur * F.muurSprongAf; this.richting = -this.aanMuur;
        this.sprongen = 1; T.vast = F.vastTijd; T.kleef = 0; T.muurLock = 0.22; this.muurLockKant = this.aanMuur; this.aanMuur = 0;
        this.meld('muursprong');
      } else if (T.coyote > 0) {
        T.buffer = 0; T.coyote = 0;
        this.vy = -F.sprong; this.sprongen = 1; T.vast = F.vastTijd; this.meld('sprong');
      } else if (this.sprongen > 0) {
        T.buffer = 0; this.sprongen = 0;
        this.vy = -F.dubbeleSprong; T.vast = F.vastTijd; this.meld('dubbelesprong');
      }
    }

    // haak vastgrijpen
    if (inp.haak && TP.HAAK && T.verdoofd <= 0) {
      const hand = this.handY();
      const a = this.baan.ankerVoor(this.x, hand, this.richting, F.haakBereik);
      if (a) {
        this.haak = { anker: a, lengte: Math.hypot(a.x - this.x, a.y - hand) };
        this.aanMuur = 0; this.sprongen = 1; this.meld('haak');
        return;
      }
    }

    // bewegen x
    const xOud = this.x;
    const nx = this.x + this.vx * dt;
    const muur = this.botsMuren(nx, this.y);
    this.x = muur.x;
    if (muur.geraakt) {
      if (Math.sign(this.vx) === muur.kant) this.vx = 0;
      if (!this.aanMuur) { this.meld('muur'); }
      this.aanMuur = muur.kant; T.kleef = F.muurKleef;
    } else if (T.kleef <= 0) {
      this.aanMuur = 0;
    }

    // bewegen y
    const yOud = this.y;
    const ny = this.y + this.vy * dt;
    if (this.vy > 0) {
      const l = this.baan.landing(this.x, yOud, ny, xOud);
      if (l) {
        this.y = l.y; this.hoek = l.hoek; this.grondSeg = l.seg;
        this.opGrond = true; this.sprongen = 0; this.aanMuur = 0;
        const hard = this.vy > 1200;
        // landen op helling: snelheid langs helling behouden
        this.vx += this.vy * Math.sin(l.hoek) * Math.cos(l.hoek) * 0.5;
        this.vy = 0;
        this.meld(hard ? 'landHard' : 'land');
        if (inp.slide) { this.slidet = true; }
        return;
      }
    } else {
      const p = this.plafondTussen(yOud, ny);
      if (p !== null) { this.y = p + this.hoogte; this.vy = 0; this.meld('kop'); return; }
      // een helling die sneller stijgt dan de sprong: voeten zitten onder het oppervlak, erop zetten en doorrennen
      const onder = this.baan.grondOnder(this.x, ny, 90, 0, true);
      if (onder && onder.y < ny - 1 && Math.abs(onder.hoek) > 0.05) {
        this.y = onder.y; this.hoek = onder.hoek; this.grondSeg = onder.seg; this.opGrond = true; this.vy = 0; this.sprongen = 0; this.aanMuur = 0;
        return;
      }
    }
    this.y = ny;
    if (this.y > this.scene.wereldOnder) { this.scene.valtUitBeeld(this); }
  }

  // ---- slingeren aan de haak
  stapHaak(dt, inp) {
    const F = TP.FYS, T = this.t;
    const a = this.haak.anker;
    if (!inp.haak || T.verdoofd > 0) {
      this.haak = null; this.vx *= F.haakLosBonus; this.vy *= F.haakLosBonus; this.sprongen = 1; this.meld('haakLos');
      return;
    }
    this.slidet = false;
    this.vy += F.zwaartekracht * dt;
    if (inp.x) this.vx += inp.x * 600 * dt;
    // positie van de hand
    let hx = this.x + this.vx * dt, hy = this.handY() + this.vy * dt;
    const dx = hx - a.x, dy = hy - a.y, d = Math.hypot(dx, dy);
    if (d > this.haak.lengte) {
      const nx = dx / d, ny = dy / d;
      hx = a.x + nx * this.haak.lengte; hy = a.y + ny * this.haak.lengte;
      const radiaal = this.vx * nx + this.vy * ny;
      if (radiaal > 0) { this.vx -= radiaal * nx; this.vy -= radiaal * ny; }
    }
    this.vx *= F.haakDemping; this.vy *= F.haakDemping;
    // touw inhalen door op te springen
    if (T.buffer > 0) { T.buffer = 0; this.haak.lengte = Math.max(F.haakTouwMin, this.haak.lengte - 90); }
    const yOud = this.y;
    this.x = hx; this.y = hy + this.hoogte * 0.6;
    this.richting = this.vx >= 0 ? 1 : -1;
    // muren en grond tijdens slingeren
    const muur = this.botsMuren(this.x, this.y);
    if (muur.geraakt) { this.x = muur.x; this.vx = 0; }
    const l = this.vy > 0 ? this.baan.landing(this.x, Math.min(yOud, this.y), this.y) : null;
    if (l) { this.y = l.y; this.hoek = l.hoek; this.opGrond = true; this.haak = null; this.vy = 0; this.meld('land'); return; }
    // door de grond getrokken (voeten net onder een oppervlak): erop zetten en loslaten
    const onder = this.baan.grondOnder(this.x, this.y, 160, 0, true);
    if (onder && onder.y < this.y) { this.y = onder.y; this.hoek = onder.hoek; this.opGrond = true; this.haak = null; this.vy = 0; }
  }

  handY() { return this.y - this.hoogte * 0.6; }

  // horizontale botsing met blokken; geeft nieuwe x en kant (1 = muur rechts van renner)
  botsMuren(nx, y) {
    const hb = this.breedte / 2, h = this.hoogte;
    const l = nx - hb, r = nx + hb, b = y - h + 4, o = y - 6;
    let geraakt = false, kant = 0, x = nx;
    for (const k of this.baan.blokkenIn(l, b, r, o)) {
      // opstapje: bovenkant net boven de voeten
      if (k.y >= y - 28 && k.y <= y + 2 && this.opGrond) { continue; }
      if (nx < k.x + k.w / 2) { x = k.x - hb; kant = 1; } else { x = k.x + k.w + hb; kant = -1; }
      geraakt = true;
    }
    return { x, geraakt, kant };
  }

  plafondBoven() {
    const hb = this.breedte / 2, h = TP.RENNER.hoogte;
    return this.baan.blokkenIn(this.x - hb + 6, this.y - h, this.x + hb - 6, this.y - h * TP.FYS.slideHoogte - 2).length > 0;
  }

  plafondTussen(yOud, yNieuw) {
    const hb = this.breedte / 2, h = this.hoogte;
    let best = null;
    for (const k of this.baan.blokkenIn(this.x - hb + 6, yNieuw - h, this.x + hb - 6, yOud - h)) {
      const onder = k.y + k.h;
      if (onder >= yNieuw - h && onder <= yOud - h + 1) { if (best === null || onder > best) best = onder; }
    }
    return best;
  }

  // ---- gebeurtenissen van buiten
  // zwaarte: 'licht' (obstakel: korte rem, je blijft lopen), 'normaal' (vijand), 'zwaar' (raket)
  struikel(bron, zwaarte) {
    const F = TP.FYS, T = this.t;
    if (T.verdoofd > 0 || T.dash > 0) return false;
    if (this.schild) { this.schild = false; T.verdoofd = 0.15; this.meld('schildBreekt'); return false; }
    const z = zwaarte || 'normaal';
    T.verdoofd = z === 'licht' ? 0.22 : z === 'zwaar' ? F.verdoving : 0.4;
    this.vx *= z === 'licht' ? (this.isSpeler ? 0.75 : 0.5) : (this.isSpeler ? TP.NIVEAU.klapSpeler : F.klapSnelheid);
    if (this.opGrond && z !== 'licht') { this.vy = -320; this.opGrond = false; }
    this.haak = null; this.slidet = false;
    this.meld('klap', bron);
    return true;
  }

  hupje() { this.vy = -TP.FYS.hupje; this.opGrond = false; this.sprongen = 1; this.meld('stamp'); }

  boost(tijd) { this.t.boost = Math.max(this.t.boost, tijd); this.meld('boost'); }
};

TP.naar = (v, doel, stap) => v < doel ? Math.min(v + stap, doel) : Math.max(v - stap, doel);
