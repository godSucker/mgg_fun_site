# Frame-selection + pose logic reused verbatim from
# 4443/FULL_TEXTURES/batch_render_stands.py (rig-derived, CI-safe).
import copy
import xml.etree.ElementTree as ET
from collections import Counter
import compositor as comp


FRAME_OVERRIDES = {}


POSE_OVERRIDES = {
    'ca_14': {'segment': 0, 'frame': 22.0, 'mirror': True},
}


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
