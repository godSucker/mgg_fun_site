#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, argparse, re, pathlib

STAR_WORDS = [
    "бронзовый","бронзовая","бронзовые",
    "серебряный","серебряная","серебряные",
    "золотой","золотая","золотые",
    "платиновый","платиновая","платиновые",
    "бронза","серебро","золото","платина",
]
STAR_PAT = re.compile(r"(?i)\b(" + "|".join(map(re.escape, STAR_WORDS)) + r")\b|[\(\[\{]\s*(бронза|серебро|золото|платина)\s*[\)\]\}]", re.I)

def strip_star_words(s:str)->str:
    if not s: return s
    s = STAR_PAT.sub("", s)
    s = re.sub(r"\s{2,}", " ", s)
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    return s.strip()

def load_loc(path):
    loc={}
    with open(path,"r",encoding="utf-8",errors="replace") as f:
        for line in f:
            line=line.strip()
            if not line or ";" not in line: continue
            k,v=line.split(";",1)
            loc[k.strip()]=v.strip()
    return loc

def parse_gene_num(specimen_id:str):
    m = re.match(r"(?i)^specimen_([a-z]+)_(\d{1,3})(?:[_-][a-z])?$", specimen_id.strip())
    if not m: return None,None
    gene = m.group(1).upper()
    num  = m.group(2)
    if num.isdigit() and len(num)==1: num = num.zfill(2)
    return gene,num

def first(loc, keys):
    for k in keys:
        if k in loc and loc[k]:
            return loc[k]
    return None

def bundle(loc, specimen_id:str):
    gene_uc, num = parse_gene_num(specimen_id)
    if not gene_uc: return None
    base_uc = f"{gene_uc}_{num}"
    gene_num_lc = f"{gene_uc.lower()}_{num}"
    name = first(loc, [f"Specimen_{base_uc}", f"specimen_{base_uc}", specimen_id])
    lore = first(loc, [f"caption_specimen_{gene_num_lc}", f"caption_{specimen_id.lower()}", f"caption_{gene_num_lc}"])
    attacks={}
    for i in (1,2,3):
        val = first(loc, [
            f"specimen_{base_uc}_attack_{i}",
            f"specimen_{gene_num_lc.upper()}_attack_{i}",
            f"specimen_{gene_num_lc}_attack_{i}",
            f"specimen_{base_uc}_attack_{i}p",
            f"specimen_{gene_num_lc}_attack_{i}p",
        ])
        if val: attacks[str(i)] = val
    return {"name":name,"lore":lore,"attacks":attacks}

def process_file(loc, path: pathlib.Path, log_lines:list, summary:list):
    data = json.loads(path.read_text("utf-8"))
    changed_names=0
    added_fields=0
    misses=0
    for obj in data:
        sid = str(obj.get("id","")).strip()
        if not sid: continue
        b = bundle(loc, sid)
        # final name
        if b and b["name"]:
            new_name = strip_star_words(b["name"])
        else:
            cur = obj.get("name","")
            new_name = strip_star_words(cur) if cur else cur
            misses += 1
            log_lines.append(f"{path.name}: {sid} — не найдено имя в локализации; оставлено текущее/очищенное.")
        if new_name and new_name != obj.get("name"):
            obj["name"] = new_name
            changed_names += 1
        # add fields (empty if none)
        before = set(obj.keys())
        obj["name_attack1"] = (b["attacks"].get("1") if b else "") or ""
        obj["name_attack2"] = (b["attacks"].get("2") if b else "") or ""
        obj["name_attack3"] = (b["attacks"].get("3") if b else "") or ""
        obj["name_lore"]    = (b["lore"] if b else "") or ""
        added_fields += len(set(obj.keys()) - before)
    out_path = path.with_name(path.stem + "_updated.json")
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    summary.append(f"{path.name}: записан {out_path.name}; изменено имён: {changed_names}; добавлено новых полей: {added_fields}; без имени в локали: {misses}.")

def main():
    ap = argparse.ArgumentParser(description="Update mutant names/attacks/lore from RU localisation.")
    ap.add_argument("--loc", required=True, help="localisation_ru.txt")
    ap.add_argument("--json", nargs="+", required=True, help="json files to update (normal.json ...)")
    ap.add_argument("--log", default="update_names_log.txt", help="txt log output")
    args = ap.parse_args()

    loc = load_loc(args.loc)
    log_lines=[]
    summary=[]
    for j in args.json:
        p = pathlib.Path(j)
        if p.exists():
            process_file(loc, p, log_lines, summary)
        else:
            summary.append(f"{p.name}: файл не найден — пропускаю.")
    with open(args.log, "w", encoding="utf-8") as f:
        f.write("ИТОГО:\n")
        for s in summary: f.write(s+"\n")
        f.write("\nКому не удалось найти имя в локали:\n")
        for l in log_lines: f.write(l+"\n")
    print("\n".join(summary))
    print("Лог:", args.log)

if __name__ == "__main__":
    main()
