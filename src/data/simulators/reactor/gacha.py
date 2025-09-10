import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import random
from collections import defaultdict
import xml.etree.ElementTree as ET
import json


# Загрузка и парсинг данных
def parse_gacha_data(xml_content):
    root = ET.fromstring(xml_content)
    gachas = {}

    for gacha_elem in root.findall('Gacha'):
        gacha_id = gacha_elem.get('id')
        token_cost = int(gacha_elem.get('tokenCost', 0))
        hc_cost = int(gacha_elem.get('hcCost', 0))
        filter_name = gacha_elem.get('filter', '')

        basic_elements = []
        for specimen_elem in gacha_elem.find('BasicElements').findall('GachaSpecimen'):
            specimen_id = specimen_elem.get('specimen')
            stars = int(specimen_elem.get('stars', 0))
            odds = int(specimen_elem.get('odds', 0))
            bonus = int(specimen_elem.get('bonus', 0))
            basic_elements.append({
                'specimen': specimen_id,
                'stars': stars,
                'odds': odds,
                'bonus': bonus
            })

        completion_reward = None
        completion_elem = gacha_elem.find('CompletionReward')
        if completion_elem is not None:
            specimen_elem = completion_elem.find('GachaSpecimen')
            if specimen_elem is not None:
                completion_reward = {
                    'specimen': specimen_elem.get('specimen'),
                    'stars': int(specimen_elem.get('stars', 0)),
                    'odds': int(specimen_elem.get('odds', 0)),
                    'bonus': int(specimen_elem.get('bonus', 0))
                }

        gachas[gacha_id] = {
            'token_cost': token_cost,
            'hc_cost': hc_cost,
            'filter': filter_name,
            'basic_elements': basic_elements,
            'completion_reward': completion_reward
        }

    return gachas


# Загрузка данных
with open('gacha.txt', 'r', encoding='utf-8') as f:
    gacha_xml_content = f.read()

with open('mutant_names (2).json', 'r', encoding='utf-8') as f:
    mutant_names = json.load(f)

gacha_data = parse_gacha_data(gacha_xml_content)

# Русские названия генераторов
gacha_names_ru = {
    'western': 'Western',
    'gachaboss': 'Большой босс',
    'japan': 'Япония',
    'fantasy': 'Темное фентези',
    'lucha': 'Мучачо\'с',
    'olympians': 'Боги арены',
    'music': 'Диско',
    'villains': 'Супер злодеи',
    'starwars': 'Космические войны',
    'beach': 'Тропическое лето',
    'heroes': 'Супергерои',
    'soldiers': 'Патруль времени',
    'gothic': 'Готика',
    'movies': 'Кино',
    'elements': 'Команда элементалей',
    'steampunk': 'Стимпанк',
    'vegetal': 'Фотосинтез',
    'girl': 'Хищницы',
    'olympics': 'Кровавые игры'
}

# Названия звезд
star_names = {
    0: "",
    1: "Бронзовая звезда",
    2: "Серебряная звезда",
    3: "Золотая звезда",
    4: "Платиновая звезда"
}


