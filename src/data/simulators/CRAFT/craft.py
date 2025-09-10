import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import random
import re
from datetime import datetime, timedelta


class CraftSimulator:
    def __init__(self, root):
        self.root = root
        self.root.title("Симулятор крафта - Мультифайловая версия")
        self.root.geometry("1200x800")
        self.root.configure(bg='#2c3e50')

        # Стили
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.configure_styles()

        # Загрузка данных из файлов
        self.incentive_rewards = self.parse_incentive_rewards('incentreward.txt')
        self.recipes = self.load_all_recipes()

        # Словари для перевода
        self.item_translations = self.create_translations()

        # Активная дополнительная награда
        self.active_incentive = None

        # Создаем вкладки
        self.notebook = ttk.Notebook(root)
        self.notebook.pack(fill='both', expand=True, padx=10, pady=10)

        # Хранилище для данных каждой вкладки
        self.tab_data = {}

        # Все вкладки
        self.create_incentive_tab()
        self.create_blackhole_tab()
        self.create_supplies_tab()
        self.create_orb_tab()
        self.create_star_tab()

        # По умолчанию выбираем первую дополнительную награду
        if self.incentive_rewards:
            self.active_incentive = self.incentive_rewards[0]
            self.incentive_var.set(f"{self.active_incentive['id']} ({self.active_incentive['per1000']}/1000)")
            self.update_incentive_info()

    def configure_styles(self):
        self.style.configure('TNotebook', background='#34495e')
        self.style.configure('TNotebook.Tab', background='#34495e', foreground='white')
        self.style.map('TNotebook.Tab', background=[('selected', '#1abc9c')])
        self.style.configure('TFrame', background='#2c3e50')
        self.style.configure('TLabel', background='#2c3e50', foreground='white')
        self.style.configure('TButton', background='#3498db', foreground='white')
        self.style.configure('TCombobox', fieldbackground='#ecf0f1')
        self.style.configure('TSpinbox', fieldbackground='#ecf0f1')

    def load_file_content(self, filename):
        """Загружает содержимое файла"""
        try:
            with open(filename, 'r', encoding='utf-8') as file:
                return file.read()
        except FileNotFoundError:
            messagebox.showerror("Ошибка", f"Файл '{filename}' не найден!")
            return ""
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось загрузить файл {filename}: {str(e)}")
            return ""

    def load_all_recipes(self):
        """Загружает все рецепты из всех файлов"""
        all_recipes = []

        # Загружаем рецепты из каждого файла
        files = [
            ('blackhole.txt', None),  # Black Hole рецепты без категории
            ('lab.txt', 'lab'),
            ('orb.txt', 'orb'),
            ('star.txt', 'star')
        ]

        for filename, category in files:
            content = self.load_file_content(filename)
            if content:
                recipes = self.parse_recipes(content, category)
                all_recipes.extend(recipes)

        return all_recipes

    def parse_incentive_rewards(self, filename):
        """Парсит дополнительные награды из файла"""
        content = self.load_file_content(filename)
        if not content:
            return []

        incentives = []
        pattern = r'<IncentiveReward duration="(\d+)" id="([^"]+)" per1000="(\d+)"/>'

        matches = re.findall(pattern, content)
        for match in matches:
            incentives.append({
                'duration': int(match[0]),
                'id': match[1],
                'per1000': int(match[2]),
                'probability': int(match[2]) / 1000.0
            })
        return incentives

    def parse_recipes(self, content, default_category=None):
        """Упрощенный парсер рецептов"""
        recipes = []
        lines = content.split('\n')

        current_recipe = None
        for line in lines:
            line = line.strip()

            # Начало рецепта
            if line.startswith('<Recipe'):
                # Извлекаем атрибуты
                id_match = re.search(r'id="([^"]+)"', line)
                bonus_match = re.search(r'bonusPer1000="(\d+)"', line)
                category_match = re.search(r'category="([^"]+)"', line)
                okHC_match = re.search(r'okHC="(\d+)"', line)

                if id_match:
                    current_recipe = {
                        'id': id_match.group(1),
                        'bonusPer1000': int(bonus_match.group(1)) if bonus_match else 0,
                        'okHC': int(okHC_match.group(1)) if okHC_match else 0,
                        'category': category_match.group(1) if category_match else default_category,
                        'ingredients': [],
                        'rewards': []
                    }

            # Ингредиент
            elif line.startswith('<ingredient') and current_recipe:
                regex_match = re.search(r'regex="([^"]+)"', line)
                amount_match = re.search(r'amount="(\d+)"', line)
                if regex_match and amount_match:
                    current_recipe['ingredients'].append({
                        'regex': regex_match.group(1),
                        'amount': int(amount_match.group(1))
                    })

            # Награда
            elif line.startswith('<reward') and current_recipe:
                id_match = re.search(r'id="([^"]+)"', line)
                amount_match = re.search(r'amount="(\d+)"', line)
                odds_match = re.search(r'odds="(\d+)"', line)

                if id_match:
                    reward = {
                        'id': id_match.group(1),
                        'amount': int(amount_match.group(1)) if amount_match else 1,
                        'odds': int(odds_match.group(1)) if odds_match else 1000
                    }
                    current_recipe['rewards'].append(reward)

            # Конец рецепта
            elif line == '</Recipe>' and current_recipe:
                recipes.append(current_recipe)
                current_recipe = None

        return recipes

    def create_translations(self):
        return {
            # Звезды
            'Star_Bronze': 'Бронзовая звезда',
            'Star_Silver': 'Серебряная звезда',
            'Star_Gold': 'Золотая звезда',
            'Star_Platinum': 'Платиновая звезда',

            # Основные сферы
            'orb_basic_attack': 'Сфера атаки',
            'orb_basic_life': 'Сфера HP',
            'orb_basic_critical': 'Сфера крит. урона',
            'orb_basic_strengthen': 'Сфера усиления',
            'orb_basic_weaken': 'Сфера проклятья',
            'orb_basic_regenerate': 'Сфера вампиризма',
            'orb_basic_shield': 'Сфера щита',
            'orb_basic_retaliate': 'Сфера отражения',
            'orb_basic_slash': 'Сфера ранения',
            'orb_basic_xp': 'Сфера опыта',

            # Особые сферы
            'orb_special_addstrengthen': 'Особая сфера усиления',
            'orb_special_addweaken': 'Особая сфера проклятья',
            'orb_special_addregenerate': 'Особая сфера вампиризма',
            'orb_special_addshield': 'Особая сфера щита',
            'orb_special_addretaliate': 'Особая сфера отражения',
            'orb_special_addslash': 'Особая сфера ранения',
            'orb_special_speed': 'Особая сфера скорости',

            # Материалы
            'Material_Muto1': 'Малая доза мутостерона',
            'Material_Muto10': 'Доза мутостерона',
            'Material_Muto50': 'Большая доза мутостерона',
            'Material_XP10': 'Плитка опыта',
            'Material_XP250': 'Баночка опыта',
            'Material_XP1000': 'Банка опыта',
            'Material_LP10': 'Маленькая аптечка',
            'Material_LP100': 'Аптечка',
            'Material_LP1000': 'Большая аптечка',
            'Material_Gacha_Token': 'Жетон генератора',
            'Material_Event_Token': 'Жетон испытания',
            'Material_Jackpot_Token': 'Жетон джекпота',

            # Бустеры
            'Charm_Xpx3_7': 'Бустер опыта +200% (7д)',
            'Charm_Xpx2_7': 'Бустер опыта +100% (7д)',
            'Charm_Regenx4_7': 'Бустер восстановления +300% (7д)',
            'Charm_Regenx2_7': 'Бустер восстановления +100% (7д)',
            'Charm_Critical_7': 'Бустер крит. ударов (7д)',
            'Charm_Anticritical_7': 'Бустер щита (7д)',
            'Charm_Xpx3_3': 'Бустер опыта +200% (3д)',
            'Charm_Xpx2_3': 'Бустер опета +100% (3д)',
            'Charm_Regenx4_3': 'Бустер восстановления +300% (3д)',
            'Charm_Regenx2_3': 'Бустер восстановления +100% (3д)',
            'Charm_Critical_3': 'Бустер крит. ударов (3д)',
            'Charm_Anticritical_3': 'Бустер щита (3д)',
            'Charm_Xpx3_1': 'Бустер опыта +200% (1д)',
            'Charm_Xpx2_1': 'Бустер опета +100% (1д)',
            'Charm_Regenx4_1': 'Бустер восстановления +300% (1д)',
            'Charm_Regenx2_1': 'Бустер восстановления +100% (1д)',
            'Charm_Critical_1': 'Бустер крит. ударов (1д)',
            'Charm_Anticritical_1': 'Бустер щита (1д)',

            # Пропуска
            'Material_Energy25': '25 пропусков',
            'Material_Energy5': '5 пропусков'
        }

    def translate_item(self, item_id):
        """Переводит ID предмета на русский язык"""
        # Проверяем полное совпадение
        if item_id in self.item_translations:
            return self.item_translations[item_id]

        # Проверяем частичные совпадения для сфер
        for pattern, translation in self.item_translations.items():
            if item_id.startswith(pattern):
                # Добавляем уровень к переводу
                level = item_id.replace(pattern, '')
                if level and level[0] == '_':
                    level_num = level[1:] if len(level) > 1 else ''
                    if level_num.isdigit():
                        return f"{translation} ур.{level_num}"
                return translation

        return item_id  # Возвращаем оригинал, если перевод не найден

    def create_incentive_tab(self):
        self.incentive_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.incentive_frame, text="📊 Доп. награды")

        # Заголовок
        title_label = ttk.Label(self.incentive_frame, text="Дополнительные награды",
                                font=('Arial', 14, 'bold'))
        title_label.pack(pady=10)

        # Выбор награды
        ttk.Label(self.incentive_frame, text="Выберите активную дополнительную награду:").pack(pady=5)

        self.incentive_var = tk.StringVar()
        incentive_ids = [f"{ir['id']} ({ir['per1000']}/1000)" for ir in self.incentive_rewards]
        incentive_combo = ttk.Combobox(self.incentive_frame, textvariable=self.incentive_var,
                                       values=incentive_ids, width=40, state="readonly")
        incentive_combo.pack(pady=5)
        incentive_combo.bind('<<ComboboxSelected>>', self.on_incentive_selected)

        # Информация о награде
        self.incentive_info = scrolledtext.ScrolledText(self.incentive_frame, height=8, width=80,
                                                        font=('Arial', 10))
        self.incentive_info.pack(pady=10, padx=10, fill='both', expand=True)

    def create_blackhole_tab(self):
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="🕳️ Black Hole")

        # Для Black Hole берем рецепты без категории
        recipes = [r for r in self.recipes if r.get('category') is None]
        self.setup_recipe_tab(frame, recipes, "Black Hole")

    def create_supplies_tab(self):
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="🧪 Supplies Lab")

        recipes = [r for r in self.recipes if r.get('category') == 'lab']
        self.setup_recipe_tab(frame, recipes, "Supplies Lab")

    def create_orb_tab(self):
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="🔮 Orb Category")

        recipes = [r for r in self.recipes if r.get('category') == 'orb']
        self.setup_recipe_tab(frame, recipes, "Orb Category")

    def create_star_tab(self):
        frame = ttk.Frame(self.notebook)
        self.notebook.add(frame, text="⭐ Star Category")

        recipes = [r for r in self.recipes if r.get('category') == 'star']
        self.setup_recipe_tab(frame, recipes, "Star Category")

    def setup_recipe_tab(self, frame, recipes, category_name):
        # Очищаем фрейм перед созданием новых элементов
        for widget in frame.winfo_children():
            widget.destroy()

        if not recipes:
            label = ttk.Label(frame, text=f"Рецепты для {category_name} не найдены")
            label.pack(pady=20)
            return

        # Сохраняем данные для этой вкладки
        tab_id = str(frame)  # Уникальный идентификатор фрейма
        self.tab_data[tab_id] = {
            'recipes': recipes,
            'current_recipe': recipes[0]
        }

        # Выбор рецепта
        ttk.Label(frame, text="Выберите рецепт:").pack(pady=5)

        recipe_var = tk.StringVar()
        recipe_names = [r['id'] for r in recipes]
        recipe_combo = ttk.Combobox(frame, textvariable=recipe_var,
                                    values=recipe_names, width=50, state="readonly")
        recipe_combo.pack(pady=5)
        recipe_combo.set(recipe_names[0])

        # Информация о рецепте
        recipe_info = scrolledtext.ScrolledText(frame, height=12, width=80, font=('Arial', 9))
        recipe_info.pack(pady=10, padx=10, fill='both', expand=True)

        # Количество крафтов
        count_frame = ttk.Frame(frame)
        count_frame.pack(pady=5)

        ttk.Label(count_frame, text="Количество крафтов:").pack(side=tk.LEFT, padx=5)
        craft_count = tk.IntVar(value=1)
        craft_spin = ttk.Spinbox(count_frame, from_=1, to=10000, textvariable=craft_count, width=10)
        craft_spin.pack(side=tk.LEFT, padx=5)

        # Кнопка крафта
        craft_btn = ttk.Button(frame, text="🎲 Симулировать крафт",
                               command=lambda: self.simulate_craft(tab_id, recipe_var.get(), craft_count.get()))
        craft_btn.pack(pady=10)

        # Результаты
        ttk.Label(frame, text="Результаты:").pack(pady=5)
        results_text = scrolledtext.ScrolledText(frame, height=15, width=80, font=('Arial', 9))
        results_text.pack(pady=10, padx=10, fill='both', expand=True)

        # Сохраняем виджеты для этой вкладки
        self.tab_data[tab_id].update({
            'recipe_var': recipe_var,
            'recipe_info': recipe_info,
            'craft_count': craft_count,
            'results_text': results_text
        })

        # Отображаем информацию о первом рецепте
        self.display_recipe_info(tab_id, recipes[0])

        # Привязываем обработчик изменения выбора рецепта
        recipe_combo.bind('<<ComboboxSelected>>',
                          lambda e: self.on_recipe_selected(tab_id, recipe_var.get()))

    def on_incentive_selected(self, event):
        selected_text = self.incentive_var.get()
        for incentive in self.incentive_rewards:
            incentive_text = f"{incentive['id']} ({incentive['per1000']}/1000)"
            if incentive_text == selected_text:
                self.active_incentive = incentive
                self.update_incentive_info()
                break

    def update_incentive_info(self):
        if self.active_incentive:
            info = "📋 Активная дополнительная награда:\n\n"
            info += f"🎯 Награда: {self.translate_item(self.active_incentive['id'])}\n"
            info += f"⏱️ Длительность: {self.active_incentive['duration']} мин.\n"
            info += f"🎲 Шанс: {self.active_incentive['per1000']}/1000 "
            info += f"({self.active_incentive['probability'] * 100:.1f}%)\n"

            # Расчет времени окончания
            start_time = datetime.now()
            end_time = start_time + timedelta(minutes=self.active_incentive['duration'])
            info += f"🕐 Начало: {start_time.strftime('%H:%M:%S')}\n"
            info += f"⏰ Окончание: {end_time.strftime('%H:%M:%S')}\n"
            info += f"📅 Дата: {end_time.strftime('%d.%m.%Y')}"

            self.incentive_info.delete(1.0, tk.END)
            self.incentive_info.insert(tk.END, info)

    def on_recipe_selected(self, tab_id, recipe_id):
        tab_data = self.tab_data.get(tab_id)
        if not tab_data:
            return

        for recipe in tab_data['recipes']:
            if recipe['id'] == recipe_id:
                tab_data['current_recipe'] = recipe
                self.display_recipe_info(tab_id, recipe)
                break

    def display_recipe_info(self, tab_id, recipe):
        tab_data = self.tab_data.get(tab_id)
        if not tab_data:
            return

        info = f"📖 Рецепт: {recipe['id']}\n"

        if recipe['bonusPer1000'] > 0:
            info += f"✨ Бонус: {recipe['bonusPer1000']}/1000\n"

        if recipe.get('okHC', 0) > 0:
            info += f"💎 okHC: {recipe['okHC']}\n"

        # Расчет шанса дополнительной награды
        if self.active_incentive and recipe['bonusPer1000'] > 0:
            incentive_chance = (recipe['bonusPer1000'] / 1000) * (self.active_incentive['per1000'] / 1000)
            info += f"🎲 Шанс доп. награды: {incentive_chance * 100:.2f}% "
            info += f"({recipe['bonusPer1000']}/1000 * {self.active_incentive['per1000']}/1000)\n"

        info += "\n"

        info += "🧪 Ингредиенты:\n"
        for ing in recipe['ingredients']:
            translated = self.translate_item(ing['regex'])
            info += f"  - {translated}: {ing['amount']} шт.\n"

        info += "\n🎁 Награды:\n"
        total_odds = sum(r['odds'] for r in recipe['rewards'])
        for reward in recipe['rewards']:
            chance = (reward['odds'] / total_odds) * 100 if total_odds > 0 else 0
            translated = self.translate_item(reward['id'])
            amount_text = f" x{reward['amount']}" if reward['amount'] > 1 else ""
            info += f"  - {translated}{amount_text}: {reward['odds']} ({chance:.2f}%)\n"

        tab_data['recipe_info'].delete(1.0, tk.END)
        tab_data['recipe_info'].insert(tk.END, info)

    def simulate_craft(self, tab_id, recipe_id, count):
        tab_data = self.tab_data.get(tab_id)
        if not tab_data or not recipe_id:
            messagebox.showerror("Ошибка", "Выберите рецепт для крафта")
            return

        # Находим выбранный рецепт
        recipe = None
        for r in tab_data['recipes']:
            if r['id'] == recipe_id:
                recipe = r
                break

        if not recipe:
            messagebox.showerror("Ошибка", "Рецепт не найден")
            return

        # Вычисляем общие шансы для наград
        total_odds = sum(r['odds'] for r in recipe['rewards'])

        # Результаты крафта
        results = {}
        incentive_results = {}

        # Симуляция крафта
        for i in range(count):
            # Основная награда
            if total_odds > 0:
                roll = random.randint(1, total_odds)
                current = 0
                for reward in recipe['rewards']:
                    current += reward['odds']
                    if roll <= current:
                        reward_id = reward['id']
                        amount = reward['amount']
                        if reward_id in results:
                            results[reward_id] += amount
                        else:
                            results[reward_id] = amount
                        break

            # Дополнительная награда
            if self.active_incentive and recipe['bonusPer1000'] > 0:
                incentive_chance = (recipe['bonusPer1000'] / 1000) * (self.active_incentive['per1000'] / 1000)
                if random.random() < incentive_chance:
                    incentive_id = self.active_incentive['id']
                    if incentive_id in incentive_results:
                        incentive_results[incentive_id] += 1
                    else:
                        incentive_results[incentive_id] = 1

        # Отображаем результаты
        self.display_results(tab_id, results, incentive_results, count, recipe)

    def display_results(self, tab_id, results, incentive_results, count, recipe):
        tab_data = self.tab_data.get(tab_id)
        if not tab_data:
            return

        results_text = tab_data['results_text']
        results_text.delete(1.0, tk.END)

        results_text.insert(tk.END, f"🎯 Результаты {count} крафтов\n")
        results_text.insert(tk.END, f"📋 Рецепт: {recipe['id']}\n")

        # Показываем информацию о шансах
        if self.active_incentive and recipe['bonusPer1000'] > 0:
            incentive_chance = (recipe['bonusPer1000'] / 1000) * (self.active_incentive['per1000'] / 1000)
            results_text.insert(tk.END, f"🎲 Шанс доп. награды: {incentive_chance * 100:.2f}%\n")

        results_text.insert(tk.END, "=" * 50 + "\n\n")

        # Основные награды
        results_text.insert(tk.END, "🏆 Основные награды:\n")
        if results:
            total_items = sum(results.values())
            for item, amount in sorted(results.items(), key=lambda x: x[1], reverse=True):
                translated = self.translate_item(item)
                chance = (amount / count) * 100
                percentage = (amount / total_items) * 100 if total_items > 0 else 0
                results_text.insert(tk.END,
                                    f"  - {translated}: {amount} шт. ({chance:.1f}% за крафт, {percentage:.1f}% от всех наград)\n")
        else:
            results_text.insert(tk.END, "  - Нет наград\n")

        # Дополнительные награды
        if incentive_results:
            results_text.insert(tk.END,
                                f"\n✨ Дополнительные награды ({self.translate_item(self.active_incentive['id'])}):\n")
            for item, amount in incentive_results.items():
                translated = self.translate_item(item)
                expected_chance = (recipe['bonusPer1000'] / 1000) * (self.active_incentive['per1000'] / 1000)
                actual_chance = (amount / count) * 100
                results_text.insert(tk.END,
                                    f"  - {translated}: {amount} шт. (ожидалось: {expected_chance * 100:.1f}%, получено: {actual_chance:.1f}%)\n")

        # Статистика
        results_text.insert(tk.END, "\n📊 Статистика:\n")
        total_main = sum(results.values()) if results else 0
        total_incentive = sum(incentive_results.values()) if incentive_results else 0
        results_text.insert(tk.END, f"  - Всего основных наград: {total_main}\n")
        results_text.insert(tk.END, f"  - Всего дополнительных наград: {total_incentive}\n")
        results_text.insert(tk.END, f"  - Общее количество наград: {total_main + total_incentive}\n")


# Запуск приложения
if __name__ == "__main__":
    root = tk.Tk()
    app = CraftSimulator(root)
    root.mainloop()