import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import random
from collections import defaultdict

# Данные из XML
machine_data = '''
<Machine id="cash" cost="20" costToken="0">
<MachineReward rewardId="1" amount="1" odds="1" type="entity" id="" picture="thumbnails/jackpot.png" isBigwin="true" isSuperJackpot="true"/>
<MachineReward rewardId="2" amount="30" odds="42000" type="hardcurrency" picture="thumbnails/jackpot_gold_x30.png"/>
<MachineReward rewardId="3" amount="40" odds="22000" type="hardcurrency" picture="thumbnails/jackpot_gold_x40.png"/>
<MachineReward rewardId="4" amount="50" odds="10400" type="hardcurrency" picture="thumbnails/jackpot_gold_x50.png"/>
<MachineReward rewardId="5" amount="80" odds="3900" type="hardcurrency" picture="thumbnails/jackpot_gold_x80.png"/>
<MachineReward rewardId="6" amount="100" odds="1300" type="hardcurrency" picture="thumbnails/jackpot_gold_x100.png"/>
<MachineReward rewardId="7" amount="200" odds="500" type="hardcurrency" picture="thumbnails/jackpot_gold_x200.png"/>
<MachineReward rewardId="8" amount="500" odds="170" type="hardcurrency" picture="thumbnails/jackpot_gold_x500.png"/>
<MachineReward rewardId="9" amount="1000" odds="75" type="hardcurrency" picture="thumbnails/jackpot_gold_x1000.png"/>
<MachineReward rewardId="10" amount="2000" odds="40" type="hardcurrency" picture="thumbnails/jackpot_gold_x2000.png"/>
<MachineReward rewardId="11" amount="5000" odds="10" type="hardcurrency" picture="thumbnails/jackpot_gold_x5000.png"/>
<MachineReward rewardId="12" amount="50000" odds="270000" type="softcurrency" picture="thumbnails/sc10000.png"/>
</Machine>
'''


# Парсим данные
def parse_machine_data(xml_data):
    rewards = []
    lines = xml_data.strip().split('\n')

    for line in lines:
        if '<MachineReward' in line:
            # Извлекаем атрибуты
            attrs = {}
            parts = line.split('"')
            for i in range(0, len(parts) - 1, 2):
                if parts[i].endswith('='):
                    key = parts[i].strip().replace('=', '').replace('<', '').replace('MachineReward', '').strip()
                    value = parts[i + 1].strip()
                    attrs[key] = value

            # Создаем словарь награды
            reward = {
                'rewardId': attrs.get('rewardId', ''),
                'amount': attrs.get('amount', ''),
                'odds': attrs.get('odds', ''),
                'type': attrs.get('type', ''),
                'id': attrs.get('id', ''),
                'picture': attrs.get('picture', ''),
                'isBigwin': attrs.get('isBigwin', 'false'),
                'isSuperJackpot': attrs.get('isSuperJackpot', 'false')
            }

            # Добавляем русское название
            if reward['type'] == 'entity' and 'jackpot' in reward['picture']:
                reward['name'] = 'Джекпот'
            elif reward['type'] == 'hardcurrency':
                reward['name'] = f"{reward['amount']} золота"
            elif reward['type'] == 'softcurrency':
                reward['name'] = f"{reward['amount']} серебра"
            else:
                reward['name'] = 'Неизвестная награда'

            rewards.append(reward)

    return rewards


rewards = parse_machine_data(machine_data)


