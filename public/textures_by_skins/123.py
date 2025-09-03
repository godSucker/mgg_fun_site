import os
import json
import shutil

# Путь к папкам с текстурами
full_char_folder = "full-char"
semi_full_folder = "semi-full"

# Папка, куда будут создаваться новые папки с текстурами
output_dir = "textures_by_skins"

# Папка с файлом skins.json
skins_json_path = "skins.json"

# Заголовки для имитации браузера
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

# Загружаем данные из существующего skins.json
with open(skins_json_path, "r", encoding="utf-8") as f:
    skins_data = json.load(f)

# Словарь для быстрого поиска путей по id мутанта
skin_dict = {skin['id']: skin for skin in skins_data}

# Создаем папки для мутантов и meta.json
os.makedirs(output_dir, exist_ok=True)

# Список файлов в папке full-char
full_char_textures = os.listdir(full_char_folder)

# Перебираем текстуры и создаем папки для мутантов
for texture in full_char_textures:
    # Пример формата имени: A_01_japan.png
    # Получаем ID мутанта (первую часть имени файла)
    mutant_id = texture.split('_')[0] + '_' + texture.split('_')[1]

    # Ищем мутанта в skins.json по его ID
    if mutant_id in skin_dict:
        mutant = skin_dict[mutant_id]

        # Пути к изображениям
        full_char_image = os.path.join(full_char_folder, texture)
        semi_full_image = os.path.join(semi_full_folder, "specimen_" + texture)

        # Создаем папку для мутанта
        mutant_folder = os.path.join(output_dir, f"{mutant_id}_{texture.split('.')[0]}")
        os.makedirs(mutant_folder, exist_ok=True)

        # Копируем изображения в соответствующие папки
        shutil.copy(full_char_image, os.path.join(mutant_folder, f"{mutant_id}_normal.png"))
        shutil.copy(semi_full_image, os.path.join(mutant_folder, f"specimen_{mutant_id}_normal.png"))

        # Создаем meta.json с информацией о путях к изображениям
        meta_data = {
            "id": mutant_id,
            "name": mutant.get("name", mutant_id),  # Если имя есть, берем его, если нет — используем id
            "type": mutant.get("type", "default"),  # Если тип есть, берем его, если нет — "default"
            "image": [
                f"textures_by_skins/{mutant_id}/{mutant_id}_normal.png",
                f"textures_by_skins/{mutant_id}/specimen_{mutant_id}_normal.png"
            ]
        }

        # Сохраняем meta.json в папку мутанта
        with open(os.path.join(mutant_folder, "meta.json"), 'w', encoding='utf-8') as f:
            json.dump(meta_data, f, ensure_ascii=False, indent=4)

        # Обновляем запись о мутанте в skins.json, добавляя пути к изображениям
        mutant["image"] = meta_data["image"]

# Сохраняем обновленный файл skins.json
with open(skins_json_path, 'w', encoding='utf-8') as f:
    json.dump(skins_data, f, ensure_ascii=False, indent=4)

print("Скрипт выполнен успешно!")
