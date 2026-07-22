#!/usr/bin/env python3
"""
sync_characters.py -- autonomous full-body character texture renderer (WEB-PNG route).

Analogue of the "head" thumbnail parser (scripts/sync-mutants.ts) but for full-body
stand renders. Fully autonomous, no frida / no live game:

  geometry  <- gameconfig/sprites.xml   (plaintext, no hash) -> specimen_<CODE>_stand
  atlas     <- assets/character/<stem>[_<tier|skin>].png  (plaintext, no hash, RGBA)
  render    <- compositor.py (v11 + web fixes) at frames.rest_frame(sprite)

Outputs, matching the site's existing layout:
  by_mutant  public/textures_by_mutant/<code>/FULL_<code>[_<tier>].png
  by_skins   public/textures_by_skins/FULL_<id>_<skin>.png

Modes:
  (default)      incremental -- only (re)render atlases whose CDN signature changed
  --full         backfill -- render everything (run once locally, then push to CDN)
  --only CODE    render a single site code (debug), e.g. --only aa_12
  --limit N      stop after N rendered PNGs (testing)
  --sprites PATH use a local sprites.xml / stands.xml instead of fetching (testing)
  --no-skins     skip the skin pass

New-character detection: a state manifest (rendered.json) keyed by output path stores
each source atlas's CDN signature (Last-Modified + Content-Length). A target is
rendered only when its signature is new or changed -> "check for new characters daily".
"""
import argparse
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import compositor as comp  # noqa: E402
import frames as F         # noqa: E402

CDN = "https://s-ak.kobojo.com/mutants"
SPRITES_URL = CDN + "/gameconfig/sprites.xml"
GACHA_URL = CDN + "/gameconfig/gacha.xml"
ATLAS_BASE = CDN + "/assets/character"

REPO = os.path.abspath(os.path.join(HERE, "..", ".."))          # mutants_site/
OUT_MUTANT = os.path.join(REPO, "public", "textures_by_mutant")
OUT_SKIN = os.path.join(REPO, "public", "textures_by_skins", "textures_by_skin", "full")
STATE_PATH = os.path.join(HERE, "rendered.json")
CACHE = os.path.join(HERE, ".cache")

STAR_TIERS = ["bronze", "silver", "gold", "platinum"]
UA = "archivist-library-texture-sync/1.0"

# Weak starter variants -- Specimen_A_02 / B_02 / C_02 = Слабый Робот / Зомби / Воин.
# They exist as stand sprites in sprites.xml (sharing the a/b/c atlas with the _01
# specimens) but are deliberately never written to mutants.json, so the site has no
# use for their textures. Excluded from every pass, including skins.
EXCLUDED_CODES = {"a_02", "b_02", "c_02"}


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #
def _req(url, method="GET"):
    return urllib.request.Request(url, method=method, headers={"User-Agent": UA})


def http_signature(url):
    """HEAD an atlas -> stable signature string, or None if it does not exist.

    Used both to test existence (skip 404 tiers/skins) and to detect changes."""
    try:
        with urllib.request.urlopen(_req(url, "HEAD"), timeout=30) as r:
            h = r.headers
            return "%s|%s|%s" % (h.get("Last-Modified", ""),
                                 h.get("Content-Length", ""),
                                 h.get("ETag", ""))
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None


def http_bytes(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(_req(url), timeout=120) as r:
                return r.read()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1.5 * (attempt + 1))
    return None


# --------------------------------------------------------------------------- #
# Geometry: sprites.xml -> specimen_*_stand elements
# --------------------------------------------------------------------------- #
def fetch_stands(sprites_path=None):
    """Return (root_element, {site_code: (sprite_element, atlas_stem)}).

    site_code = lowercase of the id core, e.g. specimen_AA_12_stand -> "aa_12".
    atlas_stem = the sprite's bitmap without dir/ext, e.g. "a_a_12" (source of truth
    for the CDN atlas filename; carries the gene underscores the id drops)."""
    if sprites_path and os.path.exists(sprites_path):
        src = open(sprites_path, "rb")
    else:
        print("[geometry] fetching sprites.xml ...", flush=True)
        src = io.BytesIO(http_bytes(SPRITES_URL))

    # Stream with iterparse: keep only the top-level specimen_*_stand <Sprite>
    # elements (each ~40KB) and clear the root after every processed child so the
    # 220MB document never lives in memory as a full tree. Handles nested <Sprite>
    # children correctly (a line/regex scanner does not).
    mapping = {}
    newroot = ET.Element("ArrayOfSprite")
    depth = 0
    root = None
    for event, elem in ET.iterparse(src, events=("start", "end")):
        if event == "start":
            depth += 1
            if depth == 1:
                root = elem
            continue
        # end
        if elem.tag == "Sprite" and depth == 2:
            sid = elem.get("id") or ""
            m = re.match(r"^specimen_([A-Za-z0-9_]+)_stand$", sid)
            if m:
                bitmap = elem.get("bitmap") or ""
                mb = re.match(r"^character/(.+)\.png$", bitmap)
                if mb:
                    newroot.append(elem)  # keep this subtree alive
                    mapping[m.group(1).lower()] = (elem, mb.group(1))
            if root is not None:
                root.clear()  # drop processed siblings; kept ones survive via newroot
        depth -= 1
    try:
        src.close()
    except Exception:
        pass
    return newroot, mapping


