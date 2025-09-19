#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Refill attack descriptions from localisation for JSON entries by specimen id.
- Uses expanded key patterns (Specimen_/specimen_, _new, p/P variants).
- Updates name_attack1/2/3 if localisation has values (does not blank existing non-empty fields).
- Optionally updates name_lore if found.
- Writes <input_stem>_enriched.json and a TXT log.
"""

import argparse, json, re
from pathlib import Path

def load_loc(path):
    loc={}
    with open(path,"r",encoding="utf-8",errors="replace") as f:
        for ln in f:
            ln=ln.strip()
            if not ln or ";" not in ln: continue
            k,v=ln.split(";",1)
            loc[k.strip()]=v.strip()
    return loc

PAT_ID = re.compile(r"(?i)^specimen_([a-z]+)_(\d{1,3})(?:[_-][a-z])?$")

def parts(sid:str):
    m = PAT_ID.match(sid.strip())
    if not m: return None, None
    g = m.group(1).upper()
    n = m.group(2)
    if n.isdigit() and len(n)==1: n = n.zfill(2)
    return g,n

def attack_keys(g:str,n:str,i:int):
    base_uc = f"{g}_{n}"
    lc = f"{g.lower()}_{n}"
    keys=[]
    # prefer _new variants first
    for prefix in ("Specimen_","specimen_"):
        for p in ("", "p", "P"):
            keys.append(f"{prefix}{base_uc}_attack_{i}{p}_new")
        keys.append(f"{prefix}{base_uc}_attack_{i}_new")
    # regular
    for prefix in ("Specimen_","specimen_"):
        keys.append(f"{prefix}{base_uc}_attack_{i}")
        for p in ("p","P"):
            keys.append(f"{prefix}{base_uc}_attack_{i}{p}")
    # tolerant lc/uc duplication
    for p in ("", "p", "P"):
        keys.append(f"specimen_{lc}_attack_{i}{p}")
        keys.append(f"specimen_{lc.upper()}_attack_{i}{p}")
    # dedupe preserving order
    seen=set(); out=[]
    for k in keys:
        if k not in seen:
            seen.add(k); out.append(k)
    return out

def first(loc, keys):
    for k in keys:
        if k in loc and loc[k]:
            return loc[k], k
    return None, None

def maybe_set(obj, key, val):
    """Set obj[key] = val if val is not None and obj[key] is empty/absent."""
    if val is None: return False
    cur = obj.get(key)
    if isinstance(cur, str) and cur.strip():
        return False
    obj[key] = val
    return True

def main():
    ap = argparse.ArgumentParser(description="Repair attacks from RU localisation")
    ap.add_argument("--loc", required=True, help="localisation_ru.txt")
    ap.add_argument("--log", default="attacks_repair_log.txt")
    ap.add_argument("jsons", nargs="+")
    args = ap.parse_args()

    loc = load_loc(args.loc)
    log_lines = []
    for js in args.jsons:
        p = Path(js)
        data = json.loads(p.read_text("utf-8"))
        fixed1=fixed2=fixed3=0
        still_missing=0
        examples_missing=[]
        for obj in data:
            sid = str(obj.get("id","")).strip()
            if not sid: continue
            g,n = parts(sid)
            if not g:
                still_missing += 1; 
                if len(examples_missing)<10: examples_missing.append(sid)
                continue
            # lore
            lore_keys = [f"caption_specimen_{g.lower()}_{n}", f"caption_specimen_{g}_{n}", f"caption_specimen_{g.upper()}_{n}"]
            lore_val, _ = first(loc, lore_keys)
            # lookup attacks
            a1, _ = first(loc, attack_keys(g,n,1))
            a2, _ = first(loc, attack_keys(g,n,2))
            a3, _ = first(loc, attack_keys(g,n,3))
            # set if found
            if maybe_set(obj, "name_lore", lore_val): pass
            if maybe_set(obj, "name_attack1", a1): fixed1 += 1
            if maybe_set(obj, "name_attack2", a2): fixed2 += 1
            if maybe_set(obj, "name_attack3", a3): fixed3 += 1
            if not (a1 or a2 or a3):
                still_missing += 1
                if len(examples_missing)<10: examples_missing.append(sid)
        outp = p.with_name(p.stem + "_enriched.json")
        outp.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
        log_lines.append(f"{p.name}: заполнено attack1={fixed1}, attack2={fixed2}, attack3={fixed3}; без данных: {still_missing} -> {outp.name}")
    Path(args.log).write_text("\n".join(log_lines), "utf-8")
    print("\n".join(log_lines))
    print("Лог:", args.log)

if __name__ == "__main__":
    main()