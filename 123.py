#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Этот скрипт заполняет поле `image` в файле mutants_data.json.
Он ищет текстуры для каждого мутанта в папках full-char и semi-full
и добавляет относительные пути к этим текстурам в соответствующий объект.
Если включён фильтр (по умолчанию), то будет выбрана только текстура,
чей суффикс соответствует значению поля `skin`. Для некоторых скинов
добавлена таблица синонимов (army→camo, disco→music и т.п.), которую
при необходимости можно расширить.

Запускать из корня проекта, где есть папка public.
"""

import json
import os
import re
from collections import defaultdict

def normalise_name(name: str) -> str:
    """Нормализует строки: приводит к нижнему регистру и убирает всё кроме букв и цифр."""
    return re.sub(r'[^a-z0-9]', '', name.lower())

def collect_textures(root: str) -> dict:
    """
    Собирает все текстуры из директорий full-char и semi-full,
    возвращая словарь base_id → [пути к текстурам].
    """
    full_dir = os.path.join(root, 'full-char')
    semi_dir = os.path.join(root, 'semi-full')
    texture_map: defaultdict[str, list[str]] = defaultdict(list)

    def add_from_folder(folder: str):
        if not os.path.isdir(folder):
            return
        folder_name = os.path.basename(folder)
        for entry in os.listdir(folder):
            if not entry.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                continue
            base_name = entry.rsplit('.', 1)[0]
            # Убираем необязательный префикс specimen_
            lower_name = base_name.lower()
            if lower_name.startswith('specimen_'):
                trimmed = lower_name[len('specimen_'):]
            else:
                trimmed = lower_name
            parts = trimmed.split('_')
            if len(parts) < 2:
                continue
            base_id = f"{parts[0]}_{parts[1]}"
            rel_path = os.path.join(
                'textures_by_skins',
                'textures_by_skin',
                folder_name,
                entry,
            )
            texture_map[base_id].append(rel_path)

    add_from_folder(full_dir)
    add_from_folder(semi_dir)
    return texture_map

def update_mutants_data(json_path: str, textures_root: str, *, filter_by_skin: bool = True) -> None:
    """Обновляет mutants_data.json, заполняя список `image` для каждого мутанта."""
    with open(json_path, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    if 'specimens' not in data or not isinstance(data['specimens'], list):
        raise RuntimeError(f"В файле {json_path} не найден список specimens")

    texture_map = collect_textures(textures_root)

    # Синонимы для скинов: при несовпадении названия файла и значения поля skin
    synonyms = {
        'army': 'camo',
        'disco': 'music',
        'valentine’s_day': 'valentines',
        'valentine’sday': 'valentines',
        'hero': 'heroes',
        'europe_day': 'europe',
        'blood_sport': 'bloodsport',
    }

    for specimen in data['specimens']:
        spec_id = specimen.get('id', '')
        if not isinstance(spec_id, str):
            continue
        # Приводим id к нижнему регистру и убираем 'Specimen_'
        spec_base = spec_id.lower().replace('specimen_', '')
        textures = texture_map.get(spec_base, [])
        if not textures:
            specimen['image'] = []
            continue

        if filter_by_skin:
            skin_raw = specimen.get('skin', '') or ''
            # Применяем синонимы к skin
            skin_key = skin_raw.strip()
            alt_skin = synonyms.get(skin_key.lower())
            # Нормализованные строки для сравнения
            skin_norms = {normalise_name(skin_key)}
            if alt_skin:
                skin_norms.add(normalise_name(alt_skin))
            selected = []
            for path in textures:
                file_name = os.path.basename(path).rsplit('.', 1)[0]
                lower_name = file_name.lower()
                if lower_name.startswith('specimen_'):
                    lower_name = lower_name[len('specimen_'):]
                # Отделяем суффикс (часть после id)
                if lower_name.startswith(spec_base + '_'):
                    suffix = lower_name[len(spec_base) + 1:]
                else:
                    parts = lower_name.split('_')
                    suffix = '_'.join(parts[2:]) if len(parts) > 2 else ''
                suffix_norm = normalise_name(suffix)
                if any(sn in suffix_norm or suffix_norm in sn for sn in skin_norms):
                    selected.append(path)
            specimen['image'] = selected if selected else textures
        else:
            specimen['image'] = textures

    # Сохраняем результат в новый файл
    output_path = os.path.join(os.path.dirname(json_path), 'mutants_data_updated.json')
    with open(output_path, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print(f"Готово! Результат сохранён в {output_path}")

if __name__ == '__main__':
    # Ожидаем, что скрипт запустят из корневой папки проекта
    textures_dir = os.path.join('public', 'textures_by_skins', 'textures_by_skin')
    json_file = os.path.join(textures_dir, '/home/godbtw/site-workspace/mutants_site/mutants_data.json')
    if not os.path.isfile(json_file):
        raise SystemExit("Не удалось найти mutants_data.json – запустите скрипт из корня проекта.")
    update_mutants_data(json_file, textures_dir)

