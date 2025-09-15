#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mutant JSON Cleaner
-------------------
- Дедуплицирует мутантов по id (оставляет «лучшую» запись).
- Удаляет записи без имени.
- Удаляет записи с «пустыми» текстурами, если их можно определить:
    * известно поле текстур и оно содержит только ОДНУ текстуру вида *_STAND (без спрайтов ходьбы/атаки).
- Пишет простой TXT-лог с итогами.
- Обновлённые файлы сохраняет как *_clean.json.

Запуск:
    python clean_mutants.py --log clean_log.txt normal_updated.json bronze.json silver.json gold.json platinum.json

Примечания:
- Если структура текстур в файле не известна, запись НЕ удаляется по критерию «нет текстуры».
- Поддерживаются поля: textures / sprites / images / pictures, а также assets.{textures|sprites}.
"""

import argparse, json, re, os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Какие поля могут хранить массив текстур
TEXTURE_KEYS = ["image", "textures", "sprites", "images", "pictures"]
ASSET_KEYS = ["assets"]  # внутри может лежать один из TEXTURE_KEYS

STAND_PAT = re.compile(r"(?i)(?:^|[_/\\-])stand(?:\.[a-z0-9]+)?$")

def basestr(x: Any) -> Optional[str]:
    if isinstance(x, str): return x
    return None

def basename(p: str) -> str:
    # урезать до имени файла без директорий
    return p.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]


def collect_texture_names(obj: Dict[str, Any]) -> Optional[List[str]]:
    """
    Возвращает список имён/путей текстур, если смогли определить.
    Если в объекте нет ни одного известного поля — возвращает None (неизвестно).
    Поддерживает как строку, так и массив строк/объектов.
    """
    # прямые поля
    for key in TEXTURE_KEYS:
        if key in obj:
            arr = obj[key]
            names: List[str] = []
            if isinstance(arr, str):
                names.append(arr)
                return names
            if isinstance(arr, list):
                for item in arr:
                    if isinstance(item, str):
                        names.append(item)
                    elif isinstance(item, dict):
                        for sub in ("name","file","path","src","id","url"):
                            if sub in item and isinstance(item[sub], str) and item[sub]:
                                names.append(item[sub])
                                break
                return names
    # вложенный assets
    for akey in ASSET_KEYS:
        if akey in obj and isinstance(obj[akey], dict):
            inner = obj[akey]
            for key in TEXTURE_KEYS:
                if key in inner:
                    arr = inner[key]
                    names: List[str] = []
                    if isinstance(arr, str):
                        names.append(arr)
                        return names
                    if isinstance(arr, list):
                        for item in arr:
                            if isinstance(item, str):
                                names.append(item)
                            elif isinstance(item, dict):
                                for sub in ("name","file","path","src","id","url"):
                                    if sub in item and isinstance(item[sub], str) and item[sub]:
                                        names.append(item[sub])
                                        break
                        return names
    # ничего не нашли
    return None


def is_stand_only(textures: List[str]) -> bool:
    """
    «Нет текстуры» в понимании задачи: вместо массива из 3 — ровно один элемент,
    и он указывает на STAND. Допускаем, что это может быть имя или путь.
    """
    if not textures or len(textures) != 1:
        return False
    base = basename(textures[0])
    return STAND_PAT.search(base) is not None

def score_record(obj: Dict[str, Any]) -> Tuple[int, int, int, int]:
    """
    Балл качества записи для выбора лучшего дубликата:
      1) есть валидное имя? (1/0)
      2) качество текстур: 3 балла если >=3, 2 балла если >=2, 1 балл если 1 не-stand, 0 если stand-only/пусто/неизвестно
      3) есть лор? (1/0) -> name_lore
      4) сколько атак заполнено (0..3) -> name_attack1..3
    """
    # 1) имя
    name_ok = 1 if (isinstance(obj.get("name"), str) and obj["name"].strip()) else 0
    # 2) текстуры
    textures = collect_texture_names(obj)
    if textures is None:
        tex_score = 0  # неизвестно — не наказываем и не поощряем
    else:
        if is_stand_only(textures): tex_score = 0
        elif len(textures) >= 3: tex_score = 3
        elif len(textures) >= 2: tex_score = 2
        elif len(textures) == 1: tex_score = 1
        else: tex_score = 0
    # 3) лор
    lore_ok = 1 if (isinstance(obj.get("name_lore"), str) and obj["name_lore"].strip()) else 0
    # 4) атаки
    atk_count = 0
    for k in ("name_attack1","name_attack2","name_attack3"):
        if isinstance(obj.get(k), str) and obj[k].strip():
            atk_count += 1
    return (name_ok, tex_score, lore_ok, atk_count)

def clean_file(path: Path, log_lines: List[str]) -> Path:
    data = json.loads(path.read_text("utf-8"))
    if not isinstance(data, list):
        log_lines.append(f"{path.name}: не массив — пропуск")
        return path
    # 1) дедуп по id
    buckets: Dict[str, List[dict]] = {}
    for obj in data:
        sid = str(obj.get("id","")).strip()
        if not sid:
            # такие записи удаляем без сожалений
            continue
        buckets.setdefault(sid, []).append(obj)

    kept = []
    dup_removed = 0
    for sid, rows in buckets.items():
        if len(rows) == 1:
            kept.append(rows[0])
            continue
        # выбрать лучший по score
        ranked = sorted(rows, key=score_record, reverse=True)
        best = ranked[0]
        removed = len(rows) - 1
        dup_removed += removed
        kept.append(best)
        log_lines.append(f"{path.name}: дубликаты id={sid} — удалено {removed}, оставлен лучший.")

    # 2) фильтр по имени (пустые сносим)
    before = len(kept)
    kept2 = [o for o in kept if isinstance(o.get("name"), str) and o["name"].strip()]
    removed_no_name = before - len(kept2)
    if removed_no_name:
        log_lines.append(f"{path.name}: удалено без имени: {removed_no_name}")

    # 2.1) удаляем где имя == id (сравнение без регистра и служебных символов)
    def _norm(s: str) -> str:
        import re
        return re.sub(r"[^a-z0-9]+", "", s.lower())
    before2 = len(kept2)
    kept2 = [o for o in kept2 if _norm(o.get("name","")) != _norm(o.get("id",""))]
    removed_name_eq_id = before2 - len(kept2)
    if removed_name_eq_id:
        log_lines.append(f"{path.name}: удалено где name==id: {removed_name_eq_id}")

    # 2.1) удаляем где имя == id (сравнение без регистра и служебных символов)
    def norm(s): 
        import re
        return re.sub(r"[^a-z0-9]+", "", s.lower())
    before2 = len(kept2)
    kept2 = [o for o in kept2 if norm(o.get("name","")) != norm(o.get("id",""))]
    removed_name_eq_id = before2 - len(kept2)
    if removed_name_eq_id:
        log_lines.append(f"{path.name}: удалено где name==id: {removed_name_eq_id}")

    
    
    # 3) фильтр по отсутствию текстур: если не удалось обнаружить поле текстур ИЛИ оно пустое → удалить
    final_tmp = []
    removed_no_textures = 0
    for o in kept2:
        textures = collect_texture_names(o)
        if textures is None or len(textures) == 0:
            removed_no_textures += 1
            continue
        final_tmp.append(o)
    if removed_no_textures:
        log_lines.append(f"{path.name}: удалено без текстур: {removed_no_textures}")

    # 4) фильтр по STAND-only
    final = []
    removed_stand_only = 0
    for o in final_tmp:
        textures = collect_texture_names(o)
        if is_stand_only(textures):
            removed_stand_only += 1
            continue
        final.append(o)
    if removed_stand_only:
        log_lines.append(f"{path.name}: удалено с единственной STAND-текстурой: {removed_stand_only}")

    out_path = path.with_name(path.stem + "_clean.json")
    out_path.write_text(json.dumps(final, ensure_ascii=False, indent=2), "utf-8")
    log_lines.append(f"{path.name}: итог {len(final)} (из {len(data)}), дубликатов убрано {dup_removed}. Записан {out_path.name}.")
    return out_path

def main():
    ap = argparse.ArgumentParser(description="Cleanup mutants JSON: dedupe, drop nameless, drop stand-only textures")
    ap.add_argument("--log", default="clean_log.txt", help="путь к TXT-логу")
    ap.add_argument("jsons", nargs="+", help="список JSON-файлов для обработки")
    args = ap.parse_args()

    log_lines: List[str] = []
    produced: List[str] = []

    for path_str in args.jsons:
        p = Path(path_str)
        if not p.exists():
            log_lines.append(f"{p.name}: файл не найден — пропуск")
            continue
        outp = clean_file(p, log_lines)
        produced.append(str(outp))

    Path(args.log).write_text("\n".join(log_lines), "utf-8")
    print("Готово. Лог:", args.log)
    print("Файлы:", *produced, sep="\n - ")

if __name__ == "__main__":
    main()
