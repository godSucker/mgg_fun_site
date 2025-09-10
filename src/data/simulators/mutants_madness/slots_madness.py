#!/usr/bin/env python3
# 🎰 Симулятор рулетки Mutants Wheel

import json, random, math
from collections import defaultdict, Counter
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
from xml.etree import ElementTree as ET

# Таблица открытия исследований по уровню
research_level_map = {
    1: 1,
    2: 10,
    3: 25,
    4: 35,
    5: 50,
    6: 100,
    7: 150,
    8: 175,
    9: 200,
    10: 200
}

# ======== Парсинг данных ========
def load_names(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def parse_rewards(xml_path, names):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    rewards = []

    for reward in root.findall("MachineReward"):
        r = {
            'rewardId': reward.get('rewardId') or "",
            'amount': int(reward.get('amount') or "1"),
            'odds': int(reward.get('odds') or "0"),
            'type': reward.get('type') or "",
            'id': reward.get('id') or "",
            'picture': reward.get('picture') or "",
            'name': "",
            'description': "",
        }

        # Теги
        for tag in reward.findall("Tag"):
            key = tag.get("key")
            val = tag.get("value")
            if key:
                r[key] = val

        # Research по Filter
        r['research'] = None
        f = reward.find("Filter")
        if f is not None and f.text:
            digits = ''.join([c for c in f.text if c.isdigit()])
            if digits:
                r['research'] = int(digits)

        # Звёзды
        stars = r.get('stars')
        if stars:
            stars_map = {'1':'Бронзовая','2':'Серебряная','3':'Золотая','4':'Платиновая'}
            r['stars'] = stars_map.get(str(stars), stars)

        # Имя
        if r['id'] in names:
            r['name'] = names[r['id']]
        else:
            r['name'] = r['id'].replace("_", " ").title() if r['id'] else "Unnamed"

        rewards.append(r)

    # Ручное назначение research и имён
    for r in rewards:
        name = r['name']
        # Мутанты → research 1
        if name in [
            "Темновзор", "Капитан Гаечный Ключ", "Механорог", "Либраро", "Виргон",
            "Страхолюдочка", "Капитан Костьмилягу", "Канцерния", "Каприка",
            "Перехватчица", "Буши", "Бак Морис", "Стрелотавр", "Джеминиум",
            "Тор", "Леогарт", "Космо-Конг", "Долгоног", "Принц-скорпион",
            "Гор", "Капитан Мир", "Костеглод", "Черноличник", "Арахно",
            "Зомбат", "Мастер Коготь", "Сатир-шаман", "Сирения", "Громозека",
            "Черепозавр", "Сверхновус", "Мекали", "Синеглазка", "Ангел Мести", "Голиаф"
        ]:
            r['research'] = 1

        # Гигантский Краб → research 8
        if "Гигантский Краб" in name:
            r['research'] = 8

        # Джекпот → имя Джекпот
        if r['id']=="" or r['name']=="???":
            r['name']="Джекпот"
            r['research']=None

    return rewards

# ======== Симулятор ========
class RouletteSimulator:
    def __init__(self, root, rewards, cost=350, cost_token=100):
        self.root = root
        self.root.title("🎰 СИМУЛЯТОР РУЛЕТКИ - MUTANTS")
        self.root.geometry("1200x800")
        self.rewards = rewards
        self.cost = cost
        self.cost_token = cost_token

        self.total_spins = 0
        self.win_counts = {r['rewardId']: 0 for r in self.rewards}
        self.results_history = []
        self.resource_totals = defaultdict(int)

        # UI
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.create_widgets()
        self.update_odds_display()  # начальный расчёт шансов по уровню 1

    def create_widgets(self):
        main = ttk.Frame(self.root, padding=10)
        main.pack(fill='both', expand=True)

        control = ttk.Frame(main)
        control.pack(fill='x', pady=5)

        # Жетоны
        ttk.Label(control, text="Жетоны:").pack(side='left', padx=5)
        self.tokens_input = tk.IntVar(value=0)
        ttk.Entry(control, textvariable=self.tokens_input, width=10).pack(side='left', padx=5)

        # Золото
        ttk.Label(control, text="Золото:").pack(side='left', padx=5)
        self.gold_input = tk.IntVar(value=0)
        ttk.Entry(control, textvariable=self.gold_input, width=10).pack(side='left', padx=5)

        # Скидка
        ttk.Label(control, text="Скидка %:").pack(side='left', padx=5)
        self.discount_var = tk.IntVar(value=0)
        self.discount_box = ttk.Combobox(control, values=[0,50,55,60,65,70,75,80,85,90], width=5, textvariable=self.discount_var)
        self.discount_box.set(0)
        self.discount_box.pack(side='left', padx=5)

        # Уровень игрока
        ttk.Label(control, text="Уровень игрока:").pack(side='left', padx=5)
        self.player_level_var = tk.IntVar(value=1)
        lvl_spin = ttk.Spinbox(control, from_=1, to=200, textvariable=self.player_level_var, width=5, command=self.update_odds_display)
        lvl_spin.pack(side='left', padx=5)

        # Кнопка запуска
        self.simulate_btn = ttk.Button(control, text="🎲 Запустить симуляцию", command=self.run_simulation)
        self.simulate_btn.pack(side='left', padx=10)

        # Вкладки
        notebook = ttk.Notebook(main)
        notebook.pack(fill='both', expand=True, pady=10)

        # Результаты
        res_frame = ttk.Frame(notebook)
        notebook.add(res_frame, text="📊 РЕЗУЛЬТАТЫ")
        self.results_text = scrolledtext.ScrolledText(res_frame, height=30, font=('Consolas',10))
        self.results_text.pack(fill='both', expand=True, padx=5, pady=5)

        # Шансы
        odds_frame = ttk.Frame(notebook)
        notebook.add(odds_frame, text="🎯 ШАНСЫ")
        self.odds_text = scrolledtext.ScrolledText(odds_frame, height=30, font=('Consolas',10))
        self.odds_text.pack(fill='both', expand=True, padx=5, pady=5)

    # ======== Шансы по уровню ========
    def update_odds_display(self):
        player_level = self.player_level_var.get()
        self.odds_text.configure(state='normal')
        self.odds_text.delete(1.0, tk.END)

        available_rewards = []
        for r in self.rewards:
            if r['name']=="Джекпот" or r.get('research') is None:
                available_rewards.append(r)
                continue
            if r.get('research') <= self.get_max_research(player_level):
                available_rewards.append(r)

        total_weight = sum(r['odds'] for r in available_rewards if r['odds']>0)
        text = "🎯 Шансы по уровню игрока\n" + "="*80 + "\n"

        # Группировка по research
        groups = defaultdict(list)
        for r in available_rewards:
            if r.get('research') is not None:
                groups[r['research']].append(r)

        for key in sorted(groups.keys()):
            items = groups[key]
            group_sum = sum(r['odds'] for r in items)
            pct = (group_sum/total_weight*100) if total_weight else 0
            text += f"Исследование - {key}: {group_sum} ({pct:.6f}%)\n"
            for it in sorted(items, key=lambda x:int(x['odds']), reverse=True):
                chance = (it['odds']/total_weight*100) if total_weight else 0
                display_name = f"{it['name']} ({it.get('stars','')})" if it.get('stars') else it['name']
                text += f"  {display_name}: {chance:.6f}%\n"
            text += "-"*60+"\n"

        # Джекпот
        jackpot = [r for r in available_rewards if r['name']=="Джекпот"]
        if jackpot:
            text += "\n💎 Джекпот:\n"
            for r in jackpot:
                chance = (r['odds']/total_weight*100) if total_weight else 0
                text += f"  {r['name']}: {chance:.6f}%\n"
            text += "-"*60+"\n"

        # Спецнаграды без research
        special = [r for r in available_rewards if r.get('research') is None and r['name']!="Джекпот"]
        if special:
            text += "\n🎰 Специальные награды:\n"
            for r in special:
                chance = (r['odds']/total_weight*100) if total_weight else 0
                display_name = f"{r['name']} ({r.get('stars','')})" if r.get('stars') else r['name']
                text += f"  {display_name}: {chance:.6f}%\n"
            text += "-"*60+"\n"

        self.odds_text.insert('1.0', text)
        self.odds_text.configure(state='disabled')

    def get_max_research(self, player_level):
        max_rsch = 0
        for rsch, lvl in research_level_map.items():
            if player_level >= lvl:
                max_rsch = rsch
        return max_rsch

    # ======== Прокрутка ========
    def spin_once(self, rewards_list):
        total_weight = sum(int(r.get('odds',0)) for r in rewards_list)
        r = random.randint(1, total_weight)
        cur = 0
        for reward in rewards_list:
            cur += int(reward.get('odds',0))
            if cur>=r:
                return reward
        return None

    def run_simulation(self):
        tokens_available = self.tokens_input.get()
        gold_available = self.gold_input.get()
        player_level = self.player_level_var.get()
        disc = self.discount_var.get()
        multiplier = (100-disc)/100

        cost_per_spin_token = math.ceil(self.cost_token*multiplier)
        cost_per_spin_gold = math.ceil(self.cost*multiplier)

        num_token_spins = tokens_available//cost_per_spin_token
        num_gold_spins = gold_available//cost_per_spin_gold

        remaining_tokens = tokens_available - num_token_spins*cost_per_spin_token
        remaining_gold = gold_available - num_gold_spins*cost_per_spin_gold

        total_tokens_spent = num_token_spins*cost_per_spin_token
        total_gold_spent = num_gold_spins*cost_per_spin_gold

        self.total_spins=0
        self.win_counts={r['rewardId']:0 for r in self.rewards}
        self.results_history=[]
        self.resource_totals=defaultdict(int)

        # фильтруем по уровню
        available_rewards=[]
        for r in self.rewards:
            if r['name']=="Джекпот" or r.get('research') is None:
                available_rewards.append(r)
                continue
            if r.get('research') <= self.get_max_research(player_level):
                available_rewards.append(r)

        if not available_rewards:
            messagebox.showwarning("Ошибка","Нет доступных наград для вашего уровня!")
            return

        # Жетоны
        for _ in range(num_token_spins):
            self.total_spins+=1
            reward = self.spin_once(available_rewards)
            if reward:
                self.win_counts[reward['rewardId']]+=1
                self.resource_totals[(reward.get('research'),reward['name'],reward.get('stars',''))]+=reward['amount']
                self.results_history.append((reward.get('research'),reward['name'],reward.get('stars',''),reward['amount'],'жетоны'))

        # Золото
        for _ in range(num_gold_spins):
            self.total_spins+=1
            reward = self.spin_once(available_rewards)
            if reward:
                self.win_counts[reward['rewardId']]+=1
                self.resource_totals[(reward.get('research'),reward['name'],reward.get('stars',''))]+=reward['amount']
                self.results_history.append((reward.get('research'),reward['name'],reward.get('stars',''),reward['amount'],'золото'))

        self.update_results_display(total_gold_spent,total_tokens_spent,remaining_gold,remaining_tokens)

    def update_results_display(self,gold,tokens,remaining_gold,remaining_tokens):
        self.results_text.configure(state='normal')
        self.results_text.delete(1.0, tk.END)

        text_by_research=defaultdict(list)
        for rsch,name,stars,amount,res_type in self.results_history:
            stars_str=f" ({stars})" if stars else ""
            text_by_research[rsch].append((name,stars_str,amount,res_type))

        for rsch in sorted(text_by_research.keys(), key=lambda x:str(x)):
            self.results_text.insert(tk.END,f"Исследование {rsch}:\n")
            counts=Counter()
            for name,stars_str,amount,res_type in text_by_research[rsch]:
                key=f"{name}{stars_str} [{res_type}]"
                counts[key]+=amount
            for reward_name,cnt in sorted(counts.items()):
                self.results_text.insert(tk.END,f"  {cnt} x {reward_name}\n")
            self.results_text.insert(tk.END,"-"*50+"\n")

        self.results_text.insert(tk.END,f"\n✅ Симуляция завершена. Прокрутов: {self.total_spins}\n")
        self.results_text.insert(tk.END,f"💰 Потрачено золото: {gold}, Жетоны: {tokens}\n")
        self.results_text.insert(tk.END,f"🔹 Остаток золота: {remaining_gold}, жетонов: {remaining_tokens}\n")
        self.results_text.configure(state='disabled')

# ======== Запуск ========
if __name__=="__main__":
    xml_path="machine_mutants.xml"
    names_path="mutant_names (2).json"
    names=load_names(names_path)
    rewards=parse_rewards(xml_path,names)

    root=tk.Tk()
    app=RouletteSimulator(root,rewards,cost=350,cost_token=100)
    root.mainloop()
