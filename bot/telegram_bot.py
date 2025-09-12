"""
telegram_bot.py
================

Этот модуль реализует телеграм‑бота для проекта MGG Fun Site. Бот
использует библиотеку `python‑telegram‑bot` (версия 20+),
загружает данные о мутантах из JSON‑файлов и предоставляет набор
команд для фильтрации мутантов по различным критериям. Бот умеет
работать как в личных сообщениях (DM), так и в групповых чатах. В
группах он отправляет кнопку, которая открывает мини‑приложение в
Telegram Web Apps с заранее отфильтрованным набором мутантов.

Поддерживаемые фильтры и соответствующие команды:

* `/mutants speed <число>` — мутанты с точной скоростью.
* `/all` — вывести всех мутантов.
* `/bronze`, `/silver`, `/gold`, `/platinum` — только бронзовые,
  серебряные, золотые или платиновые мутанты соответственно.
* `/name <строка>` — по названию (подстрока, нечувствительно к регистру).
* `/hp <число>` — по запасу HP ±500.
* `/atk <число>` — по атаке (atk1 или atk2) ±100.
* `/ability <строка>` — по умению (имя способности).
* `/gene <строка>` — по гену.
* `/type <строка>` — по типу.
* `/tier <строка>` — по уровню (tier).
* `/bingo <строка>` — по записи в бинго.
* `/skin <строка>` — поиск по названию скина (данные берутся из файла `skins.json`).

Каждая команда в групповом чате возвращает кнопку. Нажатие на эту
кнопку открывает веб‑приложение, которое отображает список
мутантов, удовлетворяющих выбранному фильтру. В личных
сообщениях бот может дополнительно вывести количество совпадений.

Перед запуском бота:

1. Установите библиотеку `python-telegram-bot` версии 20 или новее.
2. Скопируйте JSON‑файлы `normal_mutants.json`,
   `bronze_mutants.json`, `silver_mutants.json`, `gold_mutants.json`
   и `plat_mutants.json` (имя файла для платиновых) в ту же директорию, где находится этот
   скрипт, либо измените константы `DATA_FILE` и `STAR_FILES` ниже.
3. Укажите адрес вашего веб‑сайта (например, адрес из ngrok)
   в константе `BASE_APP_URL`.
4. Передайте токен телеграм‑бота либо через переменную окружения
   `TELEGRAM_BOT_TOKEN`, либо задав `BOT_TOKEN` в этом файле.

"""

from __future__ import annotations

import json
import os
import urllib.parse
from typing import Any, Dict, Iterable, List, Optional

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
    WebAppInfo,
)
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

# ---------------------------------------------------------------------------
# Конфигурация
# ---------------------------------------------------------------------------

# Задайте URL вашего мини‑приложения. При развертывании через ngrok
# подставьте публичный адрес, заканчивающийся на `/miniapp/mutants`.
BASE_APP_URL = "https://pbs80l-89-23-110-120.ru.tuna.am/miniapp/mutants"

# Укажите ваш токен бота здесь, если не хотите использовать переменные
# окружения. Если оставить пустую строку, будет использована
# переменная окружения TELEGRAM_BOT_TOKEN.
BOT_TOKEN = "8482700289:AAEmCr3TxMOL5vCO4wPDGm-CeQraNFysM-0"

# Пути к файлам с мутантами. Обычные мутанты находятся в
# `normal_mutants.json`. Звёздные мутанты разделены по файлам.
DATA_FILE = os.path.join(os.path.dirname(__file__), "/normal_mutants.json")
STAR_FILES: Dict[str, str] = {
    "bronze": os.path.join(os.path.dirname(__file__), "/bronze_mutants.json"),
    "silver": os.path.join(os.path.dirname(__file__), "/silver_mutants.json"),
    "gold": os.path.join(os.path.dirname(__file__), "/gold_mutants.json"),
    # Имя файла для платиновых мутантов в репозитории – plat_mutants.json
    "platinum": os.path.join(os.path.dirname(__file__), "/plat_mutants.json"),
}

# Файл с альтернативными версиями мутантов (скинами). В репозитории
# этот файл называется skins.json и содержит объект с полем specimens,
# в котором находится список объектов со свойствами id, name, genes,
# base_stats.lvl1 и lvl30, star, skin и image.
SKINS_FILE = os.path.join(os.path.dirname(__file__), "/skins.json")

# Дополнительный каталог, откуда можно загрузить JSON‑файлы, если они
# не находятся рядом с этим скриптом. Предполагается, что проект
# находится на один уровень выше скрипта в каталоге `src/data`. Это
# позволит боту считывать данные прямо из исходного репозитория без
# копирования файлов.
ALT_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), os.pardir, "src", "data")
)

