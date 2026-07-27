# Frame-selection + pose logic reused verbatim from
# 4443/FULL_TEXTURES/batch_render_stands.py (rig-derived, CI-safe).
import copy
import math
import xml.etree.ElementTree as ET
from collections import Counter
import compositor as comp


FRAME_OVERRIDES = {
    'cd_12': 2.0,    # Kapitan Orlan -- default frame 23 caught mid-spin (3 circle FX)
    'ba_11': 0.0,    # Povelitel dorog -- default frame 39 caught a full smoke burst
    'ad_08': 70.0,   # Kotik Reyndzher -- default frame 5 is motion-blurred
    'cc_06': 2.0,    # El Grigno -- default frame 31 caught the revolver-spin swirl
    'dc_04': 0.0,    # Sezann -- default frame 14 caught the pistol-spin swirl
    'de_06': 78.0,   # Darvin -- default frame 53 caught mid-transformation smoke
    'ee_04': 0.0,    # Letayushchiy Dzhordson -- default frame 35 left a residual ball-spin artifact
    'cd_07': 36.0,   # Dzhonni Snoui -- default frame 12 caught the mid-transform translucent blend; 36 is the clean settled wolf form
    'ef_99': 100.0,  # Mag singulyarnosti -- MUST pin: dropping COMPOSITE_DROPS shifts rest_frame()'s
                     # own scoring off 100 (verified: lands on 59), which wakes a different
                     # top-level composite that carries its own trailing streaks
    'ea_07': 96.0,   # Kapitan Patriot -- default frame 24 swings the shield out with a visible
                     # gap from the arm; 96 holds it tucked closer to the body. Shield's own
                     # alpha=0.8 is baked into every one of its keys (constant, not
                     # frame-dependent) -- that translucency is the shield's material, not a
                     # bug, left alone.
    'ed_07': 34.0,   # Paramik -- pin: dropping COMPOSITE_DROPS shifts rest_frame() off 34
                     # (lands on 47), same class of issue as ef_99 above.
    'de_14': 0.0,    # Sverkhmassivnaya beskonechnost -- pin to the frame de14_manual_graft()
                     # assumes (see below); rest_frame() would already land here, this just
                     # makes the dependency explicit and immune to future heuristic changes.
    'de_05': 0.0,    # Halkomyak -- pin to the frame de05_manual_fix() assumes (see below).
}


POSE_OVERRIDES = {
    'ca_14': {'segment': 0, 'frame': 22.0, 'mirror': True},
}


# Some rigs bundle the whole figure -- body AND a persistent effect layer --
# under one top-level Composite whose child Sprite holds the real per-part
# list, and that effect layer is live across the ENTIRE animation span (no
# frame excludes it, so FRAME_OVERRIDES cannot help). Found by isolating each
# nested composite in turn and rendering it alone: aa_03's frame-encompassing
# starburst is nested-composite 0 under top-level composite 1; ef_99's comet
# trails + trailing dust are nested-composites 0-4 under top-level composite
# 24. Keyed by (path-of-top-level-indices) -> set of nested indices to drop.
COMPOSITE_DROPS = {
    'aa_03': [((1,), 0)],
    'ef_99': [((24,), 0), ((24,), 1), ((24,), 2), ((24,), 3), ((24,), 4)],
    'ed_07': [((), 3)],  # Paramik -- top-level composite 3 is the glow blob, isolated clean
}


def drop_composites(sprite, code):
    """Return a deep copy of `sprite` with COMPOSITE_DROPS[code] removed.

    Resolves each (path, idx) against a composite list snapshotted ONCE per
    path before removing anything: removing by index while re-querying
    findall() after each removal shifts every later index (dropping [0,1,2]
    off a 26-item list actually dropped originals {0,2,4} -- verified the
    hard way), so indices for the same path must be collected first and the
    elements removed by identity, not by a freshly recomputed position."""
    out = copy.deepcopy(sprite)
    by_path = {}
    for path, idx in COMPOSITE_DROPS.get(code, []):
        by_path.setdefault(path, []).append(idx)
    for path, indices in by_path.items():
        target = out
        for p in path:
            target = target.findall('Composite')[p].find('Sprite')
        comps = target.findall('Composite')
        for el in [comps[i] for i in indices]:
            target.remove(el)
    return out


