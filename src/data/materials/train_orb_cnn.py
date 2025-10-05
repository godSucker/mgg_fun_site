#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse, json, os, io, math, random, time
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, ConcatDataset
from torch.optim import AdamW

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
random.seed(42); np.random.seed(42); torch.manual_seed(42)

IMG_EXTS = {".png",".jpg",".jpeg",".webp"}

# --------------------------- datasets ---------------------------
def list_images(root: Path) -> List[Path]:
    return sorted([p for p in root.rglob("*") if p.suffix.lower() in IMG_EXTS and p.is_file()])

def load_templates(templates_root: Path) -> Dict[str, Image.Image]:
    # Собираем все шаблоны по stem (id без расширения)
    imgs = {}
    for sub in ("basic","special"):
        d = templates_root / sub
        if not d.exists(): continue
        for p in list_images(d):
            stem = p.stem
            if stem not in imgs:
                imgs[stem] = Image.open(p).convert("RGB")
    return imgs

def pil_to_tensor(img: Image.Image) -> torch.Tensor:
    arr = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    t = torch.from_numpy(arr).permute(2,0,1).contiguous()
    # normalize to [-1,1]
    for c in range(3):
        t[c] = (t[c]-0.5)/0.5
    return t

class TemplatesDataset(Dataset):
    def __init__(self, templates: Dict[str, Image.Image], labels: List[str], size=128, samples_per_class=800):
        self.templates = templates
        self.labels = labels
        self.label2idx = {l:i for i,l in enumerate(labels)}
        self.size = size
        self.samples_per_class = samples_per_class
        self.n = len(labels) * samples_per_class

    def __len__(self): return self.n

    def _aug_affine(self, img: Image.Image) -> Image.Image:
        # тяжелые аугментации, имитирующие фото
        if random.random()<0.9:
            ang = random.uniform(0, 360)
            img = img.rotate(ang, resample=Image.BICUBIC, expand=False)
        if random.random()<0.5:
            w,h = img.size; dx=w*random.uniform(0,0.06); dy=h*random.uniform(0,0.06)
            # простая квадр. перспектива на PIL (QuadTransform в современных PIL)
            dst = (dx,dy, w-dx,dy, w-dx,h-dy, dx,h-dy)
            img = img.transform((w,h), Image.PERSPECTIVE, Image.Transform.QUAD, data=dst, resample=Image.BICUBIC)
        return img

    def _aug_color(self, img):
        if random.random()<0.7:
            img = ImageEnhance.Brightness(img).enhance(random.uniform(0.75,1.25))
            img = ImageEnhance.Contrast(img).enhance(random.uniform(0.7,1.3))
            img = ImageEnhance.Color(img).enhance(random.uniform(0.7,1.3))
        return img

    def _aug_blur_jpeg(self, img):
        if random.random()<0.4:
            img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5,1.6)))
        if random.random()<0.35:
            q = random.randint(35,75)
            buf = io.BytesIO(); img.save(buf, format="JPEG", quality=q); buf.seek(0)
            img = Image.open(buf).convert("RGB")
        return img

    def _donut(self, img):
        if random.random()<0.5:
            w,h=img.size; arr=np.asarray(img,dtype=np.float32)
            yy,xx=np.mgrid[0:h,0:w]; cx,cy=(w-1)/2,(h-1)/2; r=np.sqrt((xx-cx)**2+(yy-cy)**2); R=min(w,h)/2
            m=((r>=0.35*R)&(r<=0.90*R)).astype(np.float32)[...,None]
            arr=arr*m+255*(1-m); arr=np.clip(arr,0,255).astype(np.uint8)
            img=Image.fromarray(arr,mode="RGB")
        return img

    def __getitem__(self, idx):
        cls = idx % len(self.labels)
        label = self.labels[cls]
        img = self.templates[label]
        img = img.resize((self.size,self.size), Image.BICUBIC)
        img = self._aug_affine(img)
        img = self._aug_color(img)
        img = self._aug_blur_jpeg(img)
        img = self._donut(img)
        x = pil_to_tensor(img)
        y = torch.tensor(cls, dtype=torch.long)
        return x,y

class RealDirDataset(Dataset):
    def __init__(self, root: Path, label2idx: Dict[str,int], size=128):
        self.items = []
        self.size = size
        self.label2idx = label2idx
        if root and root.exists():
            for l in sorted(label2idx.keys()):
                d = root / l
                if d.exists():
                    for p in list_images(d):
                        self.items.append((p, l))

    def __len__(self): return len(self.items)

    def _augment(self, img: Image.Image) -> Image.Image:
        # умеренные аугменты (реальные уже «грязные»)
        if random.random()<0.8:
            ang = random.uniform(0,360)
            img = img.rotate(ang, resample=Image.BICUBIC, expand=False)
        if random.random()<0.3:
            img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.3,1.2)))
        if random.random()<0.6:
            img = ImageEnhance.Brightness(img).enhance(random.uniform(0.8,1.2))
            img = ImageEnhance.Contrast(img).enhance(random.uniform(0.85,1.2))
        return img

    def __getitem__(self, i):
        p, l = self.items[i]
        img = Image.open(p).convert("RGB").resize((self.size,self.size), Image.BICUBIC)
        img = self._augment(img)
        x = pil_to_tensor(img)
        y = torch.tensor(self.label2idx[l], dtype=torch.long)
        return x,y