# Допустимые отклонения для числовых фильтров
HP_TOLERANCE = 500
ATK_TOLERANCE = 100

# ---------------------------------------------------------------------------
# Синонимы и словари для русскоязычных команд
# ---------------------------------------------------------------------------

# Отображение кодов генов на человекочитаемые названия. Эти названия
# используются при построении словарей синонимов и позволяют
# пользователям вводить русские слова вместо буквенного кода. Пример:
#   A → «киборг», B → «нежить», C → «рубак», D → «зверь»,
#   E → «галактик», F → «мифик».
GENE_NAMES: Dict[str, str] = {
    "a": "киборг",
    "b": "нежить",
    "c": "рубак",
    "d": "зверь",
    "e": "галактик",
    "f": "мифик",
}

# Обратная карта: русское название → код гена. Используется для
# преобразования ввода пользователя в точный код.
GENE_CODE_FROM_RUS: Dict[str, str] = {v: k for k, v in GENE_NAMES.items()}

# Синонимы фильтров. Каждому типу фильтра соответствует список
# русских и англоязычных ключевых слов, которые пользователь может
# использовать. Например, фильтр «speed» распознаёт слова
# «скорость» и «spd». Синонимы для звёзд (bronze/silver/etc.)
# определены отдельно.
FILTER_SYNONYMS: Dict[str, List[str]] = {
    "all": ["все", "all"],
    "speed": ["скорость", "spd", "speed"],
    "name": ["имя", "name"],
    "hp": ["хп", "hp", "здоровье"],
    "atk": ["атака", "атк", "atk", "attack"],
    "ability": ["умение", "умения", "абилки", "способность", "ability"],
    "gene": ["ген", "гены", "gene"],
    "type": ["тип", "type"],
    "tier": ["тир", "уровень", "tier"],
    "bingo": ["бинго", "bingo"],
    "skin": ["скин", "skin"],
    # Звёздные уровни будут обрабатываться отдельно
}

# Синонимы для звёздных уровней (rarity). Позволяют писать
# «бронза», «серебро», «золото», «платина» вместо bronze/silver/…
STAR_SYNONYMS: Dict[str, List[str]] = {
    "bronze": ["бронза", "бронзовый", "bronze", "бронз"],
    "silver": ["серебро", "серебряный", "silver", "серебр"],
    "gold": ["золото", "золотой", "gold", "золот"],
    # используем ключ 'platinum' для совместимости; файл называется plat_mutants.json
    "platinum": ["платина", "платиновый", "platinum", "platina", "плат", "plat"],
}

# Синонимы умений (ability). Ключ – слово, которое может ввести
# пользователь на русском (или английском), значение – список идентификаторов
# умений в исходных данных. Например, запрос «щит» сопоставляется с
# ability_shield и ability_shield_plus. Эти синонимы используются при
# поиске по умениям.
ABILITY_SYNONYMS: Dict[str, List[str]] = {
    "щит": ["ability_shield", "ability_shield_plus"],
    "shield": ["ability_shield", "ability_shield_plus"],
    "реген": ["ability_regen", "ability_regen_plus"],
    "регенерация": ["ability_regen", "ability_regen_plus"],
    "вытягивание": ["ability_regen", "ability_regen_plus"],
    "вытягивание жизни": ["ability_regen", "ability_regen_plus"],
    "retaliate": ["ability_retaliate", "ability_retaliate_plus"],
    "отражение": ["ability_retaliate", "ability_retaliate_plus"],
    "slash": ["ability_slash", "ability_slash_plus"],
    "рана": ["ability_slash", "ability_slash_plus"],
    "кровоток": ["ability_slash", "ability_slash_plus"],
    "strengthen": ["ability_strengthen", "ability_strengthen_plus"],
    "усиление": ["ability_strengthen", "ability_strengthen_plus"],
    "усил": ["ability_strengthen", "ability_strengthen_plus"],
    "weaken": ["ability_weaken", "ability_weaken_plus"],
    "проклятие": ["ability_weaken", "ability_weaken_plus"],
}

# Синонимы главной команды. Любое из этих слов после точки
# трактуется как призыв к фильтрации мутантов, а следующие слова
# считаются фильтром и значением. Например, `.мутанты скорость 4`.
MAIN_COMMANDS: List[str] = ["м", "мутант", "мутанты", "mutant", "mutants"]

# Множество айди чатов (или пользователей), которым уже отправлено
# приветственное сообщение. Используется для отправки приветствия
# только при первой команде.
greeted_chats: set[int] = set()


# ---------------------------------------------------------------------------
# Загрузка и фильтрация данных
# ---------------------------------------------------------------------------