def baked_frame(sprite):
    """The frame just outside the body's animation span, or None.

    Every bone of the body shares one keyframe span (2..105, 0..97, ...), and
    some specimens carry an extra composite with exactly two keys sitting
    entirely outside it -- 0..1 before, or 98..99 after. That frame is the
    rest pose, for one of two reasons depending on the rig:

      * a real flat baked layer (f_c_12, frame 0): the animated bones have not
        reached their first key yet so they do not draw at all, and what is
        left is the pre-rendered stand art the portrait was made from;
      * the body held at its last key with the effect layers already expired
        (cf_11, frame 98): no swing trail, no slash, just the settled pose.

    Either way the rule is the same and needs nothing but the rig, which is
    what keeps the pipeline CI-safe.

    Guard: the marker composite is sometimes empty (bd_11 keys 100..101 draws
    zero quads), so require the frame to still show most of the art. This
    catches an EMPTY false positive only -- a non-empty out-of-span composite
    that is not a rest pose would slip through. None seen in 44/44 specimens,
    but that is the limit of the check."""
    from collections import Counter
    spans = []
    for c in sprite.findall('Composite'):
        ks = c.findall('Key')
        if not ks:
            continue
        fs = [float(k.get('frame', 0)) for k in ks]
        spans.append((len(ks), min(fs), max(fs)))
    if not spans:
        return None
    body = Counter((lo, hi) for n, lo, hi in spans if n >= 3).most_common(1)
    if not body:
        return None
    (blo, bhi), _ = body[0]
    cands = [lo for n, lo, hi in spans if n == 2 and (hi < blo or lo > bhi)]
    if not cands:
        return None
    f = min(cands)

    frames = sorted({float(k.get('frame', 0))
                     for c in sprite.findall('Composite')
                     for k in c.findall('Key')})
    mx = max(len(comp.collect_quads(sprite, g)) for g in frames)
    if len(comp.collect_quads(sprite, f)) < 0.5 * mx:
        return None
    return f


def rest_frame(sprite):
    """The standing frame, decided from the rig alone -- no reference needed.

    First choice is the baked/settled frame outside the animation span (see
    baked_frame). Only rigs without one fall through to the heuristic below.

    With visibility now matching the runtime (see compositor_v11.key_visible),
    every animated composite is live for the whole loop, so the only thing the
    frame has to do is (a) be past the flattened duplicate rig, which switches
    itself off with visible="false" on its last key, and (b) sit where the body
    is keyed. Both fall out of one number: the modal first-key frame of the
    multi-key composites. Specimens that ship a duplicate have their real bones
    keyed from 2 (the duplicate occupies 0..1), the rest start at 0.

    This is what makes the pipeline CI-safe: a brand-new specimen needs only
    its own xmz+atlas, never a reference portrait."""
    from collections import Counter
    bf = baked_frame(sprite)
    if bf is not None:
        return bf
    starts = []
    for c in sprite.findall('Composite'):
        ks = c.findall('Key')
        if len(ks) >= 2:
            starts.append(min(float(k.get('frame', 0)) for k in ks))
    if not starts:
        return 0.0
    settle = Counter(starts).most_common(1)[0][0]

    frames = sorted({float(k.get('frame', 0))
                     for c in sprite.findall('Composite')
                     for k in c.findall('Key')})
    base = comp.collect_quads(sprite, settle)
    if not base:
        return settle

    # A part is invisible until its own first key and then stays for good, so
    # late-starting pieces (cauldron liquid, straps, sacs) are simply absent at
    # the settle frame. Later frames are more COMPLETE but drift into the
    # animation. Take the most complete frame, then among equally complete ones
    # the one whose pose is closest to the settle pose -- fully self-contained,
    # no reference art required, which is what makes this CI-safe.
    def pose(f):
        return [(M[4], M[5]) for M, _ in comp.collect_quads(sprite, f)]

    ref_pose = pose(settle)

    def dist(f):
        p = pose(f)
        n = min(len(p), len(ref_pose))
        if not n:
            return 1e9
        return sum(abs(p[i][0] - ref_pose[i][0]) + abs(p[i][1] - ref_pose[i][1])
                   for i in range(n)) / n

    best = None
    for f in frames:
        n = len(comp.collect_quads(sprite, f))
        cand = (n, -dist(f), -f)
        if best is None or cand > best[0]:
            best = (cand, f)
    return best[1]


