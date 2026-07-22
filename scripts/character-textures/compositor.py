# Adapted from 4443/FULL_TEXTURES/compositor_v11.py for the WEB-PNG route.
# Two changes vs original (both validated against approved mobile render):
#   1) Y-flip disabled (web PNG is top-origin).
#   2) qx=qy=1.0 when geometry has no packSz (unpacked atlas).
#!/usr/bin/env python3
"""
MGG Texture Compositor v11 -- SOLVED via ground-truth capture.

The one remaining bug in v10 was the image LOCAL QUAD formula. Ground truth
was obtained by hooking Renderer::drawQuads (0x8ed0d4) filtered to the caller
inside SpritePlayBack::draw (return addr 0x85182c) -- those are the mutant's
own image quads -- and reading, per quad: the 4 local vertices, the UVs, and
the accumulated matrix from the renderer's matrix stack (renderer+0x1f6400).

What the capture proved (see raw dump in leaf_capture.txt):
  * local quad size == UV-region size (in 479-atlas space) == XML width/height
    (width/height ARE the atlas crop size, NOT a display size).
  * local quad corners == (dstX, dstY), (dstX+w, dstY), (dstX, dstY+h),
    (dstX+w, dstY+h).  i.e. dstX/dstY is the TOP-LEFT of the image in the
    composite's local space -- NOT a pivot subtracted from it. v10 used
    (-dstX,-dstY)..(w-dstX,h-dstY), which is why every prior render scattered.
  * corner (dstX,dstY) maps to atlas (srcX,srcY) (top-left), +y goes down the
    image toward srcY+h. Standard top-left mapping, no flip needed when the
    atlas PNG is top-origin (ours is).
  * the accumulated matrix (parent x local, R(angle)S(sx,sy) with the v10
    formula) was verified against live memory to 0.0003 -- unchanged here.
  * key x/y are used as-is (NO y-inversion).

So v11 == v10's (verified) matrix pipeline + the corrected local-quad formula.
Rendering with a clean affine warp per quad (atlas region -> screen quad).
"""
import math
import os
import sys
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw


def parse_xml(xml_path, sprite_id):
    root = ET.parse(xml_path).getroot()
    for sprite in root.iter('Sprite'):
        if sprite.get('id') == sprite_id:
            return sprite
    return None


def interp_key(keys, frame):
    """Interpolate composite transform at a fractional frame (matches the
    game's CompositePlayBack::update linear interpolation)."""
    keys = sorted(keys, key=lambda k: float(k.get('frame', 0)))
    if not keys:
        return (0.0, 0.0, 0.0, 1.0, 1.0)
    prev = nxt = None
    for k in keys:
        f = float(k.get('frame', 0))
        if f <= frame:
            prev = k
        if f >= frame and nxt is None:
            nxt = k
    if prev is None:
        prev = keys[0]
    if nxt is None:
        nxt = keys[-1]
    pf, nf = float(prev.get('frame', 0)), float(nxt.get('frame', 0))
    t = 0.0 if nf == pf else min(1.0, (frame - pf) / (nf - pf))

    def g(k, name, default):
        v = k.get(name)
        return float(v) if v is not None else default

    x = g(prev, 'x', 0) + t * (g(nxt, 'x', 0) - g(prev, 'x', 0))
    y = g(prev, 'y', 0) + t * (g(nxt, 'y', 0) - g(prev, 'y', 0))
    ang = g(prev, 'angle', 0) + t * (g(nxt, 'angle', 0) - g(prev, 'angle', 0))
    sx = g(prev, 'scaleX', 1) + t * (g(nxt, 'scaleX', 1) - g(prev, 'scaleX', 1))
    sy = g(prev, 'scaleY', 1) + t * (g(nxt, 'scaleY', 1) - g(prev, 'scaleY', 1))
    return (x, y, math.radians(ang), sx, sy)


