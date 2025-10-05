#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse, csv, json, random, shutil
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import numpy as np
import cv2
import torch
import torch.nn as nn
from PIL import Image

IMG_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
random.seed(42)

# --------------------------- утилиты IO ---------------------------
def list_images(root: Path) -> List[Path]:
    return sorted([p for p in root.rglob("*") if p.suffix.lower() in IMG_EXTS and p.is_file()])

def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

# ----------------------- поиск 3×3 кругов ------------------------
def downscale_maxdim(img: np.ndarray, max_dim: int) -> np.ndarray:
    if max_dim <= 0: return img
    h, w = img.shape[:2]
    m = max(h, w)
    if m <= max_dim: return img
    s = max_dim / m
    return cv2.resize(img, (int(round(w*s)), int(round(h*s))), interpolation=cv2.INTER_AREA)

def find_circles(img_bgr: np.ndarray) -> List[Tuple[int,int,int]]:
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
    def sort_3x3(cs):
        cs_sorted = sorted(cs, key=lambda c: c[1])
        rows = [cs_sorted[i*3:(i+1)*3] for i in range(3)]
        rows = sorted(rows, key=lambda row: np.mean([c[1] for c in row]))
        rows = [sorted(row, key=lambda c: c[0]) for row in rows]
        return [c for row in rows for c in row]
    return [(int(x), int(y), int(r)) for (x,y,r) in sort_3x3(best)]

def crop_square(img: np.ndarray, x: int, y: int, r: int, scale: float = 1.30) -> np.ndarray:
    side = int(max(12, r * 2 * scale))
    half = side // 2
    x0 = max(0, x - half); y0 = max(0, y - half)
    x1 = min(img.shape[1], x0 + side); y1 = min(img.shape[0], y0 + side)
    return img[y0:y1, x0:x1].copy()

# -------------------- препроцесс и тензоры -----------------------
def preproc_patch_bgr(p):
    lab = cv2.cvtColor(p, cv2.COLOR_BGR2LAB)
    l,a,b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    l2 = clahe.apply(l)
    lab2 = cv2.merge([l2,a,b])
    p2 = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)
    p2 = cv2.fastNlMeansDenoisingColored(p2, None, 5,5,7,21)
    return p2

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

def prepare_patch(img_bgr: np.ndarray, size: int = 128) -> torch.Tensor:
    img_bgr = preproc_patch_bgr(img_bgr)
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    return prepare_tensor_from_pil(pil, size=size)

# -------------------- две совместимые модели --------------------
class OldSmallCNN(nn.Module):
    # старая архитектура (net + head с Flatten внутри head) — совместимость со старыми весами
    def __init__(self, num_classes: int):
        super().__init__()
        ch = [32,64,128,256]
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
            nn.AdaptiveAvgPool2d(1),
        )
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.25),
            nn.Linear(ch[3], 512), nn.ReLU(inplace=True),
            nn.Dropout(0.25),
            nn.Linear(512, num_classes)
        )
    def forward(self,x): return self.head(self.net(x))
    @torch.no_grad()
    def features(self,x):
        f = self.net(x)
        return torch.flatten(f,1)  # 256-d эмбеддинг

class CosineSmallCNN(nn.Module):
    # новая архитектура из тренера (cosine-classifier)
    def __init__(self, num_classes: int):
        super().__init__()
        ch=[32,64,128,256]
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
            nn.AdaptiveAvgPool2d(1),
        )
        self.flatten = nn.Flatten()
        self.fc = nn.Linear(ch[3], 512)
        self.relu = nn.ReLU(inplace=True)
        self.drop = nn.Dropout(0.25)
        self.class_w = nn.Parameter(torch.randn(num_classes, 512))
        nn.init.xavier_normal_(self.class_w)
    def forward(self,x):
        f = self.flatten(self.net(x))
        f = self.drop(self.relu(self.fc(f)))
        f_n = torch.nn.functional.normalize(f, dim=1)
        W_n = torch.nn.functional.normalize(self.class_w, dim=1)
        return 16.0 * (f_n @ W_n.t())
    @torch.no_grad()
    def features(self,x):
        f = self.flatten(self.net(x))
        f = self.relu(self.fc(f))
        return f  # 512-d эмбеддинг