def stand_frames(sprite):
    """Candidate stand frames, best first: the frames that show the MOST art.

    A composite is only drawn while the playhead is inside its keyframe range,
    so the chosen frame decides which parts exist. Picking by start-frame
    popularity silently dropped whole features -- bf_11 landed on frame 118 and
    lost the 72-image glow composite that ends at 117, bd_11 sat at frame 0 and
    lost the cauldron liquid that starts at 2. Scoring candidate keyframes by
    how many images they actually yield optimises for a complete figure, with
    earlier frames winning ties so we stay near the rest pose."""
    frames = sorted({float(k.get('frame', 0))
                     for c in sprite.findall('Composite')
                     for k in c.findall('Key')})
    if not frames:
        return [0.0]

    # "Structural" composites = the real rig: they stay keyed across most of the
    # animation. The flattened duplicate copy lives only on the first frames
    # ([0,1]) and momentary effects only flash, so both are excluded. Counting
    # ALL live composites instead let effect composites outvote the rest and
    # dragged a_a_12 to frame 47 (mid-lunge).
    span = frames[-1] - frames[0]
    structural = []
    for c in sprite.findall('Composite'):
        ks = c.findall('Key')
        if not ks:
            continue
        fs = [float(k.get('frame', 0)) for k in ks]
        if span <= 0 or (max(fs) - min(fs)) >= 0.5 * span:
            structural.append(c)
    if not structural:
        structural = sprite.findall('Composite')

    def score(f):
        """(coherent?, image count) for a candidate frame.

        Raw image count alone is not enough: a_a_12 has a duplicate skeleton
        grouping alive only on frames 0-1, and that frame yields MORE images
        than the real pose while rendering as scattered debris. So also measure
        whether the quads form one connected mass -- overlap their screen boxes
        and take the largest component's share of total area."""
        quads = comp.collect_quads(sprite, f)
        if not quads:
            return (0, 0)
        boxes = []
        for M, im in quads:
            xs, ys = [], []
            for cx, cy in ((im['dstX'], im['dstY']),
                           (im['dstX'] + im['w'], im['dstY'] + im['h'])):
                px, py = comp.apply(M, cx, cy)
                xs.append(px)
                ys.append(py)
            boxes.append((min(xs), min(ys), max(xs), max(ys)))
        parent = list(range(len(boxes)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                    ri, rj = find(i), find(j)
                    if ri != rj:
                        parent[ri] = rj
        areas = {}
        total = 0.0
        for i, (x0, y0, x1, y1) in enumerate(boxes):
            a = max(1.0, (x1 - x0) * (y1 - y0))
            total += a
            areas[find(i)] = areas.get(find(i), 0.0) + a
        share = max(areas.values()) / total if total else 0
        # Prefer the frame where the REAL rig is live. Specimens ship a
        # duplicate grouping -- one composite holding a flattened copy of the
        # whole body, alive only on the first frames -- alongside the real
        # per-bone composites that start at frame 2. Both yield a similar image
        # count (ce_99: 35 vs 35), so counting images alone tied and picked the
        # flattened copy, which is subtly poorer (ce_99 lost a tail segment).
        # The real rig is always many composites instead of one.
        live = sum(1 for c in structural
                   if comp.key_visible(c.findall('Key'), f))
        # Deliberately NOT ranking on image count: mid-animation frames carry
        # extra transient art (a_a_12 scored 29 images at frame 41 vs 28 at
        # frame 2 and rendered mid-lunge, f_c_12 swung its sword). Once the rig
        # is fully live, the EARLIEST such frame is the rest pose the game's
        # own portraits use, and ties resolve to it below.
        return (1 if share >= 0.85 else 0, live)

    # The rest pose is the frame the body settles onto: the MODE of the rig's
    # own start frames (0 for some specimens, 2 for most). Ranking purely by
    # "most parts" walked into mid-animation (a_a_12 mid-lunge, f_c_12 mid
    # sword-swing); relaxing to a 90% threshold instead dropped bd_11's
    # cauldron liquid, which only starts at frame 2. The rig's modal start
    # satisfies both: every structural composite is keyed by then, and it is
    # the earliest such moment.
    from collections import Counter
    starts = [min(float(k.get('frame', 0)) for k in c.findall('Key'))
              for c in structural if c.findall('Key')]
    if starts:
        modal = Counter(starts).most_common(1)[0][0]
        # Nudge forward to catch rig parts that join just after the body does
        # (bd_11's cauldron liquid starts at 2 while the rest starts at 0), but
        # ignore far-off starts, which are animation beats rather than parts of
        # the resting pose (f_c_12's sword swing joins at 16).
        near = [s for s in starts if modal <= s <= modal + 5]
        preferred = max(near) if near else modal
    else:
        preferred = frames[0]
    # Order: must be coherent, then the rig's settle frame, then most parts.
    # The settle frame outranks part count on purpose -- extra parts appearing
    # later are mid-animation flourishes, not the resting silhouette.
    scored = []
    for f in frames:
        coh, live = score(f)
        scored.append(((coh, 1 if f == preferred else 0, live), -f, f))
    scored.sort(reverse=True)
    return [f for _, _, f in scored]


def segmented_rig(sprite):
    """True if this rig is built like ca_14: a chain of sequential segments.

    THE POINT OF THIS CHECK is the next ca_14, not this one. A segmented-dance
    specimen has no rest pose, so the autonomous frame rule picks something
    wrong (~0.34 for ca_14) and CI would push broken art with no reference on
    disk to catch it. We cannot derive the right pose for such a rig -- proven
    for ca_14, whose portrait is mirrored by hand -- but we CAN recognise the
    shape and demand a human look.

    Discriminator is the RATIO, not the count: ca_14 is 3 sequential segments
    out of 5 composites (60%), while normal rigs that happen to contain a few
    sequential spans sit at 8-29% (a_f 4/14, f_c_10 4/20, c_d 2/24)."""
    spans = []
    for c in sprite.findall('Composite'):
        ks = c.findall('Key')
        if not ks:
            continue
        fs = [float(k.get('frame', 0)) for k in ks]
        spans.append((min(fs), max(fs)))
    if len(spans) < 3:
        return False
    spans.sort()
    seq = sum(1 for i in range(1, len(spans)) if spans[i][0] >= spans[i - 1][1])
    return seq >= 0.5 * len(spans)


def render_override(xml_path, png, sid, sprite, spec, out_path):
    """Render one specimen from POSE_OVERRIDES: one segment, own timeline."""
    import copy
    import xml.etree.ElementTree as ET
    from PIL import Image, ImageOps
    seg = copy.deepcopy(sprite.findall('Composite')[spec['segment']])
    # Drop the segment's own gate keys so its inner rig can be sampled at the
    # requested frame instead of being switched off by the outer timeline.
    for k in list(seg.findall('Key')):
        seg.remove(k)
    ET.SubElement(seg, 'Key', {'frame': '0'})
    one = ET.Element('Sprite', sprite.attrib)
    one.append(seg)
    img = comp.compose(xml_path, png, sid, None, frame=spec['frame'],
                       quiet=True, sprite=one)
    if img is None:
        raise RuntimeError('override render produced nothing')
    if spec.get('mirror'):
        img = ImageOps.mirror(img)
    img.save(out_path)
    return img


# Sverkhmassivnaya beskonechnost (de_14) is a three-headed dragon whose body
# rig bundles everything under one top-level Composite -> Sprite holding 23
# nested composites. Three of those (indices 10, 21, 22) are head art keyed
# to position windows that never overlap frame 0 or each other, so no single
# global frame -- with or without FRAME_OVERRIDES/COMPOSITE_DROPS -- can show
# a correctly assembled creature; the production render was quietly missing
# a whole head plus a neck-ring segment (composite 6), which has its OWN
# separate bug: its 3-way texture toggle is keyed visible only on frames 2-3,
# entirely outside frame 0, so it vanished from every render regardless of
# head placement.
#
# Assembled by hand against a reference screenshot: an interactive tool
# isolated each of the 23 composites on a shared canvas (each patched to a
# synthetic frame-0 key so its own content-visibility window couldn't hide
# it, borrowing position from any point along its native trajectory) and let
# a human drag pieces into place, since eyeballing 3D-projected dragon-head
# alignment is not something the frame-selection heuristics below can do.
# Result, confirmed against the reference:
#   - composite 11 is a redundant/misplaced head once 10 is placed
#     correctly -- dropped entirely.
#   - composite 10 (a head) reads correctly using the pose from its own
#     trajectory frame 178, no extra offset needed.
#   - composite 20 (the other head) needed BOTH a different trajectory point
#     (102, not its natural frame-0 pose) AND a (+108, -11) nudge on top.
#   - composite 21 (a mane/collar behind one head) is invisible in the
#     default render (position window starts at frame 67) but belongs in
#     the assembled pose at its own trajectory frame 124.
# All four use frame=0 as the graft's shared timeline (FRAME_OVERRIDES pins
# rendering to 0.0 above), matching how each was authored here.
DE14_HEAD_SOURCE_FRAME = {10: 178.0, 20: 102.0, 21: 124.0}
DE14_HEAD_OFFSET = {10: (0.0, 0.0), 20: (108.0, -11.0), 21: (0.0, 0.0)}
DE14_DROP = {11}


def de14_manual_graft(sprite):
    """Return a deep copy of de_14's sprite with the manually-assembled
    3-head pose baked in -- see the block comment above."""
    out = copy.deepcopy(sprite)
    comp0 = out.findall('Composite')[0]
    child = comp0.find('Sprite')
    nested = child.findall('Composite')  # snapshot before any removal

    targets = {i: nested[i] for i in list(DE14_HEAD_SOURCE_FRAME) + [6]}
    for i in DE14_DROP:
        child.remove(nested[i])

    for idx, source_frame in DE14_HEAD_SOURCE_FRAME.items():
        comp_el = targets[idx]
        keys = comp_el.findall('Key')
        x, y, ang, sx, sy = comp.interp_key(keys, source_frame)
        odx, ody = DE14_HEAD_OFFSET[idx]
        for k in list(keys):
            comp_el.remove(k)
        ET.SubElement(comp_el, 'Key', {
            'frame': '0', 'x': str(x + odx), 'y': str(y + ody),
            'angle': str(math.degrees(ang)), 'scaleX': str(sx), 'scaleY': str(sy),
        })

    # composite 6's neck-ring segment: its middle texture variant (the 2nd of
    # 3 nested composites -- the other two are either always hidden or keyed
    # even later) is only keyed visible on frames 2-3. Retime those two Keys
    # down by 2 so the segment survives evaluation at the shared frame 0
    # instead of silently vanishing (found the same way as the heads: content
    # was verified visible by rendering this composite in isolation at
    # frame 2).
    ring = targets[6].find('Sprite').findall('Composite')[1]
    for k in ring.findall('Key'):
        f = float(k.get('frame', 0))
        if f == 2.0:
            k.set('frame', '0')
        elif f == 3.0:
            k.set('frame', '1')

    return out


# Halkomyak (de_05) is a hamster-in-a-wheel mech; the hamster itself lives in
# top-level composite 6, whose own outer Keys trace the wheel's spin (a full
# 360-degree loop across frames 0-52) and whose child Sprite holds 7 nested
# Composites -- one per running-pose sprite -- keyed two frames apart (0-1,
# 2-3, 4-5, ... 12-13). Every one of those 14 Keys carries visible="false" on
# BOTH ends, so no pose is ever shown at any frame: the hamster is invisible
# in every render regardless of frame choice, which is why it read as an
# empty wheel. The 7 poses were compared side by side (contact sheet) against
# a reference render; pose index 3 (source Keys at frames 6/7) reads closest
# to it -- forward-facing, both ears visible, brow furrowed. Retimed down to
# 0/1 (matching this file's frame=0.0 pin above) and un-hidden.
def de05_manual_fix(sprite):
    """Return a deep copy of de_05's sprite with the hamster's pose 3 shown."""
    out = copy.deepcopy(sprite)
    wheel = out.findall('Composite')[6].find('Sprite').findall('Composite')[0]
    pose = wheel.find('Sprite').findall('Composite')[3]
    for k in pose.findall('Key'):
        f = float(k.get('frame', 0))
        if f == 6.0:
            k.set('frame', '0')
        elif f == 7.0:
            k.set('frame', '1')
        if k.get('visible') == 'false':
            del k.attrib['visible']
    return out
