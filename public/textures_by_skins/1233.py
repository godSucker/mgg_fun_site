import json

# Функция для исправления ошибок синтаксиса
def fix_json(json_data):
    # Преобразуем строки в формате JSON в Python объект (сначала попробуем загрузить)
    try:
        return json.loads(json_data)
    except json.JSONDecodeError as e:
        print(f"Ошибка в JSON: {e}")
        # Попробуем исправить ошибку, например, удалить последние запятые
        # и другие исправления. Тут можно добавить более сложную логику,
        # если потребуется исправить типовые ошибки.

        # Пример удаления последней запятой перед закрывающей скобкой
        fixed_data = json_data.strip().rstrip(',') + '}'

        try:
            return json.loads(fixed_data)
        except json.JSONDecodeError as e:
            print(f"Ошибка после исправления: {e}")
            return None


# Путь к вашему JSON-файлу
file_path = 'skins.json'

# Чтение данных из файла
with open(file_path, 'r', encoding='utf-8') as file:
    raw_data = file.read()

# Попытка исправить и загрузить JSON
fixed_json = fix_json(raw_data)

if fixed_json:
    # Если JSON успешно исправлен, записываем его обратно в файл
    with open('fixed_file.json', 'w', encoding='utf-8') as output_file:
        json.dump(fixed_json, output_file, ensure_ascii=False, indent=4)
    print("JSON успешно исправлен и сохранен в 'fixed_file.json'.")
else:
    print("Не удалось исправить JSON.")