def key_visible(keys, frame):
    """Visibility exactly as CompositePlayBack::update computes it.

    The disassembly sets this->visible from a per-key flag: when the flag is
    set the composite is simply on, otherwise it is on only while
    floor(time) equals the surrounding keyframe. There is NO "hide outside the
    keyframe range" rule -- that was my invention, and it is what silently
    deleted body parts whose composites happen to start late (bd_11's cauldron
    liquid is keyed [2,86] and vanished at frame 0, ce_99's whole 32-bone rig
    is keyed [2,117]). Multi-key composites animate, so they stay visible with
    their values clamped at both ends; a lone key is a momentary flash (sparks,
    huge-scale effects) and shows only on its own frame.

    An explicit visible="false" on the active key really does hide it -- that
    is how the flattened duplicate rig switches itself off after frame 1, so it
    must NOT be second-guessed (an earlier "treat a trailing visible=false as
    transient" “ heuristic resurrected that duplicate on top of the real body)."""
    ks = sorted(keys, key=lambda k: float(k.get('frame', 0)))
    if not ks:
        return True
    first = float(ks[0].get('frame', 0))
    # Before the first key the runtime is still holding its sentinel entry
    # (setup writes frame -1 and a zero flag there), so nothing draws. This is
    # asymmetric: after the LAST key the composite keeps drawing, because the
    # sentinel only sits on the "previous" side. Hiding on both ends -- my
    # earlier guess -- deleted late-starting parts; clamping on both ends --
    # the next guess -- wrongly showed parts before they exist. Verified
    # against a live capture of a_a_12 at frame 10.8: bones keyed [2,101] were
    # vis=1, the composite keyed [41,80] was vis=0.
    if frame < first:
        return False
    active = ks[0]
    for k in ks:
        if float(k.get('frame', 0)) <= frame:
            active = k
        else:
            break
    return active.get('visible') != 'false'


def local_matrix(x, y, ang, sx, sy):
    """Composite local transform, column-vector affine (a,b,c,d,tx,ty) with
    screen = M*point. Verified against live memory (0.0003)."""
    c, s = math.cos(ang), math.sin(ang)
    return (c * sx, -s * sy, s * sx, c * sy, x, y)


def mat_mul(P, L):
    """Compose parent x local (both 2x3 affine)."""
    ap, bp, cp, dp, tpx, tpy = P
    al, bl, cl, dl, tlx, tly = L
    return (ap * al + bp * cl,
            ap * bl + bp * dl,
            cp * al + dp * cl,
            cp * bl + dp * dl,
            ap * tlx + bp * tly + tpx,
            cp * tlx + dp * tly + tpy)


def apply(M, x, y):
    a, b, c, d, tx, ty = M
    return (a * x + b * y + tx, c * x + d * y + ty)


def collect_quads(sprite, frame):
    """Walk the composite tree, returning (matrix, image) for every visible
    image at the given frame. image = dict(srcX,srcY,dstX,dstY,w,h)."""
    out = []

    def interp_alpha(keys, frame):
        """Composite opacity at `frame`, interpolated like the transform.

        Ignoring this drew translucent art opaque: e_f_09 keys its flame core
        at alpha=0.8, and painting it solid put a white blob over the head so
        the face vanished. Alpha MULTIPLIES down the tree the way the runtime
        accumulates it, so a faded parent fades its children too."""
        ks = sorted(keys, key=lambda k: float(k.get('frame', 0)))
        if not ks:
            return 1.0
        prev = nxt = None
        for k in ks:
            f = float(k.get('frame', 0))
            if f <= frame:
                prev = k
            if f >= frame and nxt is None:
                nxt = k
        prev = prev or ks[0]
        nxt = nxt or ks[-1]
        pf, nf = float(prev.get('frame', 0)), float(nxt.get('frame', 0))
        t = 0.0 if nf == pf else min(1.0, (frame - pf) / (nf - pf))
        pa = float(prev.get('alpha', 1))
        na = float(nxt.get('alpha', 1))
        return pa + t * (na - pa)

    def walk(composite, parent, palpha=1.0):
        keys = composite.findall('Key')
        if not key_visible(keys, frame):
            return
        x, y, ang, sx, sy = interp_key(keys, frame)
        M = mat_mul(parent, local_matrix(x, y, ang, sx, sy))
        alpha = palpha * interp_alpha(keys, frame)
        child = composite.find('Sprite')
        if child is None:
            return
        emit(child, M, alpha)

    def add(im, M, alpha=1.0):
        # a/b/c/d is the image's OWN 2x2 matrix, mapping its atlas pixels into
        # the composite's local space. Verified against live quads: the belly
        # piece of a_d carries a=d=1.5234 and the game draws it 136*1.5234 =
        # 207.19 wide, exactly. Most images carry a=d=packSz/atlasSize, which
        # is why a single global scale looked right for the majority and only
        # a few parts came out wrong-sized (and were then hidden under others).
        out.append((M, dict(
            srcX=float(im.get('srcX', 0)), srcY=float(im.get('srcY', 0)),
            dstX=float(im.get('dstX', 0)), dstY=float(im.get('dstY', 0)),
            w=float(im.get('width', 0)), h=float(im.get('height', 0)),
            a=float(im.get('a', 1)), b=float(im.get('b', 0)),
            c=float(im.get('c', 0)), d=float(im.get('d', 1)),
            alpha=alpha,
            has_m=(im.get('a') is not None or im.get('d') is not None))))

    def emit(sprite_el, M, alpha=1.0):
        """Images directly under a Sprite, plus those inside a flipbook.

        Some sprites are sub-animations: <Sprite framerate="2"> holding a list
        of <Frame> elements, each with its own <Image>/<Composite>. That art is
        NOT a direct child, so walking only direct <Image>/<Composite> drops it
        silently -- it cost d_d 94 of its 95 images (the cat rendered as a bare
        head) and clipped details off 11 other specimens. For a static stand we
        take the first frame as the representative one."""
        for im in sprite_el.findall('Image'):
            add(im, M, alpha)

        frames = sprite_el.findall('Frame')
        if frames:
            # Pick the flipbook's MODAL frame: group frames by the art they
            # hold and take the most frequent variant. A blink or a flicker
            # only occupies a couple of frames, so the modal one is the pose
            # the specimen actually holds -- taking frame[0] gave d_d shut
            # eyes, and taking the "richest" frame picks transient effects.
            from collections import Counter

            def sig(f):
                return tuple(sorted(
                    (i.get('srcX'), i.get('srcY'), i.get('width'), i.get('height'))
                    for i in f.findall('Image')))

            counts = Counter(sig(f) for f in frames)
            # prefer the most common signature; break ties toward more art
            best_sig = max(counts, key=lambda s: (counts[s], len(s)))
            first = next(f for f in frames if sig(f) == best_sig)
            for im in first.findall('Image'):
                add(im, M, alpha)
            for nested in first.findall('Composite'):
                walk(nested, M, alpha)
            for nested in first.findall('Sprite'):
                emit(nested, M, alpha)
        for nested in sprite_el.findall('Composite'):
            walk(nested, M, alpha)

    identity = (1, 0, 0, 1, 0, 0)
    for comp in sprite.findall('Composite'):
        walk(comp, identity)
    return out


