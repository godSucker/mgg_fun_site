import json
import os

# Путь к файлу с данными мутантов и текстурами
mutants_file = 'mutants_data.json'  # Путь к файлу данных мутантов
textures_folder = 'textures_by_skins'  # Папка с текстурами

# Загружаем данные мутантов из JSON файла
with open(mutants_file, 'r', encoding='utf-8') as f:
    mutants_data = json.load(f)

# Печать данных, чтобы убедиться, что структура правильная
print(mutants_data)  # Выведем структуру данных для анализа

# Обрабатываем мутантов
updated_mutants = []

for mutant in mutants_data:  # Каждый мутант в списке
    if isinstance(mutant, dict):  # Убедимся, что это словарь
        mutant_id = mutant.get('id', '')
        skin = mutant.get('skin', '')

        # Папки с текстурами, для которых нужно добавить пути
        semi_full_texture_folder = os.path.join(textures_folder, 'semi-full', skin)
        full_char_texture_folder = os.path.join(textures_folder, 'full-char', skin)

        # Составляем список путей для текстур
        texture_paths = []
        for texture_type in ['semi-full', 'full-char']:
            folder = os.path.join(textures_folder, texture_type, skin)
            if os.path.exists(folder):  # Проверим, существует ли папка
                for filename in os.listdir(folder):
                    if filename.endswith('.png'):  # Или другой формат
                        texture_paths.append(os.path.join(folder, filename))

        # Добавляем информацию о путях текстур к мутанту
        mutant['textures'] = texture_paths

        # Добавляем мутанта в итоговый список
        updated_mutants.append(mutant)
    else:
        print(f"Неверная структура данных для мутанта: {mutant}")

# Сохраняем обновленный файл JSON
with open('updated_mutants_data.json', 'w', encoding='utf-8') as f:
    json.dump(updated_mutants, f, indent=4, ensure_ascii=False)

print("Обновление текстур завершено.")
