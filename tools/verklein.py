"""Verkleint artwork in assets/spel tot ongeveer het formaat waarin het in beeld komt, en werkt assets/manifest.json bij.

Waarom: het GPT-artwork is ~1000 px groot, maar een personage staat hooguit ~180 px hoog in beeld. Te grote textures
kosten videogeheugen en maken het spel schokkerig op laptops met ingebouwde grafische chip. De code schaalt alles op
basis van de maten in het manifest, dus in beeld verandert de grootte niet.

Draaien na tools/assets.py:  python tools/verklein.py
Het script is herhaalbaar: wat al klein genoeg is, blijft ongemoeid.
"""
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'assets' / 'manifest.json'

# (patroon, soort, doel). soort 'hoogte': hoogte van het referentiebeeld; 'max': langste zijde.
REGELS = [
    (r'^tegel_(grond|plafond)$', 'hoogte', 120),
    (r'^tegel_platform(_links|_rechts)?$', 'hoogte', 72),
    (r'^item_', 'max', 256),
    (r'^(vijand_|bos_obstakel_|bos_krat$|bos_boostplaat$)', 'max', 320),
]
# Alle poses van een dier delen één schaal (die van <rol>_ref), anders verspringt de grootte tussen poses.
# Het menu toont <rol>_ref op 520 px hoog, daarom 480.
ROL_REF_HOOGTE = 480


def verklein(pad, factor, frames=None, fw=None, fh=None):
    im = Image.open(pad)
    im.load()
    im = im.convert('RGBA').convert('RGBa')   # voorvermenigvuldigd alfa: geen donkere randjes
    if frames:
        nw, nh = max(1, round(fw * factor)), max(1, round(fh * factor))
        uit = Image.new('RGBa', (nw * frames, nh))
        for i in range(frames):
            uit.paste(im.crop((i * fw, 0, (i + 1) * fw, fh)).resize((nw, nh), Image.LANCZOS), (i * nw, 0))
    else:
        nw, nh = max(1, round(im.width * factor)), max(1, round(im.height * factor))
        uit = im.resize((nw, nh), Image.LANCZOS)
    uit.convert('RGBA').save(pad, optimize=True)
    return nw, nh


def main():
    m = json.loads(MANIFEST.read_text(encoding='utf-8'))
    beelden = m['beelden']
    plan = {}
    for k, info in beelden.items():
        for patroon, soort, doel in REGELS:
            if re.search(patroon, k):
                zijde = info['h'] if soort == 'hoogte' else max(info['w'], info['h'])
                plan[k] = doel / zijde
                break
    rollen = {k[:-4] for k in beelden if k.endswith('_ref')}
    for rol in rollen:
        f = ROL_REF_HOOGTE / beelden[rol + '_ref']['h']
        for k in beelden:
            if k.startswith(rol + '_') and k != rol + '_delen':
                plan[k] = f
    gewonnen = 0
    for k, f in sorted(plan.items()):
        if f >= 0.95:
            continue
        info = beelden[k]
        pad = ROOT / 'assets' / info['pad']
        voor = pad.stat().st_size
        w, h = verklein(pad, f, info.get('frames'), info['w'], info['h'])
        print(f'{k:24s} {info["w"]}x{info["h"]} -> {w}x{h}  ({voor // 1024} kB -> {pad.stat().st_size // 1024} kB)')
        gewonnen += voor - pad.stat().st_size
        info['w'], info['h'] = w, h
        info['v'] = int(pad.stat().st_mtime)   # nieuwe versiestempel, anders laadt de browser het oude bestand
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'klaar, {gewonnen / 1048576:.1f} MB kleiner')


if __name__ == '__main__':
    main()