def cache_stands(root):
    """Persist the compact stands document so re-runs skip the big fetch."""
    os.makedirs(CACHE, exist_ok=True)
    ET.ElementTree(root).write(os.path.join(CACHE, "stands.xml"), encoding="utf-8")


# --------------------------------------------------------------------------- #
# Skins: gacha.xml -> {skin_name: [specimen_code, ...]}
# --------------------------------------------------------------------------- #
def fetch_skins():
    """Map each Gacha skin id to the specimen codes it re-skins.

    <Gacha id="girl"> ... <X specimen="Specimen_CF_01" .../> ... </Gacha>
    -> {"girl": ["cf_01", ...]}"""
    try:
        text = http_bytes(GACHA_URL).decode("utf-8", "ignore")
        root = ET.fromstring(text)
    except Exception as e:
        print("[skins] gacha.xml unavailable (%s); skipping skins" % e)
        return {}
    skins = {}
    for gacha in root.iter("Gacha"):
        skin = gacha.get("id")
        if not skin:
            continue
        codes = []
        for el in gacha.iter():
            if el is gacha:
                continue
            spec = el.get("specimen")
            if spec:
                mm = re.match(r"^Specimen_([A-Za-z0-9_]+)$", spec)
                if mm:
                    codes.append(mm.group(1).lower())
        if codes:
            skins.setdefault(skin, [])
            for c in codes:
                if c not in skins[skin]:
                    skins[skin].append(c)
    return skins


# --------------------------------------------------------------------------- #
# Target enumeration
# --------------------------------------------------------------------------- #
class Target:
    __slots__ = ("code", "sprite", "atlas_url", "out_path", "kind", "sig")

    def __init__(self, code, sprite, atlas_url, out_path, kind, sig):
        self.code = code
        self.sprite = sprite
        self.atlas_url = atlas_url
        self.out_path = out_path
        self.kind = kind
        self.sig = sig


def build_targets(mapping, skins, want_skins=True, only=None, workers=16):
    """Return every renderable target that actually exists on the CDN.

    Probing is ~3100 HEAD requests (556 codes x base+4 tiers, plus skin pairs).
    Sequentially that is ~10 min and would eat most of the 30-min cron budget,
    so the existence/signature probe runs on a small thread pool."""
    cands = []  # (code, sprite, url, out_path, kind)
    codes = [c for c in sorted(mapping) if c not in EXCLUDED_CODES]
    if only:
        codes = [c for c in codes if c == only]

    # by_mutant: base + star tiers (same geometry, swapped atlas)
    for code in codes:
        sprite, stem = mapping[code]
        folder = os.path.join(OUT_MUTANT, code)
        cands.append((code, sprite, "%s/%s.png" % (ATLAS_BASE, stem),
                      os.path.join(folder, "FULL_%s.png" % code), "base"))
        for tier in STAR_TIERS:
            cands.append((code, sprite, "%s/%s_%s.png" % (ATLAS_BASE, stem, tier),
                          os.path.join(folder, "FULL_%s_%s.png" % (code, tier)), "tier"))

    # by_skins: base geometry + skin atlas, from gacha.xml
    if want_skins:
        for skin, specimens in sorted(skins.items()):
            for spec in specimens:
                if only and spec != only:
                    continue
                if spec not in mapping or spec in EXCLUDED_CODES:
                    continue
                sprite, stem = mapping[spec]
                cands.append((spec, sprite, "%s/%s_%s.png" % (ATLAS_BASE, stem, skin),
                              os.path.join(OUT_SKIN, "FULL_%s_%s.png" % (spec, skin)),
                              "skin"))

    with ThreadPoolExecutor(max_workers=workers) as ex:
        sigs = list(ex.map(http_signature, [c[2] for c in cands]))

    targets, base_ok = [], set()
    for (code, sprite, url, out, kind), sig in zip(cands, sigs):
        if sig is None:
            continue  # atlas does not exist (404) -> nothing to render
        if kind == "base":
            base_ok.add(code)
        targets.append(Target(code, sprite, url, out, kind, sig))
    # A tier/skin atlas without its base atlas means the specimen is not shipped;
    # keep the original behaviour of skipping the whole code in that case.
    return [t for t in targets if t.kind == "base" or t.code in base_ok]


# --------------------------------------------------------------------------- #
# Rendering
# --------------------------------------------------------------------------- #
def choose_frame(sprite):
    frame = F.rest_frame(sprite)
    if not comp.collect_quads(sprite, frame):
        ranked = [c for c in F.stand_frames(sprite) if comp.collect_quads(sprite, c)]
        frame = ranked[0] if ranked else 0.0
    code = sprite.get("_code")
    if code in F.FRAME_OVERRIDES:
        frame = float(F.FRAME_OVERRIDES[code])
    return frame