class CashMachineSimulator:
    def __init__(self, root):
        self.root = root
        self.root.title("🎰 СИМУЛЯТОР CASH MACHINE")
        self.root.geometry("1000x700")
        self.root.configure(bg='#2c3e50')

        # Стили
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.configure_styles()

        # Данные
        self.rewards = rewards
        self.valid_rewards = [r for r in self.rewards if int(r['odds']) > 0]
        self.total_weight = sum(int(reward['odds']) for reward in self.valid_rewards)
        self.cost_per_spin = 20  # Стоимость одного прокрута в золоте

        # Статистика
        self.total_spins = 0
        self.total_gold_spent = 0
        self.win_counts = {reward['rewardId']: 0 for reward in self.rewards}
        self.results_history = []
        self.resource_totals = defaultdict(int)
        self.reward_counts = defaultdict(int)  # Количество выпадений каждой награды

        # Создаем интерфейс
        self.create_widgets()

    def configure_styles(self):
        self.style.configure('TFrame', background='#2c3e50')
        self.style.configure('TLabel', background='#2c3e50', foreground='white', font=('Arial', 10))
        self.style.configure('TButton', background='#3498db', foreground='white', font=('Arial', 10, 'bold'))
        self.style.configure('TEntry', fieldbackground='#ecf0f1', font=('Arial', 10))
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
        header = ttk.Label(main_frame, text="🎰 СИМУЛЯТОР CASH MACHINE",
                           style='Header.TLabel')
        header.pack(pady=(0, 15))

        # Информация о стоимости
        info_label = ttk.Label(main_frame, text=f"Стоимость одного прокрута: {self.cost_per_spin} золота",
                               style='Big.TLabel')
        info_label.pack(pady=(0, 10))

        # Фрейм управления
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill='x', pady=10)

        ttk.Label(control_frame, text="Количество золота для симуляции:", style='Big.TLabel').pack(side=tk.LEFT, padx=5)

        self.gold_amount = tk.IntVar(value=1000)
        gold_entry = ttk.Entry(control_frame, textvariable=self.gold_amount, width=15)
        gold_entry.pack(side=tk.LEFT, padx=5)

        self.simulate_btn = ttk.Button(control_frame, text="🎲 ЗАПУСТИТЬ СИМУЛЯЦИЮ",
                                       command=self.run_simulation)
        self.simulate_btn.pack(side=tk.LEFT, padx=10)

        self.clear_btn = ttk.Button(control_frame, text="🗑️ ОЧИСТИТЬ ВСЁ",
                                    command=self.clear_history)
        self.clear_btn.pack(side=tk.LEFT, padx=5)

        # Фрейм с вкладками
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill='both', expand=True, pady=10)

        # Вкладка результатов
        results_frame = ttk.Frame(notebook)
        notebook.add(results_frame, text="📊 РЕЗУЛЬТАТЫ")

        self.results_text = scrolledtext.ScrolledText(results_frame, height=15, width=80,
                                                      font=('Consolas', 10))
        self.results_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Вкладка шансов
        odds_frame = ttk.Frame(notebook)
        notebook.add(odds_frame, text="🎯 ШАНСЫ")

        self.odds_text = scrolledtext.ScrolledText(odds_frame, height=15, width=80,
                                                   font=('Consolas', 10))
        self.odds_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Заполняем вкладку шансов
        self.display_odds()

    def display_odds(self):
        """Показывает теоретические шансы выпадения"""
        text = "🎯 ТЕОРЕТИЧЕСКИЕ ШАНСЫ ВЫПАДЕНИЯ:\n"
        text += "=" * 60 + "\n\n"

        # Сортируем награды по шансам (от большего к меньшему)
        sorted_rewards = sorted(self.valid_rewards, key=lambda x: int(x['odds']), reverse=True)

        for reward in sorted_rewards:
            chance = (int(reward['odds']) / self.total_weight) * 100
            text += f"{reward['name']}: {chance:.6f}%\n"

        text += f"\nСуммарный вес: {self.total_weight:,}\n".replace(",", " ")
        text += f"Стоимость прокрута: {self.cost_per_spin} золота\n"

        self.odds_text.insert(tk.END, text)
        self.odds_text.configure(state='disabled')

    def spin(self):
        """Один прокрут машины"""
        r = random.randint(1, self.total_weight)
        current_weight = 0

        for reward in self.valid_rewards:
            current_weight += int(reward['odds'])
            if current_weight >= r:
                return reward
        return None

    def run_simulation(self):
        """Запуск симуляции"""
        gold_to_spend = self.gold_amount.get()
        if gold_to_spend <= 0:
            messagebox.showerror("Ошибка", "Количество золота должно быть больше 0!")
            return

        # Рассчитываем количество прокрутов
        max_spins = gold_to_spend // self.cost_per_spin
        if max_spins <= 0:
            messagebox.showerror("Ошибка", f"Недостаточно золота! Нужно минимум {self.cost_per_spin} золота.")
            return

        # Сбрасываем кнопку
        self.simulate_btn.configure(state='disabled')
        self.root.update()

        try:
            # Сбрасываем статистику
            self.total_spins = 0
            self.total_gold_spent = 0
            self.win_counts = {reward['rewardId']: 0 for reward in self.rewards}
            self.results_history = []
            self.resource_totals = defaultdict(int)
            self.reward_counts = defaultdict(int)

            results_text = f"🚀 ЗАПУСК СИМУЛЯЦИИ НА {gold_to_spend} ЗОЛОТА\n"
            results_text += f"Максимальное количество прокрутов: {max_spins}\n"
            results_text += "=" * 60 + "\n\n"
            self.update_results_display(results_text)

            # Симуляция
            spins_done = 0
            gold_remaining = gold_to_spend

            while gold_remaining >= self.cost_per_spin:
                # Тратим золото
                gold_remaining -= self.cost_per_spin
                self.total_gold_spent += self.cost_per_spin
                spins_done += 1
                self.total_spins += 1

                # Крутим машину
                won_reward = self.spin()

                # Записываем выигрыш
                self.win_counts[won_reward['rewardId']] += 1
                amount = int(won_reward['amount'])

                # Суммируем ресурсы и количество выпадений
                reward_name = won_reward['name']
                self.resource_totals[reward_name] += amount  # Здесь должно добавляться 50 каждый раз
                self.reward_counts[reward_name] += 1

                # Обновляем прогресс каждые 50 прокрутов
                if self.total_spins % 50 == 0:
                    self.update_results_display("")
                    self.root.update()

            # Финальное обновление
            self.update_results_display("")

            # Добавляем итоговую статистику
            results_text = f"\n✅ СИМУЛЯЦИЯ ЗАВЕРШЕНА!\n"
            results_text += f"Всего прокрутов: {self.total_spins}\n"
            results_text += f"Потрачено золота: {self.total_gold_spent}\n"
            results_text += f"Осталось золота: {gold_remaining}\n\n"

            # Считаем общую стоимость выигранных наград
            total_gold_won = 0
            total_silver_won = 0

            for reward_name, amount in self.resource_totals.items():
                if 'золота' in reward_name:
                    total_gold_won += amount
                elif 'серебра' in reward_name:
                    total_silver_won += amount

            results_text += f"Выиграно золота: {total_gold_won}\n"
            results_text += f"Выиграно серебра: {total_silver_won}\n"
            results_text += f"Чистая прибыль/убыток по золоту: {total_gold_won - self.total_gold_spent}\n"

            # Добавляем статистику по выпадениям
            results_text += f"\n📊 СТАТИСТИКА ВЫПАДЕНИЙ:\n"
            results_text += "-" * 40 + "\n"

            for reward_name, count in sorted(self.reward_counts.items(), key=lambda x: x[1], reverse=True):
                total_amount = self.resource_totals[reward_name]
                results_text += f"{reward_name} (x{count}) - всего: {total_amount}\n"

            self.results_text.insert(tk.END, results_text)
            self.results_text.see(tk.END)

        finally:
            self.simulate_btn.configure(state='normal')

    def update_results_display(self, initial_text):
        """Обновляет отображение результатов"""
        self.results_text.configure(state='normal')

        if initial_text:
            self.results_text.delete(1.0, tk.END)
            self.results_text.insert(tk.END, initial_text)
            self.initial_results_text = initial_text
        else:
            # Сохраняем текущую позицию прокрутки
            scroll_position = self.results_text.yview()
            self.results_text.delete(1.0, tk.END)

            # Вставляем начальный текст если есть
            if hasattr(self, 'initial_results_text') and self.initial_results_text:
                self.results_text.insert(tk.END, self.initial_results_text)

        # Показываем суммарные результаты по категориям
        results_text = "\n🎯 РЕЗУЛЬТАТЫ СИМУЛЯЦИИ:\n"
        results_text += "=" * 40 + "\n"

        # Группируем по типам наград
        gold_rewards = {}
        silver_rewards = {}
        other_rewards = {}

        for reward_name, count in self.reward_counts.items():
            total_amount = self.resource_totals[reward_name]
            if 'золота' in reward_name:
                gold_rewards[reward_name] = (count, total_amount)
            elif 'серебра' in reward_name:
                silver_rewards[reward_name] = (count, total_amount)
            else:
                other_rewards[reward_name] = (count, total_amount)

        # Выводим золото
        if gold_rewards:
            results_text += "\n🥇 ЗОЛОТО:\n"
            for reward_name, (count, total_amount) in sorted(gold_rewards.items()):
                results_text += f"  {reward_name} (x{count}) - всего: {total_amount}\n"

        # Выводим серебро
        if silver_rewards:
            results_text += "\n🥈 СЕРЕБРО:\n"
            for reward_name, (count, total_amount) in sorted(silver_rewards.items()):
                results_text += f"  {reward_name} (x{count}) - всего: {total_amount}\n"

        # Выводим остальное
        if other_rewards:
            results_text += "\n🎁 ДРУГОЕ:\n"
            for reward_name, (count, total_amount) in sorted(other_rewards.items()):
                results_text += f"  {reward_name} (x{count}) - всего: {total_amount}\n"

        self.results_text.insert(tk.END, results_text)

        # Показываем прогресс с суммарной статистикой
        total_gold_won = 0
        total_silver_won = 0

        for reward_name, amount in self.resource_totals.items():
            if 'золота' in reward_name:
                total_gold_won += amount
            elif 'серебра' in reward_name:
                total_silver_won += amount

        progress = f"\n📊 ПРОГРЕСС: {self.total_spins} прокрутов"
        progress += f" | 💰 Потрачено: {self.total_gold_spent} золота"
        progress += f" | 🥇 Выиграно золота: {total_gold_won}"
        progress += f" | 🥈 Выиграно серебра: {total_silver_won}"
        self.results_text.insert(tk.END, progress + "\n")

        self.results_text.configure(state='disabled')
        self.results_text.see(tk.END)

    def clear_history(self):
        """Очищает всю историю"""
        self.results_text.configure(state='normal')
        self.results_text.delete(1.0, tk.END)
        self.results_text.configure(state='disabled')

        self.odds_text.configure(state='normal')
        self.odds_text.delete(1.0, tk.END)
        self.odds_text.configure(state='disabled')
        self.display_odds()  # Перезаполняем шансы

        self.results_history = []
        self.resource_totals = defaultdict(int)
        self.reward_counts = defaultdict(int)


# Запуск приложения
if __name__ == "__main__":
    root = tk.Tk()
    app = CashMachineSimulator(root)
    root.mainloop()