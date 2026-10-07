# Codemap

Snelle instap voor een volgende chat. Lees eerst `PLAN.md` (ontwerp en afstemming) en `ARTWORK-LOG.md` (wat er aan artwork is en komt).

## Starten

- Preview: configuratie `tipping-point` in `.claude/launch.json` (poort 5180), of `python -m http.server 5180` in de projectmap.
- Na nieuw artwork: `python tools/assets.py` (maakt `assets/manifest.json` en de bewerkte sprites in `assets/spel`).
  Daarna `python tools/verklein.py`: verkleint de sprites tot het formaat waarin ze in beeld komen (scheelt videogeheugen en laadtijd) en werkt het manifest bij.
- Debugweergave in de race: F3. P of Esc: pauze (met instructies en een knop naar het menu).

## Bestanden

- `index.html` — laadt Phaser, de lettertypen en `assets/manifest.json`, daarna de scripts in vaste volgorde met een versiestempel (`?v=`), anders speelt de browser oude code. Geen bundler.
- `src/config.js` — alle afstemknoppen: `TP.FYS` (beweging), `TP.CAMERA`, `TP.ROLLEN`, `TP.ITEMS`, `TP.WERELDEN`, `TP.WEDSTRIJD`.
- `src/laden.js` — zet alles uit het manifest in de Phaser-loader (preload van Boot). `TP.heeft(sleutel)` zegt of artwork bestaat.
- `src/geluid.js` — `TP.GELUIDEN` (gebeurtenis → Kenney-bestanden) en `TP.Geluid` (afspelen, vuurgeruis via WebAudio).
- `src/invoer.js` — `TP.Toetsenbord` levert per fysicastap een invoerobject. Besturing: pijltjes, spatie = vuur (item of eikel), shift = dash. De grijphaak staat uit via `TP.HAAK` in `config.js` (ook voor bots; dan ook geen magneet-item en geen haakringen in beeld). Elke invoerbron heeft `lees(renner)`.
- `src/baan.js` — `TP.Baan`: bouwt een gesloten circuit uit benen (`rechts`, `klim`, `links`, `daal`); `links` spiegelt zijn stukken. Grondlijnen, blokken, ankers, objecten, cues. Voortgang langs het circuit (`voortgang` met per renner een huidig been; wisselen alleen naar het volgende been, of een been verder vlak bij het eind, of terug vlak bij het begin; `beenOp`, `richtingOp`) en alle geometrievragen (`grondOnder`, `landing`, `blokkenIn`, `ankerVoor`: ankers én onderkanten van blokken en platforms).
- `src/renner.js` — `TP.Renner`: de kinematische controller (grond, lucht, muur, haak), struikelen, hupje, boost. Zet gebeurtenissen in `gebeurtenissen` voor geluid en particles.
- `src/bots.js` — `TP.Bot`: invoerbron voor bots. Generiek vooruitkijken plus cues uit de baandata, routekeuze op vaardigheid, vastloop-omweg.
- `src/banen/bos1.js` — `TP.BANEN.bos1` "Vuurlinie" (37800 langs het circuit, rondje van ~35 s voor een goede bot) en `TP.BANEN.bos2` "Kaalslag" (34200): onderlangs naar rechts (6 à 7 stukken), klim rechts (vijf platforms zigzag plus een wall-jump-schacht voor experts), bovenlangs naar links (gespiegelde stukken), afdaling links over drie platforms. Het bovenste been moet precies boven de afdaling eindigen (zie het commentaar bij de benen). Formaat staat bovenin `baan.js`.
- `src/race.js` — `TP.Race` (Phaser-scene): achtergrondlagen, baan tekenen, renners tekenen en animeren, camera (volgt koploper, zoomt op het peloton), front aan de linkerrand, objecten (boost, kratten, obstakels, vijanden, vallen), projectielen, items, HUD, particles, rondewinst.
- `src/schermen.js` — `TP.Boot`, `TP.Menu`, `TP.Vraag` (60 s, `TP.WEDSTRIJD.vraagTijd`), `TP.Uitleg` (schematische instructies na de eerste vraag van een nieuw spel), `TP.Ronde`, `TP.Einde`, `TP.Pauze` (over de stilgezette race heen; P, Esc of de knop rechtsboven) plus hulpfuncties `TP.knop`, `TP.paneel`, `TP.bord`, `TP.tekenUitleg`, `TP.achtergrond`.
- `src/vragen.js` — `VRAGEN` en `FEITEN` voor het leerdeel.
- `src/main.js` — Phaser-config en scenelijst.
- `tools/verklein.py` — verkleint personages, vijanden, obstakels, items en baantegels in `assets/spel` en zet de nieuwe maten in het manifest. Herhaalbaar. De code schaalt alles op basis van het manifest, dus in beeld verandert niets.
- `tools/assets.py` — scant `assets/gpt/*` en Downloads, pakt batch-zips uit, snijdt randen weg, bouwt spritesheets (`*_ren`, `fx_*`), maakt parallaxlagen herhaalbaar (gespiegeld), schrijft `assets/manifest.json`.