# --------------------------- модель ---------------------------
class SmallCosineCNN(nn.Module):
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

    def forward(self, x):
        f = self.flatten(self.net(x))
        f = self.drop(self.relu(self.fc(f)))
        f_n = torch.nn.functional.normalize(f, dim=1)
        W_n = torch.nn.functional.normalize(self.class_w, dim=1)
        return 16.0 * (f_n @ W_n.t())

# --------------------------- train loop ---------------------------
def main():
    ap = argparse.ArgumentParser(description="Train orb CNN (cosine, aug, mixup)")
    ap.add_argument("--templates", required=True, type=Path, help="public/orbs")
    ap.add_argument("--out", required=True, type=Path, help="out dir (weights, labels)")
    ap.add_argument("--epochs", type=int, default=12)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--samples-per-class", type=int, default=800)
    ap.add_argument("--size", type=int, default=128)
    ap.add_argument("--real-train", type=Path, default=None, help="real patches train root (class folders)")
    ap.add_argument("--real-val", type=Path, default=None, help="real patches val root (class folders)")
    ap.add_argument("--real-oversample", type=int, default=2, help="сколько раз продублировать real-train в ConcatDataset")
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    templates = load_templates(args.templates)
    labels = sorted(list(templates.keys()))
    label2idx = {l:i for i,l in enumerate(labels)}

    # datasets
    d_templates = TemplatesDataset(templates, labels, size=args.size, samples_per_class=args.samples_per_class)
    ds_list = [d_templates]
    if args.real-train and args.real_train.exists():
        real_ds = RealDirDataset(args.real_train, label2idx, size=args.size)
        for _ in range(max(1,args.real_oversample)):
            ds_list.append(real_ds)
    train_ds = ConcatDataset(ds_list)

    val_ds = None
    if args.real_val and args.real_val.exists():
        val_ds = RealDirDataset(args.real_val, label2idx, size=args.size)

    nw = max(2, (os.cpu_count() or 4) - 2)
    train_dl = DataLoader(train_ds, batch_size=args.batch, shuffle=True, num_workers=nw, pin_memory=True, drop_last=True)
    val_dl = DataLoader(val_ds, batch_size=args.batch, shuffle=False, num_workers=nw, pin_memory=True) if val_ds else None

    model = SmallCosineCNN(num_classes=len(labels)).to(DEVICE)
    opt = AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)

    batches = len(train_dl)
    print(f"Device: {DEVICE}")
    print(f"batches/epoch: {batches}")

    def train_epoch(ep):
        model.train()
        m_loss = 0.0
        for it,(x,y) in enumerate(train_dl, 1):
            x,y = x.to(DEVICE, non_blocking=True), y.to(DEVICE, non_blocking=True)
            # MixUp
            if random.random() < 0.30:
                lam = np.random.beta(0.4,0.4)
                perm = torch.randperm(x.size(0), device=x.device)
                x = lam*x + (1-lam)*x[perm]
                y_a, y_b = y, y[perm]
                logits = model(x)
                loss = lam*criterion(logits,y_a) + (1-lam)*criterion(logits,y_b)
            else:
                logits = model(x); loss = criterion(logits,y)
            opt.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            opt.step()
            m_loss += loss.item()
            if it % 200 == 0:
                print(f"  [epoch {ep:02d}] {it}/{batches}  loss={m_loss/it:.4f}")
        return m_loss / max(1,it)

    def val_epoch(ep):
        if not val_dl: return None
        model.eval()
        tot=0; ok=0
        with torch.no_grad():
            for x,y in val_dl:
                x,y = x.to(DEVICE, non_blocking=True), y.to(DEVICE, non_blocking=True)
                logits = model(x)
                pred = logits.argmax(dim=1)
                ok += (pred==y).sum().item()
                tot += y.numel()
        acc = ok/max(1,tot)
        print(f"  [val {ep:02d}] acc={acc*100:.2f}%")
        return acc

    for ep in range(1, args.epochs+1):
        loss = train_epoch(ep)
        acc = val_epoch(ep)
        print(f"[epoch {ep:02d}] loss={loss:.4f}")

    # сохранить веса и метки
    torch.save(model.state_dict(), args.out / "orb_cnn.pth")
    (args.out / "orb_labels.json").write_text(json.dumps({l:i for i,l in enumerate(labels)}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Готово. Веса: {args.out/'orb_cnn.pth'}")
    print(f"✓ Метки: {args.out/'orb_labels.json'}")

if __name__ == "__main__":
    main()