def load_labels_weights(weights_dir: Path):
    labels_path = weights_dir / "orb_labels.json"
    weights_path = weights_dir / "orb_cnn.pth"
    label2idx = json.loads(labels_path.read_text(encoding="utf-8"))
    idx2label = {v:k for k,v in label2idx.items()}
    sd = torch.load(weights_path, map_location=DEVICE)
    # авто-определение варианта
    if any(k.startswith("class_w") for k in sd.keys()):
        model = CosineSmallCNN(num_classes=len(idx2label))
    else:
        model = OldSmallCNN(num_classes=len(idx2label))
    model.load_state_dict(sd, strict=True)
    model.to(DEVICE).eval()
    return model, idx2label

@torch.no_grad()
def predict_id(model, idx2label, patch_bgr: np.ndarray) -> Tuple[str,float]:
    x = prepare_patch(patch_bgr, size=128)
    logits = model(x)
    prob = torch.softmax(logits, dim=1)
    conf, pred = prob.max(dim=1)
    return idx2label[int(pred.item())], float(conf.item())

# ------------------------------- main ------------------------------
def main():
    ap = argparse.ArgumentParser(description="Нарезка 9×патчей с автодомаркировкой и сплитом")
    ap.add_argument("--images", required=True, type=Path, help="папка public/orbing")
    ap.add_argument("--out", required=True, type=Path, help="папка для патчей/CSV (будет создана)")
    ap.add_argument("--weights", required=True, type=Path, help="папка с orb_cnn.pth и orb_labels.json")
    ap.add_argument("--max-dim", type=int, default=1600)
    ap.add_argument("--conf", type=float, default=0.93, help="порог уверенности для автолейбла")
    ap.add_argument("--val-ratio", type=float, default=0.2, help="доля вал. набора из уверенных")
    args = ap.parse_args()

    ensure_dir(args.out)
    patches_dir = args.out / "patches"
    ensure_dir(patches_dir)
    # confident разложим по классам и сразу сделаем split
    confident_root = args.out / "confident"
    train_root = confident_root / "train"
    val_root   = confident_root / "val"
    ensure_dir(train_root); ensure_dir(val_root)

    model, idx2label = load_labels_weights(args.weights)

    csv_path = args.out / "real_labels.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["file","label","conf","src","slot","x","y","r"])
        imgs = list_images(args.images)
        for p in imgs:
            src = cv2.imread(str(p), cv2.IMREAD_COLOR)
            if src is None: continue
            img = downscale_maxdim(src, args.max_dim)
            circles = find_circles(img)
            if len(circles) != 9:
                continue
            for i,(x,y,r) in enumerate(circles,1):
                patch = crop_square(img,x,y,r,1.30)
                # сохранить патч
                out_name = f"{p.stem}_{i:02d}.png"
                out_path = patches_dir / out_name
                cv2.imwrite(str(out_path), patch)
                # автолейбл
                oid, conf = predict_id(model, idx2label, patch)
                label = oid if conf >= args.conf else ""
                w.writerow([str(out_path), label, f"{conf:.4f}", p.name, i, x,y,r])

    # Разложить confident по классам + train/val сплит
    rows = []
    with csv_path.open("r", encoding="utf-8") as f:
        rd = csv.DictReader(f)
        for row in rd:
            if row["label"]:
                rows.append(row)
    random.shuffle(rows)
    n_val = int(len(rows) * args.val_ratio)
    val_rows = set([r["file"] for r in rows[:n_val]])

    for row in rows:
        src_patch = Path(row["file"])
        clazz = row["label"]
        dst_root = val_root if row["file"] in val_rows else train_root
        dst_dir = dst_root / clazz
        ensure_dir(dst_dir)
        shutil.copy2(src_patch, dst_dir / Path(src_patch).name)

    print(f"✓ Нарезка: {patches_dir}")
    print(f"✓ CSV:     {csv_path}")
    print(f"✓ Confident split → train: {sum(1 for r in rows if r['file'] not in val_rows)}, val: {len(val_rows)}")
    print(f"   Директории: {train_root} , {val_root}")

if __name__ == "__main__":
    main()