class GachaSimulator:
    def __init__(self, root):
        self.root = root
        self.root.title("🎰 СИМУЛЯТОР ГАЧА-ГЕНЕРАТОРОВ")
        self.root.geometry("1200x800")
        self.root.configure(bg='#2c3e50')

        # Стили
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.configure_styles()

        # Данные
        self.gacha_data = gacha_data
        self.mutant_names = mutant_names
        self.current_gacha = None
        self.completion_status = {}  # Статус завершения для каждого генератора

        # Статистика
        self.total_spins = 0
        self.total_tokens_spent = 0
        self.total_hc_spent = 0
        self.win_history = []
        self.mutant_counts = defaultdict(int)
        self.resource_stats = defaultdict(lambda: defaultdict(int))
        self.completion_history = []  # История завершения генераторов

        # Создаем интерфейс
        self.create_widgets()

        # Инициализируем статус завершения
        for gacha_id in self.gacha_data.keys():
            self.completion_status[gacha_id] = {
                'completed': False,
                'unlocked_specimens': set()
            }

    def configure_styles(self):
        self.style.configure('TFrame', background='#2c3e50')
        self.style.configure('TLabel', background='#2c3e50', foreground='white', font=('Arial', 10))
        self.style.configure('TButton', background='#3498db', foreground='white', font=('Arial', 10, 'bold'))
        self.style.configure('TCombobox', fieldbackground='#ecf0f1', font=('Arial', 10))
        self.style.configure('Header.TLabel', background='#34495e', foreground='white',
                             font=('Arial', 14, 'bold'))
        self.style.configure('Big.TLabel', font=('Arial', 12, 'bold'))
        self.style.configure('Highlight.TLabel', background='#1abc9c', foreground='white',
                             font=('Arial', 11, 'bold'))

    def create_widgets(self):
        # Основной фрейм
        main_frame = ttk.Frame(self.root, padding="15")
        main_frame.pack(fill='both', expand=True)

        # Заголовок
        header = ttk.Label(main_frame, text="🎰 СИМУЛЯТОР ГАЧА-ГЕНЕРАТОРОВ",
                           style='Header.TLabel')
        header.pack(pady=(0, 15))

        # Фрейм выбора генератора
        gacha_frame = ttk.Frame(main_frame)
        gacha_frame.pack(fill='x', pady=10)

        ttk.Label(gacha_frame, text="Выберите генератор:", style='Big.TLabel').pack(side=tk.LEFT, padx=5)

        # Создаем список генераторов с русскими названиями
        gacha_options = []
        for gacha_id, ru_name in gacha_names_ru.items():
            if gacha_id in self.gacha_data:
                gacha_options.append(f"{ru_name} ({gacha_id})")

        self.gacha_var = tk.StringVar()
        self.gacha_combo = ttk.Combobox(gacha_frame, textvariable=self.gacha_var,
                                        values=gacha_options, width=30, state="readonly")
        self.gacha_combo.pack(side=tk.LEFT, padx=5)
        self.gacha_combo.bind('<<ComboboxSelected>>', self.on_gacha_select)

        # Кнопка информации о генераторе
        self.info_btn = ttk.Button(gacha_frame, text="ℹ️ ИНФО", command=self.show_gacha_info)
        self.info_btn.pack(side=tk.LEFT, padx=5)

        # Фрейм управления
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill='x', pady=10)

        ttk.Label(control_frame, text="Количество жетонов:", style='Big.TLabel').pack(side=tk.LEFT, padx=5)

        self.token_amount = tk.IntVar(value=100)
        token_entry = ttk.Entry(control_frame, textvariable=self.token_amount, width=10)
        token_entry.pack(side=tk.LEFT, padx=5)

        self.spin_token_btn = ttk.Button(control_frame, text="🎲 КРУТИТЬ ЗА ЖЕТОНЫ",
                                         command=lambda: self.run_simulation('token'))
        self.spin_token_btn.pack(side=tk.LEFT, padx=5)

        ttk.Label(control_frame, text="Количество золота:", style='Big.TLabel').pack(side=tk.LEFT, padx=5)

        self.hc_amount = tk.IntVar(value=1000)
        hc_entry = ttk.Entry(control_frame, textvariable=self.hc_amount, width=10)
        hc_entry.pack(side=tk.LEFT, padx=5)

        self.spin_hc_btn = ttk.Button(control_frame, text="💰 КРУТИТЬ ЗА ЗОЛОТО",
                                      command=lambda: self.run_simulation('hc'))
        self.spin_hc_btn.pack(side=tk.LEFT, padx=5)

        self.clear_btn = ttk.Button(control_frame, text="🗑️ ОЧИСТИТЬ ВСЁ",
                                    command=self.clear_history)
        self.clear_btn.pack(side=tk.LEFT, padx=5)

        # Фрейм с вкладками
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill='both', expand=True, pady=10)

        # Вкладка результатов
        results_frame = ttk.Frame(notebook)
        notebook.add(results_frame, text="📊 РЕЗУЛЬТАТЫ")

        self.results_text = scrolledtext.ScrolledText(results_frame, height=20, width=100,
                                                      font=('Consolas', 9))
        self.results_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Вкладка статистики
        stats_frame = ttk.Frame(notebook)
        notebook.add(stats_frame, text="📈 СТАТИСТИКА")

        self.stats_text = scrolledtext.ScrolledText(stats_frame, height=20, width=100,
                                                    font=('Consolas', 9))
        self.stats_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Вкладка информации о генераторе
        info_frame = ttk.Frame(notebook)
        notebook.add(info_frame, text="ℹ️ ИНФО О ГЕНЕРАТОРЕ")

        self.info_text = scrolledtext.ScrolledText(info_frame, height=20, width=100,
                                                   font=('Consolas', 9))
        self.info_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Инициализируем информацию
        self.update_info_display()

    def get_current_gacha_id(self):
        """Получает ID текущего выбранного генератора"""
        selection = self.gacha_var.get()
        if selection and '(' in selection and ')' in selection:
            return selection.split('(')[1].replace(')', '').strip()
        return None

    def on_gacha_select(self, event):
        """Обработчик выбора генератора"""
        self.current_gacha = self.get_current_gacha_id()
        self.update_info_display()

    def show_gacha_info(self):
        """Показывает информацию о выбранном генераторе"""
        self.update_info_display()

    def update_info_display(self):
        """Обновляет информацию о генераторе"""
        gacha_id = self.get_current_gacha_id()
        if not gacha_id or gacha_id not in self.gacha_data:
            self.info_text.configure(state='normal')
            self.info_text.delete(1.0, tk.END)
            self.info_text.insert(tk.END, "Выберите генератор для просмотра информации")
            self.info_text.configure(state='disabled')
            return

        gacha = self.gacha_data[gacha_id]
        ru_name = gacha_names_ru.get(gacha_id, gacha_id)

        self.info_text.configure(state='normal')
        self.info_text.delete(1.0, tk.END)

        # Основная информация
        info_text = f"🎰 ГЕНЕРАТОР: {ru_name}\n"
        info_text += "=" * 50 + "\n\n"
        info_text += f"Стоимость за жетоны: {gacha['token_cost']} жетонов\n"
        info_text += f"Стоимость за золото: {gacha['hc_cost']} золота\n\n"

        # Статус завершения
        status = self.completion_status[gacha_id]
        completed = status['completed']
        unlocked_count = len(status['unlocked_specimens'])
        total_basic = len(gacha['basic_elements'])

        info_text += f"Статус: {'✅ ЗАВЕРШЕНО' if completed else '🚫 НЕ ЗАВЕРШЕНО'}\n"
        info_text += f"Открыто мутантов: {unlocked_count}/{total_basic}\n\n"

        # Основные награды
        info_text += "🎯 ОСНОВНЫЕ НАГРАДЫ:\n"
        info_text += "-" * 40 + "\n"

        # Рассчитываем общие шансы (включая награду за завершение, если генератор завершен)
        total_odds = sum(item['odds'] for item in gacha['basic_elements'])
        if completed and gacha['completion_reward']:
            total_odds += gacha['completion_reward']['odds']

        for i, item in enumerate(gacha['basic_elements'], 1):
            specimen_id = item['specimen']
            mutant_name = self.mutant_names.get(specimen_id, specimen_id)
            star_text = f" ({star_names[item['stars']]})" if item['stars'] > 0 else ""

            # Проверяем статус разблокировки
            is_unlocked = specimen_id in status['unlocked_specimens']
            status_icon = "✅" if is_unlocked else "❌"

            chance = (item['odds'] / total_odds) * 100
            info_text += f"{i}. {status_icon} {mutant_name}{star_text} - {chance:.2f}%\n"

        # Награда за завершение
        if gacha['completion_reward']:
            comp = gacha['completion_reward']
            specimen_id = comp['specimen']
            mutant_name = self.mutant_names.get(specimen_id, specimen_id)
            star_text = f" ({star_names[comp['stars']]})" if comp['stars'] > 0 else ""

            info_text += f"\n🏆 НАГРАДА ЗА ЗАВЕРШЕНИЕ:\n"

            # Показываем шанс выпадения, если генератор завершен
            if completed:
                chance = (comp['odds'] / total_odds) * 100
                info_text += f"{mutant_name}{star_text} - {chance:.2f}%\n"
            else:
                info_text += f"{mutant_name}{star_text}\n"

        self.info_text.insert(tk.END, info_text)
        self.info_text.configure(state='disabled')

    def spin_gacha(self, gacha_id, use_type):
        """Крутит генератор и возвращает выигранную награду"""
        if gacha_id not in self.gacha_data:
            return None

        gacha = self.gacha_data[gacha_id]
        status = self.completion_status[gacha_id]
        was_completed_before = status['completed']
        completion_mutant = None

        # Если крутим за золото - гарантированно получаем следующую незаблокированную награду
        if use_type == 'hc':
            basic_elements = gacha['basic_elements']

            # Ищем первую незаблокированную награду
            for item in basic_elements:
                if item['specimen'] not in status['unlocked_specimens']:
                    # Разблокируем эту награду
                    status['unlocked_specimens'].add(item['specimen'])

                    # Проверяем, завершен ли теперь генератор
                    if len(status['unlocked_specimens']) == len(basic_elements):
                        status['completed'] = True
                        completion_mutant = item['specimen']  # Мутант, который завершил генератор

                    return item, completion_mutant

            # Если все основные награды разблокированы, но генератор не завершен
            if not status['completed'] and len(status['unlocked_specimens']) == len(basic_elements):
                status['completed'] = True
                completion_mutant = "all_unlocked"  # Все уже были разблокированы

            # Если генератор завершен, можем выиграть completion reward
            if status['completed'] and gacha['completion_reward']:
                return gacha['completion_reward'], completion_mutant

            # Если все разблокировано, но нет completion reward, возвращаем случайную основную награду
            return random.choice(basic_elements), completion_mutant

        # Если крутим за жетоны - случайный выбор с учетом шансов
        else:
            # Создаем пул доступных наград
            available_rewards = []
            weights = []

            # Добавляем основные награды
            for item in gacha['basic_elements']:
                available_rewards.append(item)
                weights.append(item['odds'])

            # Если генератор завершен, добавляем completion reward
            if status['completed'] and gacha['completion_reward']:
                available_rewards.append(gacha['completion_reward'])
                weights.append(gacha['completion_reward']['odds'])

            # Выбираем случайную награду с учетом весов
            total_weight = sum(weights)
            r = random.randint(1, total_weight)
            current_weight = 0

            for i, weight in enumerate(weights):
                current_weight += weight
                if current_weight >= r:
                    won_item = available_rewards[i]

                    # Если это основная награда и она еще не разблокирована - разблокируем
                    if won_item in gacha['basic_elements'] and won_item['specimen'] not in status['unlocked_specimens']:
                        status['unlocked_specimens'].add(won_item['specimen'])

                        # Проверяем, завершен ли теперь генератор
                        if len(status['unlocked_specimens']) == len(gacha['basic_elements']):
                            status['completed'] = True
                            completion_mutant = won_item['specimen']  # Мутант, который завершил генератор

                    return won_item, completion_mutant

            return None, None

    def run_simulation(self, use_type):
        """Запускает симуляцию прокруток"""
        gacha_id = self.get_current_gacha_id()
        if not gacha_id:
            messagebox.showerror("Ошибка", "Сначала выберите генератор!")
            return

        if gacha_id not in self.gacha_data:
            messagebox.showerror("Ошибка", "Выбранный генератор не найден!")
            return

        gacha = self.gacha_data[gacha_id]
        ru_name = gacha_names_ru.get(gacha_id, gacha_id)

        # Определяем количество и стоимость прокруток
        if use_type == 'token':
            resource_amount = self.token_amount.get()
            cost_per_spin = gacha['token_cost']
            resource_name = "жетонов"
        else:
            resource_amount = self.hc_amount.get()
            cost_per_spin = gacha['hc_cost']
            resource_name = "золота"

        if resource_amount <= 0:
            messagebox.showerror("Ошибка", f"Количество {resource_name} должно быть больше 0!")
            return

        # Проверяем, хватит ли ресурсов хотя бы на один спин
        if resource_amount < cost_per_spin:
            messagebox.showerror("Ошибка",
                                 f"Недостаточно {resource_name}! Нужно минимум {cost_per_spin} {resource_name}.")
            return

        # Блокируем кнопки
        self.spin_token_btn.configure(state='disabled')
        self.spin_hc_btn.configure(state='disabled')
        self.root.update()

        try:
            # Рассчитываем максимальное количество прокрутов
            max_spins = resource_amount // cost_per_spin

            results_text = f"🚀 ЗАПУСК СИМУЛЯЦИИ: {ru_name}\n"
            results_text += f"Ресурс: {resource_amount} {resource_name}\n"
            results_text += f"Стоимость прокрута: {cost_per_spin} {resource_name}\n"
            results_text += f"Максимум прокрутов: {max_spins}\n"
            results_text += "=" * 60 + "\n\n"

            self.update_results_display(results_text)

            # Статистика для этой сессии
            session_stats = {
                'mutants_won': defaultdict(int),
                'resources_used': 0,
                'spins_done': 0,
                'completion_achieved': False,
                'completion_mutant': None
            }

            # Выполняем прокруты
            remaining_resource = resource_amount
            spins_done = 0

            while remaining_resource >= cost_per_spin:
                # Тратим ресурсы
                remaining_resource -= cost_per_spin
                spins_done += 1

                if use_type == 'token':
                    self.total_tokens_spent += cost_per_spin
                else:
                    self.total_hc_spent += cost_per_spin

                self.total_spins += 1
                session_stats['resources_used'] += cost_per_spin
                session_stats['spins_done'] += 1

                # Крутим генератор
                won_item, completion_mutant = self.spin_gacha(gacha_id, use_type)

                if won_item:
                    specimen_id = won_item['specimen']
                    mutant_name = self.mutant_names.get(specimen_id, specimen_id)
                    star_text = f" ({star_names[won_item['stars']]})" if won_item['stars'] > 0 else ""

                    # Записываем выигрыш
                    full_name = f"{mutant_name}{star_text}"
                    self.mutant_counts[full_name] += 1
                    session_stats['mutants_won'][full_name] += 1

                    self.win_history.append({
                        'gacha': ru_name,
                        'mutant': full_name,
                        'cost_type': use_type,
                        'cost_amount': cost_per_spin
                    })

                    # Если это завершение генератора, записываем это
                    if completion_mutant:
                        session_stats['completion_achieved'] = True
                        if completion_mutant != "all_unlocked":
                            completion_mutant_name = self.mutant_names.get(completion_mutant, completion_mutant)
                            session_stats['completion_mutant'] = completion_mutant_name

                            # Добавляем в историю завершений
                            self.completion_history.append({
                                'gacha': ru_name,
                                'mutant': completion_mutant_name,
                                'cost_type': use_type
                            })

                # Обновляем прогресс каждые 10 прокрутов
                if spins_done % 10 == 0:
                    progress = f"Прокручено: {spins_done}/{max_spins} | Осталось {resource_name}: {remaining_resource}"
                    self.update_results_display("", progress)
                    self.root.update()

            # Финальное обновление
            self.update_results_display("", "")

            # Добавляем итоги сессии
            results_text = f"\n✅ СИМУЛЯЦИЯ ЗАВЕРШЕНА!\n"
            results_text += f"Выполнено прокрутов: {spins_done}\n"
            results_text += f"Потрачено {resource_name}: {session_stats['resources_used']}\n"
            results_text += f"Осталось {resource_name}: {remaining_resource}\n\n"

            # Если был завершен генератор, показываем это
            if session_stats['completion_achieved']:
                if session_stats['completion_mutant']:
                    results_text += f"🎉 ГЕНЕРАТОР ЗАВЕРШЕН! Последний мутант: {session_stats['completion_mutant']}\n\n"
                else:
                    results_text += f"🎉 ГЕНЕРАТОР ЗАВЕРШЕН! (все мутанты уже были разблокированы)\n\n"

            results_text += "🎁 ВЫИГРАННЫЕ МУТАНТЫ:\n"
            results_text += "-" * 40 + "\n"

            if session_stats['mutants_won']:
                for mutant, count in sorted(session_stats['mutants_won'].items(),
                                            key=lambda x: x[1], reverse=True):
                    results_text += f"{mutant}: {count} раз\n"
            else:
                results_text += "Не было выигрышей\n"

            self.results_text.insert(tk.END, results_text)
            self.results_text.see(tk.END)

            # Обновляем статистику и информацию о генераторе
            self.update_stats_display()
            self.update_info_display()

        finally:
            # Разблокируем кнопки
            self.spin_token_btn.configure(state='normal')
            self.spin_hc_btn.configure(state='normal')

    def update_results_display(self, initial_text, progress_text=""):
        """Обновляет отображение результатов"""
        self.results_text.configure(state='normal')

        if initial_text:
            self.results_text.delete(1.0, tk.END)
            self.results_text.insert(tk.END, initial_text)

        if progress_text:
            # Сохраняем позицию прокрутки
            scroll_position = self.results_text.yview()

            # Удаляем старый прогресс (если есть)
            content = self.results_text.get(1.0, tk.END)
            if "Прокручено:" in content:
                lines = content.split('\n')
                new_lines = []
                for line in lines:
                    if not line.startswith("Прокручено:"):
                        new_lines.append(line)
                self.results_text.delete(1.0, tk.END)
                self.results_text.insert(tk.END, '\n'.join(new_lines))

            # Добавляем новый прогресс
            self.results_text.insert(tk.END, progress_text + "\n")

            # Восстанавливаем позицию прокрутки
            self.results_text.yview_moveto(scroll_position[0])

        self.results_text.configure(state='disabled')

    def update_stats_display(self):
        """Обновляет отображение статистики"""
        self.stats_text.configure(state='normal')
        self.stats_text.delete(1.0, tk.END)

        stats_text = "📊 ОБЩАЯ СТАТИСТИКА\n"
        stats_text += "=" * 50 + "\n\n"
        stats_text += f"Всего прокрутов: {self.total_spins}\n"
        stats_text += f"Потрачено жетонов: {self.total_tokens_spent}\n"
        stats_text += f"Потрачено золота: {self.total_hc_spent}\n\n"

        stats_text += "🎯 СТАТИСТИКА ПО МУТАНТАМ:\n"
        stats_text += "-" * 40 + "\n"

        if self.mutant_counts:
            sorted_mutants = sorted(self.mutant_counts.items(), key=lambda x: x[1], reverse=True)
            for mutant, count in sorted_mutants:
                stats_text += f"{mutant}: {count} раз\n"
        else:
            stats_text += "Пока нет выигранных мутантов\n"

        stats_text += "\n🏆 ЗАВЕРШЕННЫЕ ГЕНЕРАТОРЫ:\n"
        stats_text += "-" * 40 + "\n"

        if self.completion_history:
            for completion in self.completion_history:
                cost_text = "жетонов" if completion['cost_type'] == 'token' else "золота"
                stats_text += f"{completion['gacha']}: завершен мутантом {completion['mutant']} (за {cost_text})\n"
        else:
            stats_text += "Пока нет завершенных генераторов\n"

        stats_text += "\n🔄 ИСТОРИЯ ПОСЛЕДНИХ ВЫИГРЫШЕЙ:\n"
        stats_text += "-" * 40 + "\n"

        # Показываем последние 20 выигрышей
        recent_wins = self.win_history[-20:] if len(self.win_history) > 20 else self.win_history
        for win in reversed(recent_wins):
            cost_text = "жетонов" if win['cost_type'] == 'token' else "золота"
            stats_text += f"{win['gacha']}: {win['mutant']} (за {win['cost_amount']} {cost_text})\n"

        self.stats_text.insert(tk.END, stats_text)
        self.stats_text.configure(state='disabled')

    def clear_history(self):
        """Очищает всю историю и статистику"""
        self.total_spins = 0
        self.total_tokens_spent = 0
        self.total_hc_spent = 0
        self.win_history = []
        self.mutant_counts = defaultdict(int)
        self.resource_stats = defaultdict(lambda: defaultdict(int))
        self.completion_history = []

        # Сбрасываем статус завершения для всех генераторов
        for gacha_id in self.gacha_data.keys():
            self.completion_status[gacha_id] = {
                'completed': False,
                'unlocked_specimens': set()
            }

        # Очищаем текстовые поля
        self.results_text.configure(state='normal')
        self.results_text.delete(1.0, tk.END)
        self.results_text.configure(state='disabled')

        self.stats_text.configure(state='normal')
        self.stats_text.delete(1.0, tk.END)
        self.stats_text.configure(state='disabled')

        self.update_info_display()
        self.update_stats_display()


# Запуск приложения
if __name__ == "__main__":
    root = tk.Tk()
    app = GachaSimulator(root)
    root.mainloop()