// Baangeometrie. Een baan is een gesloten circuit (zoals in SpeedRunners): een reeks "benen" die samen een rondje vormen.
// Elk been is een richting (rechts, links, klim, daal) met handgebouwde stukken erin. Voortgang loopt langs het circuit rond.
//
// Stukdata (in src/banen/*.js), coördinaten lokaal, y naar beneden, TP.GROND = standaard grondhoogte van het stuk:
//   w         breedte van het stuk (bij klim/daal: h = hoogte)
//   grond     [[x1,y1,x2,y2], ...]   loopbare lijnen, ook hellingen (x1 < x2)
//   blokken   [[x,y,w,h], ...]       massieve rechthoeken: bovenkant grond, zijkanten muur, onderkant plafond (en haakbaar)
//   platforms [[x1,y,x2], ...]       doorlaatbare vlakke platforms (van bovenaf landen, van onderaf haakbaar)
//   ankers    [[x,y], ...]           losse haakpunten
//   boost     [[x,y,richting]]       boostplaten
//   kratten   [[x,y]]
//   obstakels [{t, x, y, w, h}]      statisch, raken kost snelheid
//   vijanden  [{t, x, y, bereik}]    lopen heen en weer
//   decor     [{t, x, y, laag}]      alleen beeld
//   cues      { veilig: [{x, a, vast}], gevaar: [...], expert: [...] }  acties voor bots (x lokaal, langs de looprichting)
//
// Een been 'links' spiegelt zijn stukken horizontaal; 'klim' en 'daal' zijn stukken in wereldcoördinaten met hun eigen cues.
window.TP = window.TP || {};

TP.GROND = 940;

