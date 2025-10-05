#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse, json
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

IMG_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def list_images(root: Path) -> List[Path]:
    return sorted([p for p in root.rglob("*") if p.suffix.lower() in IMG_EXTS and p.is_file()])

def downscale_maxdim(img: np.ndarray, max_dim: int) -> np.ndarray:
    if max_dim <= 0: return img
    h, w = img.shape[:2]
    m = max(h, w)
    if m <= max_dim: return img
    s = max_dim / m
    return cv2.resize(img, (int(round(w*s)), int(round(h*s))), interpolation=cv2.INTER_AREA)

def find_circles(img_bgr: np.ndarray, verbose=False) -> List[Tuple[int,int,int]]:
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)
    h, w = gray.shape[:2]
    cands: List[np.ndarray] = []
    for dp in (1.2, 1.4):
        for p2 in (28, 32, 36, 40):
            for minr_scale, maxr_scale in ((0.06,0.16),(0.08,0.20),(0.05,0.22)):
                minR = int(min(h, w) * minr_scale)
                maxR = int(min(h, w) * maxr_scale)
                try:
                    circles = cv2.HoughCircles(
                        gray, cv2.HOUGH_GRADIENT, dp=dp, minDist=min(h, w)//10,
                        param1=120, param2=p2, minRadius=minR, maxRadius=maxR
                    )
                except cv2.error:
                    circles = None
                if circles is not None and len(circles[0]) >= 6:
                    cands.append(circles[0])
    if not cands: return []
    def score(cset: np.ndarray) -> float:
        n = len(cset); r_mean = float(np.mean(cset[:,2])); r_std = float(np.std(cset[:,2]))
        return -abs(n - 9) - 0.05*abs(r_mean - min(h, w)*0.11) - 0.2*r_std
    best = max(cands, key=score)
    if len(best) > 9:
        r_mean = float(np.mean(best[:,2]))
        best = np.array(sorted(best, key=lambda c: abs(c[2]-r_mean))[:9])
    return [(int(x), int(y), int(r)) for (x,y,r) in best]

def sort_3x3(cs: List[Tuple[int,int,int]]) -> List[Tuple[int,int,int]]:
    if len(cs) != 9: return cs
    cs_sorted = sorted(cs, key=lambda c: c[1])
    rows = [cs_sorted[i*3:(i+1)*3] for i in range(3)]
    rows = sorted(rows, key=lambda row: np.mean([c[1] for c in row]))
    rows = [sorted(row, key=lambda c: c[0]) for row in rows]
    return [c for row in rows for c in row]

def crop_square(img: np.ndarray, x: int, y: int, r: int, scale: float = 1.30) -> np.ndarray:
    side = int(max(12, r * 2 * scale))
    half = side // 2
    x0 = max(0, x - half); y0 = max(0, y - half)
    x1 = min(img.shape[1], x0 + side); y1 = min(img.shape[0], y0 + side)
    return img[y0:y1, x0:x1].copy()

# --------------------- Модель (в точности как в обучении) ---------------------
class SmallCNN(nn.Module):
    def __init__(self, num_classes: int):
        super().__init__()
        ch = [32, 64, 128, 256]
        self.net = nn.Sequential(
            nn.Conv2d(3, ch[0], 3, padding=1), nn.BatchNorm2d(ch[0]), nn.ReLU(inplace=True),
            nn.Conv2d(ch[0], ch[0], 3, padding=1), nn.BatchNorm2d(ch[0]), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),

            nn.Conv2d(ch[0], ch[1], 3, padding=1), nn.BatchNorm2d(ch[1]), nn.ReLU(inplace=True),
            nn.Conv2d(ch[1], ch[1], 3, padding=1), nn.BatchNorm2d(ch[1]), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),

            nn.Conv2d(ch[1], ch[2], 3, padding=1), nn.BatchNorm2d(ch[2]), nn.ReLU(inplace=True),
            nn.Conv2d(ch[2], ch[2], 3, padding=1), nn.BatchNorm2d(ch[2]), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),

            nn.Conv2d(ch[2], ch[3], 3, padding=1), nn.BatchNorm2d(ch[3]), nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d(1)
        )
        # ВАЖНО: Flatten внутри head — чтобы ключи совпали (head.2/head.5)
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.25),
            nn.Linear(ch[3], 512), nn.ReLU(inplace=True),
            nn.Dropout(0.25),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        f = self.net(x)            # (B,256,1,1)
        return self.head(f)        # head начинается с Flatten()

    @torch.no_grad()
    def features(self, x) -> torch.Tensor:
        f = self.net(x)
        return torch.flatten(f, 1)  # (B,256)