def compose(xml_path, atlas_path, sprite_id, output_path, frame=0.0,
            scale=1.0, quiet=False, atlas=None, sprite=None, ss=1):
    """Render one frame. `scale` shrinks the output (cheap previews used to
    score many candidate frames against the game's own portrait); `atlas` and
    `sprite` let a caller pass already-parsed objects to avoid re-loading them
    for every frame. Returns the PIL image (also saved when output_path).

    `ss` is supersampling: render the whole scene ss times larger and shrink it
    back with LANCZOS. Each piece is masked by a hard-edged polygon, so at ss=1
    every part boundary is aliased -- and since half the specimens ship a
    DOWNSCALED atlas (packSz up to 1.44x the texture, see below), those jagged
    edges then get stretched. Supersampling costs ss^2 render time and fixes
    the edges; it cannot invent detail the shipped atlas never had."""
    if atlas is None:
        atlas = Image.open(atlas_path).convert('RGBA')
    AW, AH = atlas.size
    if sprite is None:
        sprite = parse_xml(xml_path, sprite_id)
    if sprite is None:
        print("sprite %s not found" % sprite_id)
        return
    quads = collect_quads(sprite, frame)
    eff = scale * ss
    if eff != 1.0:
        quads = [(tuple(v * eff for v in M), im) for M, im in quads]
    if not quads:
        return None
    if not quiet:
        print("visible images at frame %.1f: %d" % (frame, len(quads)))

    # srcX/srcY/width/height are in the sprite's LOGICAL atlas space (packSz).
    # The shipped texture is squeezed into the GPU limit (usually 512), or in
    # some cases doubled, so the decoded PNG rarely equals packSz. Convert
    # logical -> actual atlas pixels, otherwise every crop is taken from the
    # wrong place at the wrong scale (missing details + smearing) on every
    # specimen whose packSz != atlas size.
    # Atlas CROPS are 1:1 in shipped-atlas pixels (verified by cropping a_e both
    # ways: unscaled gives clean whole parts, scaled gives misaligned garbage).
    # But when packSz > the shipped texture the atlas was downscaled to fit the
    # GPU limit while the GEOMETRY (bone x/y, dstX/dstY) stayed in logical
    # packSz units -- so a w*h crop is too small for the skeleton and parts
    # drift apart. Scale the quad's SIZE (not its crop) back to logical units.
    packs = {int(s.get('packSz')) for s in sprite.iter('Sprite') if s.get('packSz')}
    # WEB ROUTE: unpacked atlas has no packSz -> 1:1 crop (qx=qy=1.0).
    # The mobile fallback pack=AW only stayed isotropic because mobile
    # atlases are square; a non-square web atlas (e.g. 869x585) would get
    # qy=AW/AH and stretch vertically.
    pack = max(packs) if packs else None
    if pack is None:
        qx = qy = 1.0
    else:
        qx, qy = pack / float(AW), pack / float(AH)

    # local quad corners = (dstX,dstY),(dstX+w,dstY),(dstX+w,dstY+h),(dstX,dstY+h)
    def corners(im):
        """local = (dstX,dstY) + [[a,b],[c,d]] * (atlas-pixel offset)."""
        dx, dy = im['dstX'], im['dstY']
        # Older exports omit a/d entirely; those files always have
        # packSz == atlas size, so the packSz ratio is the right fallback.
        a = im['a'] if im['has_m'] else qx
        d = im['d'] if im['has_m'] else qy
        b, cc = im['b'], im['c']
        w, h = im['w'], im['h']
        pts = [(0, 0), (w, 0), (w, h), (0, h)]
        # a/b/c/d is COLUMN-major: x' = a*px + c*py, y' = b*px + d*py.
        # Proven against live capture (c_d, 24 quads): transposed gives max
        # error 0.1 px / mean 0.03 px, the other way round gives 30.9 px.
        # The bug hid for the whole project because b and c are zero on every
        # unrotated image -- only pieces with their own rotation were wrong,
        # which read as "the scythe floats off" (f_b), "the leg is broken"
        # (a_d) and two displaced parts on c_d.
        return [(dx + a * px + cc * py, dy + b * px + d * py) for px, py in pts]

    xs, ys = [], []
    for M, im in quads:
        for cx, cy in corners(im):
            sxp, syp = apply(M, cx, cy)
            xs.append(sxp)
            ys.append(syp)
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    pad = 10
    W = int(maxx - minx) + 2 * pad
    H = int(maxy - miny) + 2 * pad
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    for M, im in quads:
        cs = corners(im)
        dst = [(apply(M, cx, cy)[0] - minx + pad, apply(M, cx, cy)[1] - miny + pad)
               for cx, cy in cs]
        sx0, sy0, w, h = im['srcX'], im['srcY'], im['w'], im['h']
        # Atlas Y is FLIPPED relative to the XML srcY convention: the game's
        # UV v maps straight onto our decoded PNG's y, and ground truth shows
        # local (dstX,dstY) -> PNG y = AH-srcY, local (dstX,dstY+h) -> AH-srcY-h.
        # (verified: XML srcY=360,h=79 -> PNG rows 40..119, exactly the captured
        # UV span). Sampling at the un-flipped srcY hits mirrored/empty atlas
        # regions, which is what made every earlier render look scattered.
        # WEB ROUTE: PNG atlas is top-origin (direct srcY), no flip.
        fy0 = sy0
        fy1 = sy0 + h
        src = [(sx0, fy0), (sx0 + w, fy0), (sx0 + w, fy1), (sx0, fy1)]
        A = np.zeros((8, 6))
        b = np.zeros(8)
        for i in range(4):
            A[2 * i] = [dst[i][0], dst[i][1], 1, 0, 0, 0]
            b[2 * i] = src[i][0]
            A[2 * i + 1] = [0, 0, 0, dst[i][0], dst[i][1], 1]
            b[2 * i + 1] = src[i][1]
        coeffs, _, _, _ = np.linalg.lstsq(A, b, rcond=None)
        warped = atlas.transform((W, H), Image.AFFINE, coeffs, resample=Image.BICUBIC)
        fill = 255
        a = im.get('alpha', 1.0)
        if a < 1.0:
            fill = max(0, min(255, int(round(255 * a))))
        mask = Image.new('L', (W, H), 0)
        ImageDraw.Draw(mask).polygon([tuple(p) for p in dst], fill=fill)
        canvas.paste(warped, (0, 0),
                     Image.composite(warped.split()[3], Image.new('L', (W, H), 0), mask))

    bbox = canvas.getbbox()
    if bbox:
        canvas = canvas.crop(bbox)
    if ss != 1:
        canvas = canvas.resize((max(1, canvas.width // ss),
                                max(1, canvas.height // ss)), Image.LANCZOS)
    if output_path:
        canvas.save(output_path)
        if not quiet:
            print("saved %s (%dx%d)" % (output_path, canvas.width, canvas.height))
    return canvas


if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    frame = float(sys.argv[1]) if len(sys.argv) > 1 else 0.0
    compose(os.path.join(base, 'character_a_a_12.xml'),
            os.path.join(base, 'a_a_12_atlas.png'),
            'specimen_AA_12_stand',
            os.path.join(base, 'compositor_v11_output.png'),
            frame=frame)