def load_json(path: str) -> Any:
    """Загрузить данные из JSON‑файла.

    Возвращает содержимое файла (список, словарь и т. п.) либо пустой
    список, если файл не найден или повреждён. Ранее функция
    возвращала только списки и игнорировала словари, что мешало
    загрузке файлов вроде `skins.json` с корневым объектом.
    """
    # Определяем фактический путь: если файл не найден в исходном
    # каталоге, пытаемся открыть его в ALT_DATA_DIR.
    file_path = path
    if not os.path.isfile(file_path):
        # берем только имя файла и ищем в альтернативном каталоге
        base_name = os.path.basename(path)
        alt_path = os.path.join(ALT_DATA_DIR, base_name)
        if os.path.isfile(alt_path):
            file_path = alt_path
    try:
        with open(file_path, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return []


def load_all_mutants() -> List[dict]:
    """Загрузить объединённый список обычных, звёздных и скин‑мутантов."""
    mutants: List[dict] = []

    # Загрузить обычные мутанты
    normal_data = load_json(DATA_FILE)
    if isinstance(normal_data, list):
        mutants.extend(normal_data)
    elif isinstance(normal_data, dict) and "specimens" in normal_data:
        # на случай, если файл имеет структуру с specimens
        specimens = normal_data.get("specimens")
        if isinstance(specimens, list):
            mutants.extend(specimens)

    # Загрузить звёздные мутанты
    for path in STAR_FILES.values():
        star_data = load_json(path)
        if isinstance(star_data, list):
            mutants.extend(star_data)
        elif isinstance(star_data, dict) and "specimens" in star_data:
            specs = star_data.get("specimens")
            if isinstance(specs, list):
                mutants.extend(specs)

    # Загрузить скины
    skins_data = load_json(SKINS_FILE)
    if isinstance(skins_data, dict):
        skins_list = skins_data.get("specimens", [])
        if isinstance(skins_list, list):
            mutants.extend(skins_list)
    elif isinstance(skins_data, list):
        mutants.extend(skins_data)

    return mutants


def count_by_speed(mutants: Iterable[dict], speed: float) -> int:
    """Посчитать количество мутантов с заданной скоростью."""
    count = 0
    for m in mutants:
        try:
            spd = float(m.get("base_stats", {}).get("lvl1", {}).get("spd"))
            if abs(spd - speed) < 1e-9:
                count += 1
        except Exception:
            continue
    return count


def count_by_numeric_range(
    mutants: Iterable[dict],
    key: str,
    target: float,
    tolerance: float,
) -> int:
    """Посчитать количество мутантов, у которых значение key находится в диапазоне.

    key должен быть 'hp', 'atk1' или 'atk2'.
    Мутант считается подходящим, если любое из указанных значений
    находится в интервале [target - tolerance, target + tolerance]."""
    count = 0
    for m in mutants:
        try:
            lvl1 = m.get("base_stats", {}).get("lvl1", {})
            # если ищем атаку, проверим atk1 и atk2
            if key == "atk":
                atk1 = lvl1.get("atk1")
                atk2 = lvl1.get("atk2")
                vals = [atk1, atk2]
            else:
                vals = [lvl1.get(key)]
            for val in vals:
                try:
                    v = float(val)
                except Exception:
                    continue
                if abs(v - target) <= tolerance:
                    count += 1
                    break
        except Exception:
            continue
    return count


def count_by_substring(
    mutants: Iterable[dict],
    field: str,
    substring: str,
    *,
    list_field: bool = False,
) -> int:
    """Посчитать количество мутантов, у которых указанное поле
    содержит подстроку (без учёта регистра).

    Если list_field=True, то поле рассматривается как список
    (например, abilities, genes, bingo, image), и подстрока ищется
    в любом элементе списка. В противном случае поле считается
    строковым."""
    substring = substring.lower()
    count = 0
    for m in mutants:
        value = m.get(field)
        if list_field:
            if not isinstance(value, list):
                continue
            for item in value:
                if isinstance(item, dict):
                    # для abilities используем ключ name
                    item_value = item.get("name", "")
                else:
                    item_value = str(item)
                if substring in item_value.lower():
                    count += 1
                    break
        else:
            if isinstance(value, str) and substring in value.lower():
                count += 1
    return count


def count_by_skin(mutants: Iterable[dict], substring: str) -> int:
    """Посчитать количество скинов, соответствующих подстроке.

    Поиск выполняется по полю ``skin`` (если есть) и по путям
    изображений в поле ``image``. Сравнение нечувствительно к регистру.
    """
    sub = substring.lower()
    count = 0
    for m in mutants:
        # Если объект имеет явное поле 'skin'
        val = m.get("skin")
        if isinstance(val, str) and sub in val.lower():
            count += 1
            continue
        # Иначе ищем подстроку в путях изображений
        images = m.get("image")
        if isinstance(images, list):
            for img in images:
                if sub in str(img).lower():
                    count += 1
                    break
    return count


def count_by_exact(
    mutants: Iterable[dict], field: str, target: str
) -> int:
    """Посчитать количество мутантов с точным совпадением по полю."""
    target_lower = target.lower()
    count = 0
    for m in mutants:
        val = m.get(field)
        # поле может быть списком (genes), строкой или отсутствовать
        if isinstance(val, list):
            # для списка – точное совпадение хотя бы одного элемента
            for elem in val:
                if str(elem).lower() == target_lower:
                    count += 1
                    break
        else:
            if isinstance(val, str) and val.lower() == target_lower:
                count += 1
    return count


def count_by_ability(mutants: Iterable[dict], value: str) -> int:
    """Посчитать количество мутантов, удовлетворяющих поиску по умению.

    Поиск выполняется в несколько этапов:
      * Если value является числом (или содержит символ %), ищем это
        значение среди числовых полей в объектах умения (effect_value,
        chance и т. п.), считая совпадением при точном равенстве.
      * Иначе, если значение входит в словарь ABILITY_SYNONYMS, то
        используется список идентификаторов умений, и проверяется,
        присутствует ли любой из этих идентификаторов в поле ``id``
        каждого умения.
      * В противном случае выполняется поиск по подстроке: значение
        сравнивается с полями ``id`` и ``name`` каждого умения
        (без учёта регистра).
    Мутант считается подходящим, если хотя бы одно умение удовлетворяет
    условию поиска.
    """
    # Разделяем входную строку на числовую часть и текстовую (имя умения).
    val_str = str(value).strip()
    tokens = val_str.split()
    num_value: Optional[float] = None
    synonym_tokens: List[str] = []
    for tok in tokens:
        # Удаляем символы % и заменяем запятую на точку для числового сравнения
        cand = tok.replace("%", "").replace(",", ".")
        try:
            # если токен представляет собой число, сохраняем и пропускаем
            num_value = float(cand)
            continue
        except Exception:
            synonym_tokens.append(tok)
    synonyms_lower = " ".join(synonym_tokens).strip().lower()
    is_numeric = num_value is not None
    count = 0
    for m in mutants:
        abilities = m.get("abilities")
        if not isinstance(abilities, list):
            continue
        found = False
        for ab in abilities:
            ab_id = ""
            ab_name = ""
            # Извлекаем id и name, если объект
            if isinstance(ab, dict):
                ab_id = str(ab.get("id", "")).lower()
                ab_name = str(ab.get("name", "")).lower()
            else:
                ab_id = str(ab).lower()
                ab_name = str(ab).lower()
            # 1. Поиск по числу (если указано) и имени умения одновременно
            if is_numeric and synonyms_lower:
                # Проверяем совпадение по имени умения (через синонимы или подстроку)
                syn_list = ABILITY_SYNONYMS.get(synonyms_lower)
                match_syn = False
                if syn_list:
                    for syn in syn_list:
                        syn_low = syn.lower()
                        if ab_id == syn_low or ab_id.startswith(syn_low) or syn_low in ab_id or syn_low in ab_name:
                            match_syn = True
                            break
                else:
                    # если синоним не найден в словаре, ищем подстроку
                    if synonyms_lower in ab_id or synonyms_lower in ab_name:
                        match_syn = True
                if not match_syn:
                    continue  # имя не совпало, проверяем следующее умение
                # Теперь проверяем числовые поля. Допускаем, что значение
                # из JSON может быть как долей (0.2), так и процентом (20). Поэтому
                # ищем совпадение для num_value и для num_value/100, если num_value > 1.
                if isinstance(ab, dict):
                    possible_vals: List[float] = []
                    if num_value is not None:
                        possible_vals.append(num_value)
                        if num_value > 1:
                            possible_vals.append(num_value / 100.0)
                        else:
                            possible_vals.append(num_value * 100.0)
                    for _, v in ab.items():
                        if isinstance(v, (int, float)):
                            try:
                                fv = float(v)
                            except Exception:
                                continue
                            for pv in possible_vals:
                                if abs(fv - pv) < 1e-6:
                                    found = True
                                    break
                            if found:
                                break
                    if found:
                        break
                continue
            # 2. Поиск только по числу
            if is_numeric and not synonyms_lower:
                if isinstance(ab, dict):
                    possible_vals: List[float] = []
                    if num_value is not None:
                        possible_vals.append(num_value)
                        if num_value > 1:
                            possible_vals.append(num_value / 100.0)
                        else:
                            possible_vals.append(num_value * 100.0)
                    for _, v in ab.items():
                        if isinstance(v, (int, float)):
                            try:
                                fv = float(v)
                            except Exception:
                                continue
                            for pv in possible_vals:
                                if abs(fv - pv) < 1e-6:
                                    found = True
                                    break
                            if found:
                                break
                    if found:
                        break
                # если ab не dict, не проверяем
                continue
            # 3. Поиск только по имени умения
            if not is_numeric and synonyms_lower:
                syn_list = ABILITY_SYNONYMS.get(synonyms_lower)
                if syn_list:
                    match_syn = False
                    for syn in syn_list:
                        syn_low = syn.lower()
                        if ab_id == syn_low or ab_id.startswith(syn_low) or syn_low in ab_id or syn_low in ab_name:
                            match_syn = True
                            break
                    if match_syn:
                        found = True
                        break
                else:
                    # просто ищем подстроку в id и name
                    if synonyms_lower in ab_id or synonyms_lower in ab_name:
                        found = True
                        break
            # 4. Поиск по строке без чисел
            elif not is_numeric and not synonyms_lower:
                # Если обе части пусты, ничего не ищем
                continue
        if found:
            count += 1
    return count


# ---------------------------------------------------------------------------
# Формирование URL мини‑приложения
# ---------------------------------------------------------------------------

def build_webapp_url(filter_type: str, value: Optional[str | float], tol: Optional[float] = None) -> str:
    """Построить URL мини‑приложения с нужными параметрами.

    В URL передаются параметры:
      filter – тип фильтра (all, star, speed, hp, atk, name, ability, gene, type, tier, bingo, skin)
      value  – значение фильтра (строка или число)
      tol    – допустимое отклонение (для hp/atk)
    """
    params: Dict[str, Any] = {"filter": filter_type}
    if value is not None:
        params["value"] = str(value)
    if tol is not None:
        params["tol"] = str(tol)
    query = urllib.parse.urlencode(params, doseq=True)
    return f"{BASE_APP_URL}?{query}"


# ---------------------------------------------------------------------------
# Обработчики команд
# ---------------------------------------------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Отправить приветственное сообщение и список доступных команд."""
    message = (
        "Привет! Я бот для проекта MGG Fun Site. Я могу помочь найти мутантов "
        "по различным критериям. Теперь все команды пишутся на русском "
        "и начинаются с точки. Вот основные варианты:\n\n"
        ".все – показать всех мутантов\n"
        ".бронза, .серебро, .золото, .платина – фильтр по уровню звезды\n"
        ".мутанты скорость <число> – фильтр по точной скорости\n"
        ".мутанты имя <подстрока> – поиск по имени\n"
        ".мутанты хп <число> – поиск по HP (±500)\n"
        ".мутанты атака <число> – поиск по атаке (±100)\n"
        ".мутанты умение <название или %> – поиск по умениям\n"
        ".мутанты ген <буква или название> – поиск по гену\n"
        ".мутанты тип <тип> – поиск по типу\n"
        ".мутанты тир <уровень> – поиск по tier\n"
        ".мутанты бинго <слово> – поиск по бинго\n"
        ".мутанты скин <название> – поиск по названию скина"
    )
    await update.message.reply_text(message)


async def send_filter_result(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    filter_type: str,
    value: Optional[str | float],
    *,
    tol: Optional[float] = None,
    label_prefix: Optional[str] = None,
    expects_value: bool = True,
) -> None:
    """Общая функция для отправки кнопки с результатом фильтрации.

    Вычисляет количество подходящих мутантов, формирует ссылку на
    мини‑приложение и отправляет кнопку. Если бот работает в личном
    сообщении, количество совпадений выводится текстом."""
    chat_type = update.effective_chat.type if update.effective_chat else None
    mutants = load_all_mutants()
    # Всегда вычисляем количество подходящих мутантов. Если локальные файлы
    # отсутствуют, список mutants будет пуст и count останется равным 0.
    count = 0
    if filter_type == "star":
        # для звёзд считаем количество в соответствующем файле
        if isinstance(value, str) and value.lower() in STAR_FILES:
            star_data = load_json(STAR_FILES[value.lower()])
            if isinstance(star_data, list):
                count = len(star_data)
            elif isinstance(star_data, dict) and "specimens" in star_data:
                specs = star_data.get("specimens")
                count = len(specs) if isinstance(specs, list) else 0
            else:
                count = 0
        else:
            count = 0
    elif filter_type == "all":
        count = len(mutants)
    elif filter_type == "speed":
        try:
            speed_val = float(value) if value is not None else 0.0
            count = count_by_speed(mutants, speed_val)
        except Exception:
            count = 0
    elif filter_type == "hp":
        try:
            val = float(value)
            tolerance = tol if tol is not None else HP_TOLERANCE
            count = count_by_numeric_range(mutants, "hp", val, tolerance)
        except Exception:
            count = 0
    elif filter_type == "atk":
        try:
            val = float(value)
            tolerance = tol if tol is not None else ATK_TOLERANCE
            count = count_by_numeric_range(mutants, "atk", val, tolerance)
        except Exception:
            count = 0
    elif filter_type in {"name", "ability", "bingo"}:
        # Для name и bingo используем поиск подстроки. Для ability –
        # отдельную функцию, учитывающую словарь синонимов и поиск по числам.
        if filter_type == "ability":
            count = count_by_ability(mutants, str(value))
        else:
            list_field = filter_type == "bingo"
            field_map = {
                "name": "name",
                "bingo": "bingo",
            }
            field = field_map[filter_type]
            count = count_by_substring(mutants, field, str(value), list_field=list_field)
    elif filter_type == "skin":
        # Поиск по скинам: используем отдельную функцию, чтобы искать как по полю 'skin',
        # так и по путям изображений. Список mutants может включать как обычных, так и
        # скин‑мутантов.
        count = count_by_skin(mutants, str(value))
    elif filter_type in {"gene", "type", "tier"}:
        field_map = {
            "gene": "genes",
            "type": "type",
            "tier": "tier",
        }
        field = field_map[filter_type]
        count = count_by_exact(mutants, field, str(value))
    else:
        count = 0

    # Формируем URL для веб‑приложения
    url = build_webapp_url(filter_type, value, tol)
    # Текст кнопки
    if label_prefix is None:
        if filter_type == "all":
            label_prefix = "Показать всех"
        elif filter_type == "star":
            label_prefix = f"Показать {value}"
        elif filter_type in {"hp", "atk"}:
            label_prefix = f"Показать {filter_type.upper()}≈{value}"
        else:
            label_prefix = f"Показать {filter_type}: {value}"

    # Формируем текст кнопки: всегда добавляем количество
    button_text = f"{label_prefix} ({count})"

    button = InlineKeyboardButton(
        text=button_text,
        web_app=WebAppInfo(url=url),
    )
    markup = InlineKeyboardMarkup([[button]])

    # Сообщение для группового чата: только кнопка. Для личного сообщения –
    # добавим описание.
    if chat_type == "private":
        # В личном сообщении выводим количество совпадений
        await update.message.reply_text(
            f"Найдено мутантов: {count}. Нажмите кнопку ниже, чтобы открыть веб‑приложение.",
            reply_markup=markup,
        )
    else:
        await update.message.reply_text(
            "Нажмите кнопку, чтобы открыть список мутантов.",
            reply_markup=markup,
        )


async def handle_speed(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args
    if len(args) < 2 or args[0].lower() != "speed":
        await update.message.reply_text(
            "Использование: /mutants speed <значение>"
        )
        return
    value = args[1]
    try:
        float(value)
    except Exception:
        await update.message.reply_text(
            "Значение скорости должно быть числом, например 4 или 6.667."
        )
        return
    await send_filter_result(update, context, "speed", value)


async def handle_all(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_filter_result(update, context, "all", None, expects_value=False)


async def handle_star(update: Update, context: ContextTypes.DEFAULT_TYPE, star: str) -> None:
    await send_filter_result(update, context, "star", star.lower(), expects_value=False)


async def handle_hp(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args
    if not args:
        await update.message.reply_text("Использование: /hp <число>")
        return
    try:
        value = float(args[0])
    except Exception:
        await update.message.reply_text("HP должно быть числом, например 4000")
        return
    await send_filter_result(update, context, "hp", value, tol=HP_TOLERANCE)


async def handle_atk(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args
    if not args:
        await update.message.reply_text("Использование: /atk <число>")
        return
    try:
        value = float(args[0])
    except Exception:
        await update.message.reply_text("Атака должна быть числом, например 500")
        return
    await send_filter_result(update, context, "atk", value, tol=ATK_TOLERANCE)


async def handle_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Использование: /name <часть имени>")
        return
    value = " ".join(context.args)
    await send_filter_result(update, context, "name", value)


async def handle_ability(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Использование: /ability <название>")
        return
    value = " ".join(context.args)
    await send_filter_result(update, context, "ability", value)


async def handle_gene(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Использование: /gene <код>")
        return
    value = context.args[0]
    await send_filter_result(update, context, "gene", value)


async def handle_type(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Использование: /type <тип>")
        return
    value = context.args[0]
    await send_filter_result(update, context, "type", value)


async def handle_tier(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Использование: /tier <уровень>")
        return
    value = context.args[0]
    await send_filter_result(update, context, "tier", value)


async def handle_bingo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Использование: /bingo <слово>")
        return
    value = " ".join(context.args)
    await send_filter_result(update, context, "bingo", value)


async def handle_skin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Использование: /skin <название>")
        return
    value = " ".join(context.args)
    await send_filter_result(update, context, "skin", value)


async def handle_mutants(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик для команды /mutants.

    Эта команда используется только для фильтрации по скорости, чтобы
    сохранить обратную совместимость. Ожидается формат:
      /mutants speed <значение>
    Во всех остальных случаях будет выведено сообщение об ошибке.
    """
    await handle_speed(update, context)


async def handle_dot_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик сообщений, начинающихся с точки (.) для русскоязычных команд.

    Пользователь может вводить команды вида:
      .мутанты <фильтр> <значение> – фильтрация по указанному критерию.
      .бронза, .серебро, .золото, .платина – вывод звездных мутантов.
      .все – вывести всех мутантов.

    Фильтры распознаются по словарю FILTER_SYNONYMS. Если введена
    русская вариация гена (например, "киборг"), она будет
    преобразована в соответствующий код (A–F). В случае неверной
    команды пользователю выводится сообщение с подсказкой.
    """
    message = update.message
    if not message or not message.text:
        return
    text = message.text.strip()
    if not text.startswith('.'):
        return  # не наша команда
    # Удаляем точку и разбиваем на части
    payload = text[1:].strip()
    tokens = payload.split()
    chat_id = update.effective_chat.id if update.effective_chat else None
    # Отправляем приветствие один раз для каждого чата
    if chat_id is not None and chat_id not in greeted_chats:
        greeted_chats.add(chat_id)
        # Краткое приветственное сообщение без списка команд
        greet_msg = (
            "Привет! Я бот для проекта MGG Fun Site."
        )
        await message.reply_text(greet_msg)
        # после приветствия продолжаем обработку команды
    if not tokens:
        # пустая команда
        await message.reply_text(
            "Неизвестная команда. Используйте .мутанты <фильтр> <значение> или .все, .бронза, .серебро, .золото, .платина."
        )
        return
    cmd = tokens[0].lower()
    # 1. Проверяем, не является ли команда синонимом уровня звезд
    for star_key, star_syns in STAR_SYNONYMS.items():
        if cmd in star_syns:
            # Фильтр по звёздам не требует значения
            await send_filter_result(update, context, "star", star_key, expects_value=False, label_prefix=f"Показать {star_key}")
            return
    # 2. Проверяем команду «все»
    if cmd in FILTER_SYNONYMS.get("all", []):
        await send_filter_result(update, context, "all", None, expects_value=False)
        return
    # 3. Проверяем, начинается ли команда с главной команды (мутанты/мутант/м)
    if cmd in MAIN_COMMANDS:
        # Должно быть как минимум два токена: фильтр и значение
        if len(tokens) < 3:
            # Если фильтр относится к умениям, подсказываем доступные
            possible_filter_token = tokens[1].lower() if len(tokens) > 1 else ""
            ability_names = ["щит", "реген", "отражение", "рана", "усиление", "проклятие"]
            # Проверяем, пытается ли пользователь вызвать фильтр умений
            is_ability_call = False
            for syns in FILTER_SYNONYMS.get("ability", []):
                if possible_filter_token == syns:
                    is_ability_call = True
                    break
            if is_ability_call:
                await message.reply_text(
                    "Укажите умение. Доступные варианты: "
                    + ", ".join(ability_names)
                    + ". Например: .мутанты умение щит"
                )
            else:
                await message.reply_text(
                    "Неправильный формат. Ожидается: .мутанты <фильтр> <значение>. Пример: .мутанты скорость 4"
                )
            return
        filter_token = tokens[1].lower()
        # Определяем тип фильтра по словарю синонимов
        filter_type: Optional[str] = None
        for f_type, syns in FILTER_SYNONYMS.items():
            if filter_token in syns:
                filter_type = f_type
                break
        # Может быть, пользователь указал звезду после .мутанты
        if filter_type is None:
            # Проверяем звёзды
            for star_key, star_syns in STAR_SYNONYMS.items():
                if filter_token in star_syns:
                    filter_type = "star"
                    value = star_key
                    # Вызов фильтра по звезде (значение не нужно, expects_value False)
                    await send_filter_result(
                        update,
                        context,
                        filter_type,
                        value,
                        expects_value=False,
                        label_prefix=f"Показать {value}"
                    )
                    return
        # Если фильтр не найден, проверяем, не является ли он сразу именем умения
        if filter_type is None:
            # Если первая часть команды после .мутанты соответствует имени умения,
            # трактуем это как поиск по умению. Все оставшиеся токены
            # (включая возможное число) передаются как значение.
            if filter_token in ABILITY_SYNONYMS:
                ability_value = " ".join(tokens[1:])
                await send_filter_result(update, context, "ability", ability_value)
                return
            await message.reply_text(
                f"Неизвестный фильтр: {filter_token}. Допустимые: скорость, имя, хп, атака, умение, ген, тип, тир, бинго, скин."
            )
            return
        # Формируем значение. Всё, что остаётся после фильтра, объединяем через пробел
        value_token = " ".join(tokens[2:])
        # Особая обработка для генов: если введено русское название, преобразуем его в код
        if filter_type == "gene":
            val_lower = value_token.lower()
            # точное совпадение с кодом? (A/B/C...)
            if len(val_lower) == 1 and val_lower in GENE_NAMES:
                value = val_lower
            elif val_lower in GENE_CODE_FROM_RUS:
                value = GENE_CODE_FROM_RUS[val_lower]
            else:
                value = value_token
        else:
            value = value_token
        # Определяем допустимые отклонения для числовых фильтров
        tol = None
        if filter_type == "hp":
            tol = HP_TOLERANCE
        elif filter_type == "atk":
            tol = ATK_TOLERANCE
        # Отправляем результат
        await send_filter_result(update, context, filter_type, value, tol=tol)
        return
    # 4. Если команда не начинается с главной команды, но совпадает с именем фильтра
    # Позволяет вводить .скорость 4 без слова "мутанты"
    # Пытаемся распознать cmd как фильтр
    potential_filter = None
    for f_type, syns in FILTER_SYNONYMS.items():
        if cmd in syns:
            potential_filter = f_type
            break
    if potential_filter is not None:
        # Должно быть хотя бы два токена: фильтр и значение
        if len(tokens) < 2:
            if potential_filter == "ability":
                ability_names = ["щит", "реген", "отражение", "рана", "усиление", "проклятие"]
                await message.reply_text(
                    "Укажите умение. Доступные варианты: "
                    + ", ".join(ability_names)
                    + ". Например: .умение щит"
                )
            else:
                await message.reply_text(
                    f"Неправильный формат. Ожидается: .{cmd} <значение>."
                )
            return
        value_token = " ".join(tokens[1:])
        value: Optional[str | float]
        if potential_filter == "gene":
            val_lower = value_token.lower()
            if len(val_lower) == 1 and val_lower in GENE_NAMES:
                value = val_lower
            elif val_lower in GENE_CODE_FROM_RUS:
                value = GENE_CODE_FROM_RUS[val_lower]
            else:
                value = value_token
        else:
            value = value_token
        tol = None
        if potential_filter == "hp":
            tol = HP_TOLERANCE
        elif potential_filter == "atk":
            tol = ATK_TOLERANCE
        await send_filter_result(update, context, potential_filter, value, tol=tol)
        return
    # Если не найден фильтр, проверяем, не является ли команда именем умения
    if cmd in ABILITY_SYNONYMS:
        # Команда вида .щит 20 -> поиск по умению
        ability_value = " ".join(tokens)
        await send_filter_result(update, context, "ability", ability_value)
        return
    # Если ничего не подошло, выводим сообщение об ошибке
    await message.reply_text(
        "Неизвестная команда. Используйте .мутанты <фильтр> <значение> или .все, .бронза, .серебро, .золото, .платина."
    )


async def unknown(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Ответ на неизвестные slash‑команды."""
    await update.message.reply_text(
        "Неизвестная команда. Попробуйте /start для списка команд или используйте .мутанты <фильтр> <значение>."
    )


# ---------------------------------------------------------------------------
# Запуск бота
# ---------------------------------------------------------------------------

def main() -> None:
    """Запустить бота в режиме polling."""
    token = BOT_TOKEN or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError(
            "Необходимо установить TELEGRAM_BOT_TOKEN в переменных окружения"
            " или задать BOT_TOKEN в коде."
        )

    app = ApplicationBuilder().token(token).build()

    # Команда /start
    app.add_handler(CommandHandler("start", start))
    # Удалены все старые slash‑команды, за исключением /start. Теперь
    # фильтрация выполняется через русские команды, начинающиеся с точки
    # (.мутанты, .все, .бронза и т.д.).

    # Обработчик для русскоязычных команд, начинающихся с точки
    # (например, .мутанты скорость 4). Этот обработчик будет
    # вызываться для всех текстовых сообщений, которые не являются
    # slash‑командами.
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_dot_command))

    # Обработчик неизвестных slash‑команд: должен идти после
    # всех остальных CommandHandler'ов, чтобы перехватывать
    # команды, которые не были обработаны ранее.
    app.add_handler(MessageHandler(filters.COMMAND, unknown))

    print("Бот запущен. Нажмите Ctrl+C для остановки.")
    app.run_polling()


if __name__ == "__main__":
    main()