## Hoe de race-lus werkt

1. `update` telt tijd op en roept `fysicaStap` aan in vaste stappen van 1/120 s.
2. `fysicaStap`: per renner `stap(dt)` (invoer lezen, bewegen, voortgang langs het circuit bijhouden in `r.vooruit`), dan `botsObjecten`; vijanden en projectielen; kratten en vijanden komen na een tijd terug.
3. `volgCamera`: koploper (hoogste `vooruit`) op 62 procent van het beeld in zijn looprichting, zoom zodat het peloton in beeld blijft (alleen renners die meedoen: niet meer dan `TP.NIVEAU.cameraAchterstand` achter en niet langer dan `vastTijd` s zonder vooruitgang; wie vastzit raakt zo vanzelf uit beeld), krapper naarmate de ronde vordert.
4. `controleerFront`: wie gelapt wordt (de koploper is bijna een rondje verder) is af. Wie opzij uit beeld raakt (doodslijn = binnenrand van de vuurband, `frontMarge`) is gepakt; de ronde loopt door tot er één renner over is, ook als de speler al af is (je kijkt dan mee) (het front staat aan de kant waar de koploper vandaan komt; boven en onder is er wat extra ruimte). Eén over = ronde voorbij.
5. `tekenAlles`: parallax, front, renners (pose of ren-animatie, squash en stretch), touw, HUD (houten onderbalk: item, dash, plek, tijd; stand linksboven; tips in de eerste drie races), debug.

## Artwork-sleutels die de code verwacht

Personage `<rol>_ref`, `<rol>_ren` (sheet), `<rol>_sprong|val|slide|muur|slinger|geraakt|winst`. Baan `tegel_grond`, `tegel_vulling`, `tegel_muur`, `tegel_platform`, `tegel_plafond`. Wereld `bos_lucht|ver|midden|dichtbij|voor`, `front_bos`, `bos_boostplaat`, `bos_krat`, `bos_obstakel_1..6`. Vijanden `vijand_*`. Items `item_*`. Effecten `fx_*` (sheets). UI `logo`, `ui_knop`, `ui_paneel`. Ontbreekt een sleutel, dan tekent de code dat onderdeel niet (en valt terug op `vos_ref` voor poses).

## Testen zonder scherm

In de browserconsole kun je de race headless doordraaien, handig in een verborgen tab waar Phaser niet rendert:

```js
spel.scene.getScenes(true).forEach(x => spel.scene.stop(x.scene.key));
spel.scene.start('Race', {wereld:'bos', baan:'bos1', item:null, stand:{namen:['Jij','Uil','Bever','IJsbeer'], punten:[0,0,0,0], ronde:1}});
// daarna: const s = spel.scene.getScene('Race'); s.speler.invoer = new TP.Bot(s, 0.8); s.fase = 'race';
// for (let i = 0; i < 12000; i++) { s.fysicaStap(TP.STAP); s.volgCamera(TP.STAP, false); s.controleerFront(TP.STAP); }
```