def load_labels_weights(weights_dir: Path):
    labels_path = weights_dir / "orb_labels.json"
    weights_path = weights_dir / "orb_cnn.pth"
    label2idx = json.loads(labels_path.read_text(encoding="utf-8"))
    idx2label = {v:k for k,v in label2idx.items()}
    model = SmallCNN(num_classes=len(idx2label))
    sd = torch.load(weights_path, map_location=DEVICE)
    model.load_state_dict(sd, strict=True)  # теперь ключи совпадают
    model.to(DEVICE).eval()
    return model, idx2label

# ---------- mini-transforms (без torchvision) ----------
def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    arr = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    return torch.from_numpy(arr).permute(2, 0, 1).contiguous()

def normalize_(t: torch.Tensor, mean=(0.5,0.5,0.5), std=(0.5,0.5,0.5)) -> torch.Tensor:
    for c in range(3):
        t[c].sub_(mean[c]).div_(std[c])
    return t

def prepare_tensor_from_pil(pil: Image.Image, size: int = 128) -> torch.Tensor:
    pil2 = pil.resize((size,size), Image.BICUBIC)
    return normalize_(pil_to_tensor(pil2)).unsqueeze(0).to(DEVICE)

def center_crop_scale_pil(pil: Image.Image, scale: float = 0.88) -> Image.Image:
    w, h = pil.size
    side = int(min(w, h) * scale)
    x0 = (w - side) // 2
    y0 = (h - side) // 2
    return pil.crop((x0, y0, x0 + side, y0 + side))