TP.Baan = class {
  constructor(scene, circuit) {
    this.scene = scene;
    this.circuit = circuit;
    this.grond = []; this.blokken = []; this.ankers = []; this.objecten = []; this.cues = [];
    this.benen = [];
    this.lengte = 0;
    this.bouw();
  }

  bouw() {
    let p = 0;
    for (const been of this.circuit.benen) {
      const b = { type: been.type, x: been.x, y: been.y, van: p, stukken: [], cues: { veilig: [], gevaar: [], expert: [] } };
      if (been.type === 'rechts' || been.type === 'links') {
        let ox = been.x;
        const totaal = been.stukken.reduce((s, c) => s + c.w, 0);
        for (const [i, c] of been.stukken.entries()) {
          const spiegel = been.type === 'links';
          b.dak = been.type === 'links' && i > 0;   // eerste stuk ligt boven de klim en blijft open
          // bij 'links' lopen de stukken naar links weg vanaf been.x, elk gespiegeld
          this.plaatsStuk(c, spiegel ? been.x - (ox - been.x) - c.w : ox, been.y - TP.GROND, spiegel, b);
          ox += c.w;
        }
        b.lengte = totaal;
        b.x1 = been.type === 'rechts' ? been.x : been.x - totaal;
        b.x2 = been.type === 'rechts' ? been.x + totaal : been.x;
        b.yMin = been.y - (been.hoogte || 1400); b.yMax = been.y + 500;
      } else {
        // klim of daal: één stuk in wereldcoördinaten, voortgang langs y
        const c = been.stuk;
        this.plaatsStuk(c, been.x, been.y, false, b);
        b.lengte = c.h;
        b.x1 = been.x - (c.marge || 0); b.x2 = been.x + c.w + (c.marge || 0);
        b.yMin = been.y; b.yMax = been.y + c.h;
        b.richtingX = c.richtingX || 1;
        if (c.schacht) b.schacht = [been.x + c.schacht[0], been.x + c.schacht[1]];
        if (c.waypoints) {
          // niveaus van onder naar boven: vloer, platforms, bovengrond
          const ys = [been.y + c.h, ...(c.platforms || []).map(q => been.y + q[1]).sort((a, z) => z - a), been.y];
          b.niveaus = ys.map((y, i) => ({ y, x: been.x + (c.waypoints[i] !== undefined ? c.waypoints[i] : c.waypoints[c.waypoints.length - 1]) }));
        }
      }
      b.tot = p + b.lengte;
      p = b.tot;
      this.benen.push(b);
    }
    this.lengte = p;
    // buitenmuren links en rechts van het hele circuit: wie met vaart (dash) voorbij de laatste grond vliegt, valt niet van de wereld
    const xs1 = this.grond.map(s => s.x1).concat(this.blokken.map(k => k.x)), xs2 = this.grond.map(s => s.x2).concat(this.blokken.map(k => k.x + k.w));
    const ys = this.grond.flatMap(s => [s.y1, s.y2]);
    const boven = Math.min(...ys) - 1600, onder = Math.max(...ys) + 300;
    this.blokken.push({ x: Math.min(...xs1) - 160, y: boven, w: 160, h: onder - boven, rand: true });
    this.blokken.push({ x: Math.max(...xs2), y: boven, w: 160, h: onder - boven, rand: true });
  }

  plaatsStuk(c, ox, oy, spiegel, been) {
    const X = x => spiegel ? ox + c.w - x : ox + x;
    const nr = this.benen.length * 100 + been.stukken.length;
    const voegGrond = (x1, y1, x2, y2, oneWay) => {
      let a = X(x1), bx = X(x2), ay = oy + y1, by = oy + y2;
      if (a > bx) { [a, bx] = [bx, a]; [ay, by] = [by, ay]; }
      this.grond.push({ x1: a, y1: ay, x2: bx, y2: by, oneWay: !!oneWay, hoek: Math.atan2(by - ay, bx - a), stuk: nr });
    };
    (c.grond || []).forEach(g => {
      // op een bovenbaan met dak worden vlakke grondlijnen op G een plaat: loopbaar van boven, plafond en haakpunt van onder
      if (been.dak && g[1] === TP.GROND && g[3] === TP.GROND) {
        const x = spiegel ? X(g[2]) : X(g[0]);
        this.blokken.push({ x, y: oy + g[1], w: g[2] - g[0], h: 220, stuk: nr });
        voegGrond(g[0], g[1], g[2], g[3], false);
      } else voegGrond(g[0], g[1], g[2], g[3], false);
    });
    (c.platforms || []).forEach(p => voegGrond(p[0], p[1], p[2], p[1], true));
    (c.blokken || []).forEach(b => {
      const x = spiegel ? X(b[0] + b[2]) : X(b[0]);
      this.blokken.push({ x, y: oy + b[1], w: b[2], h: b[3], stuk: nr });
      voegGrond(b[0], b[1], b[0] + b[2], b[1], false);
    });
    (c.ankers || []).forEach(a => this.ankers.push({ x: X(a[0]), y: oy + a[1], stuk: nr }));
    const maak = (type, o) => {
      const obj = Object.assign({ type, stuk: nr, levend: true }, o, { x: X(o.x), y: oy + o.y });
      obj.x0 = obj.x;
      if (spiegel && obj.richting) obj.richting *= -1;
      this.objecten.push(obj);
      return obj;
    };
    (c.boost || []).forEach(b => maak('boost', { x: b[0], y: b[1], richting: (b[2] || 1), w: 180, h: 30 }));
    (c.kratten || []).forEach(k => maak('krat', { x: k[0], y: k[1], w: 90, h: 90 }));
    (c.obstakels || []).forEach(o => maak('obstakel', Object.assign({ w: 120, h: 110 }, o)));
    (c.vijanden || []).forEach(v => maak('vijand', Object.assign({ w: 150, h: 120, bereik: 220, snelheid: 120, richting: -1 }, v)));
    (c.decor || []).forEach(d => maak('decor', Object.assign({}, d)));
    for (const route of ['veilig', 'gevaar', 'expert']) {
      for (const q of (c.cues && c.cues[route]) || []) {
        const cue = Object.assign({}, q, { x: X(q.x), y: q.y !== undefined ? oy + q.y : undefined, route, richting: spiegel ? -1 : 1 });
        been.cues[route].push(cue);
        this.cues.push(cue);
      }
    }
    been.stukken.push({ c, ox, oy, spiegel, nr });
  }

  // ---- voortgang langs het circuit
  beenOp(x, y) {
    // een klim of daling telt alleen als je er echt in zit (niet op de grond erboven of eronder);
    // anders wint het dichtstbijzijnde horizontale been
    for (const b of this.benen) {
      if (b.type !== 'klim' && b.type !== 'daal') continue;
      // een daling telt pas ruim boven de onderste grond, anders is een sprongetje bij de start al "een rondje terug"
      // klim: ook de lucht boven de bovengrond telt mee (haak-sprongen schieten door de band heen)
      const onder = b.type === 'daal' ? b.yMax - 500 : b.yMax - 10;
      const boven = b.type === 'klim' ? b.yMin - 500 : b.yMin + 60;
      if (x >= b.x1 && x <= b.x2 && y > boven && y < onder) return b;
    }
    let best = null, bestD = Infinity;
    for (const b of this.benen) {
      const dx = x < b.x1 ? b.x1 - x : x > b.x2 ? x - b.x2 : 0;
      const dy = y < b.yMin ? b.yMin - y : y > b.yMax ? y - b.yMax : 0;
      const d = dx + dy * 0.5 + (b.type === 'klim' || b.type === 'daal' ? 1 : 0);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  voortgangOpBeen(b, x, y) {
    let t;
    if (b.type === 'rechts') t = (x - b.x1) / b.lengte;
    else if (b.type === 'links') t = (b.x2 - x) / b.lengte;
    else if (b.type === 'klim') t = (b.yMax - y) / b.lengte;
    else t = (y - b.yMin) / b.lengte;
    return b.van + Phaser.Math.Clamp(t, 0, 1) * b.lengte;
  }

  // Voortgang langs het circuit. Een renner wisselt alleen van been als de voortgang aansluit:
  // wie onderlangs hoog slingert onder de afdaling, blijft op het onderste been staan.
  voortgang(x, y, renner) {
    const kandidaat = this.beenOp(x, y);
    if (!kandidaat) return 0;
    if (!renner) return this.voortgangOpBeen(kandidaat, x, y);
    if (renner.been === undefined) renner.been = kandidaat;
    const pNu = this.voortgangOpBeen(renner.been, x, y);
    if (kandidaat === renner.been) return pNu;
    // alleen vooruit naar het volgende been, of terug naar het vorige als je nog vlak bij het begin van je been zit
    const n = this.benen.length, cu = this.benen.indexOf(renner.been), ci = this.benen.indexOf(kandidaat);
    const vooruit = ci === (cu + 1) % n;
    const naEind = pNu > renner.been.tot - 600;                       // bijna aan het eind van dit been: ook een been verder mag
    const overslaan = ci === (cu + 2) % n && naEind;
    const terug = ci === (cu - 1 + n) % n && pNu - renner.been.van < 400;
    if (vooruit || overslaan || terug) { renner.been = kandidaat; return this.voortgangOpBeen(kandidaat, x, y); }
    return pNu;
  }

  // looprichting (x-teken) voor bots op een plek
  richtingOp(x, y, renner) {
    const b = renner && renner.been ? renner.been : this.beenOp(x, y);
    if (!b) return 1;
    if (b.type === 'rechts') return 1;
    if (b.type === 'links') return -1;
    return b.richtingX || 1;
  }

  // ---- geometrie
  static hoogteOp(s, x) {
    if (s.x2 === s.x1) return s.y1;
    const t = (x - s.x1) / (s.x2 - s.x1);
    return s.y1 + (s.y2 - s.y1) * t;
  }

  grondOnder(x, y, omhoog, omlaag, negeerOneWay) {
    let best = null, bestAfstand = Infinity;
    for (const s of this.grond) {
      if (x < s.x1 || x > s.x2) continue;
      if (negeerOneWay && s.oneWay) continue;
      const h = TP.Baan.hoogteOp(s, x);
      const d = h - y;
      if (d < -omhoog || d > omlaag) continue;
      if (s.oneWay && d < -2) continue;
      const a = Math.abs(d);
      if (a < bestAfstand) { bestAfstand = a; best = { y: h, hoek: s.hoek, seg: s }; }
    }
    return best;
  }

  // Landt een val van (xOud, yOud) naar (x, yNieuw) op een grondlijn? De lijn moet aan het begin onder de voeten liggen
  // (gemeten bij xOud) en aan het eind erboven (bij x). Met alleen x zakte je door een helling die je kant op stijgt:
  // na de zijwaartse stap lag die al net boven je voeten.
  landing(x, yOud, yNieuw, xOud) {
    let best = null;
    for (const s of this.grond) {
      if (x < s.x1 || x > s.x2) continue;
      const h = TP.Baan.hoogteOp(s, x);
      const hOud = xOud === undefined ? h : TP.Baan.hoogteOp(s, Math.min(s.x2, Math.max(s.x1, xOud)));
      if (Math.max(h, hOud) < yOud - 1 || h > yNieuw + 0.01) continue;
      if (!best || h < best.y) best = { y: h, hoek: s.hoek, seg: s };
    }
    return best;
  }

  blokkenIn(l, b, r, o) {
    const uit = [];
    for (const k of this.blokken) {
      if (r <= k.x || l >= k.x + k.w || o <= k.y || b >= k.y + k.h) continue;
      uit.push(k);
    }
    return uit;
  }

  // Haakpunt zoals in SpeedRunners: het punt schuin vooruit-omhoog wint (35 tot 60 graden, liefst 400 tot 900 px),
  // niet het dichtstbijzijnde punt recht boven je hoofd. Kandidaten: losse ankers, onderkanten van blokken en platforms.
  ankerVoor(x, y, richting, bereik) {
    let best = null, bestScore = Infinity;
    const probeer = (ax, ay, minHoogte) => {
      const dx = (ax - x) * richting, dy = y - ay;             // dx vooruit, dy omhoog
      if (dy < minHoogte) return;
      if (dx < -120) return;
      const d = Math.hypot(dx, dy);
      if (d > bereik || d < TP.FYS.haakTouwMin) return;
      const hoek = Math.atan2(dy, Math.max(dx, 1)) * 180 / Math.PI;   // 90 = recht boven, 0 = recht vooruit
      let score = Math.abs(hoek - 48) * 6 + Math.abs(d - 650) * 0.5;
      if (hoek > 80) score += 600;                                     // recht boven je: alleen als er niets beters is
      if (score < bestScore) { bestScore = score; best = { x: ax, y: ay }; }
    };
    for (const a of this.ankers) probeer(a.x, a.y, 0);
    for (const k of this.blokken) {
      for (const ax of [x + richting * 250, x + richting * 500, x + richting * 750]) {
        if (ax < k.x + 10 || ax > k.x + k.w - 10) continue;
        probeer(ax, k.y + k.h, 180);
      }
    }
    for (const s of this.grond) {
      if (!s.oneWay) continue;
      for (const ax of [x + richting * 250, x + richting * 500, x + richting * 750]) {
        if (ax < s.x1 + 10 || ax > s.x2 - 10) continue;
        probeer(ax, s.y1, 180);
      }
    }
    return best;
  }

  cuesTussen(route, x1, x2) {
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    return this.cues.filter(q => q.route === route && q.x >= lo && q.x <= hi);
  }
};