def render_target(t):
    """Fetch atlas, render, save. Returns 'ok' | 'review' | 'fail:<msg>'."""
    os.makedirs(os.path.dirname(t.out_path), exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)
    atlas_file = os.path.join(CACHE, os.path.basename(t.atlas_url))
    try:
        data = http_bytes(t.atlas_url)
        with open(atlas_file, "wb") as fh:
            fh.write(data)
    except Exception as e:
        return "fail:atlas download %s" % e

    review = False
    try:
        if t.code in F.POSE_OVERRIDES:
            sid = t.sprite.get("id")
            F.render_override("", atlas_file, sid, t.sprite,
                              F.POSE_OVERRIDES[t.code], t.out_path)
        else:
            if F.segmented_rig(t.sprite):
                review = True  # segmented dance rig -> render is a guess, flag it
            frame = choose_frame(t.sprite)
            img = comp.compose("", atlas_file, t.sprite.get("id"), None,
                               frame=frame, quiet=True, sprite=t.sprite)
            if img is None:
                return "fail:no visible images"
            img.save(t.out_path)
    except Exception as e:
        return "fail:%s" % e
    return "review" if review else "ok"


# --------------------------------------------------------------------------- #
# State + summary
# --------------------------------------------------------------------------- #
def load_state():
    if os.path.exists(STATE_PATH):
        try:
            return json.load(open(STATE_PATH))
        except Exception:
            pass
    return {}


def save_state(state):
    json.dump(state, open(STATE_PATH, "w"), indent=0, sort_keys=True)


def summary(stats, review, failures):
    lines = ["### Текстуры персонажей (full-render, web-route)"]
    if stats["new"] == 0 and not review and not failures:
        lines.append("ℹ️ Новых персонажей не обнаружено — рендер не требуется")
    else:
        lines.append("🆕 Новых/изменённых атласов: %d" % stats["new"])
        lines.append("🖼️ Отрендерено PNG: %d  (база + тиры + скины)" % stats["ok"])
        lines.append("⏭️ Пропущено (актуальны): %d" % stats["skip"])
        lines.append("⚠️ Требует ручной проверки (segmented rig): %d" % len(set(review)))
        lines.append("❌ Ошибок рендера: %d" % len(failures))
        if review:
            lines.append("")
            lines.append("**NEEDS MANUAL REVIEW:** " + ", ".join(sorted(set(review))))
    block = "\n".join(lines) + "\n"
    # Written to a file rather than straight to $GITHUB_STEP_SUMMARY so the
    # workflow's final "Итоги" step can place this section in the right order.
    try:
        os.makedirs(CACHE, exist_ok=True)
        with open(os.path.join(CACHE, "summary.md"), "w") as fh:
            fh.write(block)
    except Exception:
        pass
    print("\n" + block)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="render everything (backfill)")
    ap.add_argument("--only", help="single site code, e.g. aa_12")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sprites", help="local sprites.xml / stands.xml")
    ap.add_argument("--no-skins", action="store_true")
    args = ap.parse_args()

    root, mapping = fetch_stands(args.sprites)
    try:
        cache_stands(root)
    except Exception:
        pass
    for code, (sp, _stem) in mapping.items():
        sp.set("_code", code)  # so choose_frame can see the code for overrides
    print("[geometry] %d stand sprites" % len(mapping))

    skins = {} if args.no_skins else fetch_skins()
    if skins:
        print("[skins] %d skin packs, %d (skin,specimen) pairs"
              % (len(skins), sum(len(v) for v in skins.values())))

    print("[targets] probing CDN for existing atlases ...", flush=True)
    targets = build_targets(mapping, skins, want_skins=not args.no_skins, only=args.only)
    print("[targets] %d existing atlases" % len(targets))

    state = load_state()
    stats = {"new": 0, "ok": 0, "skip": 0}
    review, failures = [], []
    n = 0
    for t in targets:
        rel = os.path.relpath(t.out_path, REPO)
        if not args.full and state.get(rel) == t.sig and os.path.exists(t.out_path):
            stats["skip"] += 1
            continue
        stats["new"] += 1
        res = render_target(t)
        if res == "ok":
            stats["ok"] += 1
            state[rel] = t.sig
        elif res == "review":
            stats["ok"] += 1
            review.append(t.code)
            state[rel] = t.sig
            print("  REVIEW %s (segmented rig)" % rel)
        else:
            failures.append((rel, res))
            print("  FAIL %s -> %s" % (rel, res))
        n += 1
        if n % 25 == 0:
            print("  ... %d rendered" % n, flush=True)
        if args.limit and n >= args.limit:
            print("[limit] stopping at %d" % n)
            break

    save_state(state)
    summary(stats, review, failures)
    if failures:
        print("failures:")
        for rel, e in failures:
            print("   %-40s %s" % (rel, e))


if __name__ == "__main__":
    main()