def donut_mask_pil(pil: Image.Image, inner: float = 0.30, outer: float = 0.85) -> Image.Image:
    """Оставляем центральную область, глушим внешний обод и фон."""
    w, h = pil.size
    arr = np.asarray(pil.convert("RGB"), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = (w-1)/2.0, (h-1)/2.0
    r = np.sqrt((xx - cx)**2 + (yy - cy)**2)
    R = min(w, h) / 2.0
    m = ((r >= inner*R) & (r <= outer*R)).astype(np.float32)[..., None]
    out = arr * m + 255.0 * (1.0 - m)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return Image.fromarray(out, mode="RGB")

def prepare_patch(img_bgr: np.ndarray, size: int = 128) -> torch.Tensor:
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    return prepare_tensor_from_pil(pil, size=size)

def rotate_bgr(img_bgr: np.ndarray, angle_deg: float) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    M = cv2.getRotationMatrix2D((w/2, h/2), angle_deg, 1.0)
    return cv2.warpAffine(img_bgr, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

@torch.no_grad()
def logits_to_conf_id(model: SmallCNN, x: torch.Tensor, idx2label: Dict[int,str], T: float = 1.3) -> Tuple[str, float]:
    logits = model(x)
    if T and T != 1.0:
        logits = logits / T
    prob = torch.softmax(logits, dim=1)
    conf, pred = prob.max(dim=1)
    return idx2label[int(pred.item())], float(conf.item())

# --------------------- k-NN по эмбеддингам ---------------------
@torch.no_grad()
def embed_tensor(model: SmallCNN, x: torch.Tensor) -> torch.Tensor:
    return model.features(x)  # (B,256)

def cosine_sim(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    a_n = a / (a.norm(dim=1, keepdim=True) + 1e-8)
    b_n = b / (b.norm(dim=1, keepdim=True) + 1e-8)
    return torch.mm(a_n, b_n.t())  # (N, M)

def load_template_protos(templates_root: Path, label_names: List[str], size: int = 128) -> Dict[str, Image.Image]:
    """Грузим PIL шаблоны по stem (ищем в basic и special)."""
    protos: Dict[str, Image.Image] = {}
    for name in label_names:
        stem = name
        found = None
        for sub in ("basic", "special"):
            for ext in (".png", ".jpg", ".jpeg", ".webp"):
                p = templates_root / sub / f"{stem}{ext}"
                if p.exists():
                    found = p; break
            if found: break
        if found:
            img = Image.open(found).convert("RGB").resize((size,size), Image.BICUBIC)
            protos[stem] = img
    return protos

@torch.no_grad()
def build_proto_embeddings(model: SmallCNN, protos: Dict[str, Image.Image], size: int = 128) -> Tuple[List[str], torch.Tensor]:
    names = []
    feats = []
    for stem, pil in protos.items():
        x = prepare_tensor_from_pil(pil, size=size)  # (1,3,H,W)
        f = embed_tensor(model, x)                   # (1,256)
        names.append(stem)
        feats.append(f.cpu())
    if not feats:
        return [], torch.empty(0,256)
    F = torch.cat(feats, dim=0)  # (M,256)
    return names, F

def predict_id_knn(model: SmallCNN, patch_bgr: np.ndarray,
                   proto_names: List[str], proto_feats: torch.Tensor, try_angles=True) -> Tuple[str, float]:
    """Возвращает (stem, cosine_sim)."""
    cands: List[Tuple[str, float]] = []
    def add_variant(img_bgr):
        x = prepare_patch(img_bgr, size=128)
        f = embed_tensor(model, x)  # (1,256)
        if proto_feats.numel() == 0:
            return
        sims = cosine_sim(f.cpu(), proto_feats)  # (1,M)
        v, j = torch.max(sims, dim=1)
        cands.append((proto_names[int(j.item())], float(v.item())))
    add_variant(patch_bgr)
    if try_angles:
        cnt = 0
        for ang in range(0, 360, 10):
            add_variant(rotate_bgr(patch_bgr, ang)); cnt += 1
            if cnt >= 12: break
    rgb = cv2.cvtColor(patch_bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    add_variant(cv2.cvtColor(np.array(center_crop_scale_pil(pil, 0.88)), cv2.COLOR_RGB2BGR))
    add_variant(cv2.cvtColor(np.array(donut_mask_pil(pil, inner=0.30, outer=0.85)), cv2.COLOR_RGB2BGR))
    if not cands:
        return "", 0.0
    best = max(cands, key=lambda t: t[1])
    return best[0], best[1]

# --------------------- общий предикт ---------------------
def predict_id(model: SmallCNN, idx2label: Dict[int,str],
               patch_bgr: np.ndarray,
               proto_names: List[str], proto_feats: torch.Tensor,
               try_angles=True) -> Tuple[str, float]:
    # 1) мягкий softmax
    x = prepare_patch(patch_bgr, size=128)
    best_id, best_conf = logits_to_conf_id(model, x, idx2label, T=1.3)
    best_angle = 0
    if not try_angles or best_conf >= 0.85:
        return best_id, best_conf
    for ang in range(0, 360, 10):
        rot = rotate_bgr(patch_bgr, ang)
        oid, conf = logits_to_conf_id(model, prepare_patch(rot, 128), idx2label, T=1.3)
        if conf > best_conf:
            best_conf, best_id, best_angle = conf, oid, ang
            if best_conf >= 0.90:
                return best_id, best_conf
    # 2) fallback: k-NN по признакам
    knn_id, knn_sim = predict_id_knn(model, patch_bgr, proto_names, proto_feats, try_angles=True)
    if knn_id and knn_sim >= 0.70 and knn_sim > best_conf:
        return knn_id, knn_sim
    return best_id, best_conf

# --------------------- основной пайплайн ---------------------
def process_image(model, idx2label, proto_names, proto_feats, img_path: Path, max_dim: int, verbose=False) -> Optional[Dict]:
    src = cv2.imread(str(img_path), cv2.IMREAD_COLOR)
    if src is None:
        return None
    img = downscale_maxdim(src, max_dim)
    circles = find_circles(img, verbose=verbose)
    if len(circles) < 9:
        return None
    circles = sort_3x3(circles[:9])

    ids: List[str] = []
    for i, (x,y,r) in enumerate(circles, 1):
        patch = crop_square(img, x, y, r, scale=1.30)
        oid, conf = predict_id(model, idx2label, patch, proto_names, proto_feats, try_angles=True)
        ids.append(oid)
        if verbose:
            print(f"    [{i}/9] {oid}  (p={conf:.2f})")

    return {
        "rows": {
            "most_actual": ids[0:3],
            "usual":       ids[3:6],
            "minimal":     ids[6:9],
        }
    }

def main():
    ap = argparse.ArgumentParser(description="Infer orbing map via CNN + kNN fallback")
    ap.add_argument("--weights", required=True, type=Path, help="папка с orb_cnn.pth и orb_labels.json")
    ap.add_argument("--templates", required=True, type=Path, help="папка public/orbs (basic, special)")
    ap.add_argument("--images", required=True, type=Path, help="папка с фотографиями orbing")
    ap.add_argument("--out", required=True, type=Path, help="куда сохранить JSON")
    ap.add_argument("--max-dim", type=int, default=1600)
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    model, idx2label = load_labels_weights(args.weights)

    # k-NN прототипы из шаблонов
    label_names = [idx2label[i] for i in range(len(idx2label))]
    protos = load_template_protos(args.templates, label_names, size=128)
    proto_names, proto_feats = build_proto_embeddings(model, protos, size=128)

    imgs = list_images(args.images)
    out: Dict[str, Dict] = {}
    for i, p in enumerate(imgs, 1):
        if args.verbose:
            print(f"[{i}/{len(imgs)}] {p.name}")
        res = process_image(model, idx2label, proto_names, proto_feats, p, args.max_dim, verbose=args.verbose)
        if res is None:
            continue
        out[p.stem] = res

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Готово: {args.out}  ({len(out)} записей)")

if __name__ == "__main__":
    main()
