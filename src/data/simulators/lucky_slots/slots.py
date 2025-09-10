import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import random
from collections import defaultdict

rewards = [
    {
        'rewardId': '1',
        'amount': '1',
        'odds': '3',
        'type': 'entity',
        'id': '',
        'picture': 'thumbnails/jackpot.png',
        'isBigwin': 'true',
        'isSuperJackpot': 'true',
        'isFreeTry': None,
        'name': 'Джекпот',
        'description': 'Главный приз'
    },
    {
        'rewardId': '2',
        'amount': '1',
        'odds': '100000',
        'type': 'entity',
        'id': '',
        'picture': 'thumbnails/freespin.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': 'true',
        'name': 'Бесплатный прокрут',
        'description': 'Возможность крутить рулетку еще раз без оплаты'
    },
    {
        'rewardId': '3',
        'amount': '1',
        'odds': '32500',
        'type': 'entity',
        'id': 'Star_Bronze',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бронзовая звезда',
        'description': 'Валюта для улучшений'
    },
    {
        'rewardId': '4',
        'amount': '1',
        'odds': '5200',
        'type': 'entity',
        'id': 'Star_Silver',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Серебряная звезда',
        'description': 'Редкая валюта для улучшений'
    },
    {
        'rewardId': '5',
        'amount': '1',
        'odds': '2600',
        'type': 'entity',
        'id': 'Star_Gold',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Золотая звезда',
        'description': 'Очень редкая валюта для улучшений'
    },
    {
        'rewardId': '6',
        'amount': '1',
        'odds': '16250',
        'type': 'entity',
        'id': 'Material_Energy25',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '25 пропусков',
        'description': 'Энергия для прохождения уровней'
    },
    {
        'rewardId': '7',
        'amount': '15',
        'odds': '28900',
        'type': 'entity',
        'id': 'Material_LP100',
        'picture': 'thumbnails/material_lp100_x15.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Аптечка',
        'description': '15 аптечек для лечения мутантов'
    },
    {
        'rewardId': '8',
        'amount': '10',
        'odds': '4330',
        'type': 'entity',
        'id': 'Material_LP1000',
        'picture': 'thumbnails/material_lp1000_x10.png',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Большая аптечка',
        'description': '10 больших аптечек'
    },
    {
        'rewardId': '9',
        'amount': '2',
        'odds': '13000',
        'type': 'entity',
        'id': 'Material_Muto50',
        'picture': 'thumbnails/material_muto50_x2.png',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Большая доза мутостерона',
        'description': '2 большие дозы для улучшений'
    },
    {
        'rewardId': '10',
        'amount': '5000',
        'odds': '10',
        'type': 'softcurrency',
        'id': '5000sc',
        'picture': 'thumbnails/sc100.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '5000 монет',
        'description': 'Игровая валюта'
    },
    {
        'rewardId': '11',
        'amount': '10000',
        'odds': '110000',
        'type': 'softcurrency',
        'id': '',
        'picture': 'thumbnails/sc500.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '10000 монет',
        'description': 'Игровая валюта'
    },
    {
        'rewardId': '12',
        'amount': '20000',
        'odds': '88000',
        'type': 'softcurrency',
        'id': '',
        'picture': 'thumbnails/sc1000.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '20000 монет',
        'description': 'Игровая валюта'
    },
    {
        'rewardId': '13',
        'amount': '50000',
        'odds': '50000',
        'type': 'softcurrency',
        'id': '',
        'picture': 'thumbnails/sc10000.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '50000 монет',
        'description': 'Игровая валюта'
    },
    {
        'rewardId': '14',
        'amount': '100000',
        'odds': '37154',
        'type': 'softcurrency',
        'id': '',
        'picture': 'thumbnails/sc50000.png',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '100000 монет',
        'description': 'Крупная сумма игровой валюты'
    },
    {
        'rewardId': '15',
        'amount': '500000',
        'odds': '13000',
        'type': 'softcurrency',
        'id': '',
        'picture': 'thumbnails/sc75000.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '500000 монет',
        'description': 'Очень крупная сумма игровой валюты'
    },
    {
        'rewardId': '16',
        'amount': '1000000',
        'odds': '4342',
        'type': 'softcurrency',
        'id': '',
        'picture': 'thumbnails/sc100000.png',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '1000000 монет',
        'description': 'Огромная сумма игровой валюты'
    },
    {
        'rewardId': '17',
        'amount': '5000000',
        'odds': '130',
        'type': 'softcurrency',
        'id': '',
        'picture': 'thumbnails/sc1000000.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '5000000 монет',
        'description': 'Гигантская сумма игровой валюты'
    },
    {
        'rewardId': '18',
        'amount': '1',
        'odds': '6500',
        'type': 'entity',
        'id': 'Material_Gacha_Token',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Жетон генератора',
        'description': 'Для крутки других автоматов'
    },
    {
        'rewardId': '19',
        'amount': '1',
        'odds': '0',
        'type': 'entity',
        'id': 'Daily_Token',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Ежедневный жетон',
        'description': 'Не участвует в розыгрыше (шанс 0%)'
    },
    {
        'rewardId': '20',
        'amount': '10',
        'odds': '91000',
        'type': 'hardcurrency',
        'id': '',
        'picture': 'thumbnails/hc10.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '10 золота',
        'description': 'Премиум валюта'
    },
    {
        'rewardId': '21',
        'amount': '20',
        'odds': '26000',
        'type': 'hardcurrency',
        'id': '',
        'picture': 'thumbnails/hc20.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '20 золота',
        'description': 'Премиум валюта'
    },
    {
        'rewardId': '22',
        'amount': '40',
        'odds': '2600',
        'type': 'hardcurrency',
        'id': '',
        'picture': 'thumbnails/hc40.png',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '40 золота',
        'description': 'Премиум валюта'
    },
    {
        'rewardId': '23',
        'amount': '1',
        'odds': '32500',
        'type': 'entity',
        'id': 'Material_XP250',
        'picture': 'thumbnails/material_xp250.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Баночка опыта',
        'description': 'Опыт для прокачки мутантов'
    },
    {
        'rewardId': '24',
        'amount': '1',
        'odds': '32500',
        'type': 'entity',
        'id': 'Material_XP1000',
        'picture': 'thumbnails/material_xp1000.png',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Банка опыта',
        'description': 'Много опыта для прокачки мутантов'
    },
    {
        'rewardId': '25',
        'amount': '1',
        'odds': '130',
        'type': 'entity',
        'id': 'Charm_Critical_7',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер критов (7 дней)',
        'description': 'Повышение шанса критического удара'
    },
    {
        'rewardId': '26',
        'amount': '1',
        'odds': '130',
        'type': 'entity',
        'id': 'Charm_Anticritical_7',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер щита (7 дней)',
        'description': 'Защита от критических ударов'
    },
    {
        'rewardId': '27',
        'amount': '1',
        'odds': '130',
        'type': 'entity',
        'id': 'Charm_Xpx2_7',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер опыта +100% (7 дней)',
        'description': 'Удвоение получаемого опыта'
    },
    {
        'rewardId': '28',
        'amount': '1',
        'odds': '130',
        'type': 'entity',
        'id': 'Charm_Xpx3_7',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер опыта +200% (7 дней)',
        'description': 'Утроение получаемого опыта'
    },
    {
        'rewardId': '29',
        'amount': '1',
        'odds': '26000',
        'type': 'entity',
        'id': 'Charm_Critical_1',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер критов (1 день)',
        'description': 'Повышение шанса критического удара'
    },
    {
        'rewardId': '30',
        'amount': '1',
        'odds': '26000',
        'type': 'entity',
        'id': 'Charm_Anticritical_1',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер щита (1 день)',
        'description': 'Защита от критических ударов'
    },
    {
        'rewardId': '31',
        'amount': '1',
        'odds': '6500',
        'type': 'entity',
        'id': 'Charm_Xpx2_1',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер опыта +100% (1 день)',
        'description': 'Удвоение получаемого опыта'
    },
    {
        'rewardId': '32',
        'amount': '1',
        'odds': '3900',
        'type': 'entity',
        'id': 'Charm_Xpx3_1',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер опыта +200% (1 день)',
        'description': 'Утроение получаемого опыта'
    },
    {
        'rewardId': '33',
        'amount': '1',
        'odds': '2600',
        'type': 'entity',
        'id': 'Charm_Regenx2_1',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер регенерации +100% (1 день)',
        'description': 'Удвоение скорости восстановления HP'
    },
    {
        'rewardId': '34',
        'amount': '1',
        'odds': '2600',
        'type': 'entity',
        'id': 'Charm_Regenx4_1',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Бустер регенерации +300% (1 день)',
        'description': 'Учетверение скорости восстановления HP'
    },
    {
        'rewardId': '35',
        'amount': '1',
        'odds': '500',
        'type': 'entity',
        'id': 'Specimen_DA_04',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Эскадрилья Носорог',
        'description': 'Мутант'
    },
    {
        'rewardId': '36',
        'amount': '1',
        'odds': '500',
        'type': 'entity',
        'id': 'Specimen_AF_04',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Стремглав',
        'description': 'Мутант'
    },
    {
        'rewardId': '37',
        'amount': '1',
        'odds': '1300',
        'type': 'entity',
        'id': 'Star_Platinum',
        'picture': '',
        'isBigwin': 'true',
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Платиновая звезда',
        'description': 'Очень редкая валюта для улучшений'
    },
    {
        'rewardId': '38',
        'amount': '1000',
        'odds': '200',
        'type': 'hardcurrency',
        'id': '',
        'picture': 'thumbnails/jackpot_gold_x1000.png',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': '1000 золота',
        'description': 'Огромное количество премиум валюты'
    },
    {
        'rewardId': '39',
        'amount': '1',
        'odds': '30',
        'type': 'entity',
        'id': 'Specimen_CA_09',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Биг Босс',
        'description': 'Редкий мутант'
    },
    {
        'rewardId': '40',
        'amount': '1',
        'odds': '30',
        'type': 'entity',
        'id': 'Specimen_AE_11',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Микс0-Лог (Золотой)',
        'description': 'Редкий мутант с золотым скином'
    },
    {
        'rewardId': '41',
        'amount': '1',
        'odds': '100',
        'type': 'entity',
        'id': 'Specimen_BA_06',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Z-0 (Золотой)',
        'description': 'Редкий мутант с золотым скином'
    },
    {
        'rewardId': '42',
        'amount': '1',
        'odds': '100',
        'type': 'entity',
        'id': 'Specimen_DD_07',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Шершеляшар (Золотой)',
        'description': 'Редкий мутант с золотым скином'
    },
    {
        'rewardId': '43',
        'amount': '1',
        'odds': '30',
        'type': 'entity',
        'id': 'Specimen_FA_08',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Футбот (Золотой)',
        'description': 'Редкий мутант с золотым скином'
    },
    {
        'rewardId': '44',
        'amount': '1',
        'odds': '30',
        'type': 'entity',
        'id': 'Specimen_CB_12',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Кранекен (Золотой)',
        'description': 'Редкий мутант с золотым скином'
    },
    {
        'rewardId': '45',
        'amount': '1',
        'odds': '30',
        'type': 'entity',
        'id': 'Specimen_EC_09',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Щиткалибур (Золотой)',
        'description': 'Редкий мутант с золотым скином'
    },
    {
        'rewardId': '46',
        'amount': '1',
        'odds': '30',
        'type': 'entity',
        'id': 'Specimen_DE_08',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Космопанды (Золотой)',
        'description': 'Редкий мутант с золотым скином'
    },
    {
        'rewardId': '47',
        'amount': '1',
        'odds': '30',
        'type': 'entity',
        'id': 'Specimen_DA_10',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Соколиный Глаз (Золотой)',
        'description': 'Редкий мутант с золотым скином'
    },
    {
        'rewardId': '48',
        'amount': '1',
        'odds': '32000',
        'type': 'entity',
        'id': 'orb_basic_xp_01_ephemeral_10',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Сфера опыта I (10 зарядов)',
        'description': 'Временная сфера'
    },
    {
        'rewardId': '49',
        'amount': '1',
        'odds': '16000',
        'type': 'entity',
        'id': 'orb_basic_xp_02_ephemeral_10',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Сфера опыта II (10 зарядов)',
        'description': 'Временная сфера'
    },
    {
        'rewardId': '50',
        'amount': '1',
        'odds': '8000',
        'type': 'entity',
        'id': 'orb_basic_xp_03_ephemeral_10',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Сфера опыта III (10 зарядов)',
        'description': 'Временная сфера'
    },
    {
        'rewardId': '51',
        'amount': '1',
        'odds': '4000',
        'type': 'entity',
        'id': 'orb_basic_xp_04_ephemeral_10',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Сфера опыта IV (10 зарядов)',
        'description': 'Временная сфера'
    },
    {
        'rewardId': '52',
        'amount': '1',
        'odds': '2000',
        'type': 'entity',
        'id': 'orb_basic_xp_05_ephemeral_10',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Сфера опыта V (10 зарядов)',
        'description': 'Временная сфера'
    },
    {
        'rewardId': '53',
        'amount': '1',
        'odds': '2000',
        'type': 'entity',
        'id': 'orb_basic_attack_05_ephemeral_30',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Сфера атаки V (30 зарядов)',
        'description': 'Временная сфера'
    },
    {
        'rewardId': '54',
        'amount': '1',
        'odds': '2000',
        'type': 'entity',
        'id': 'orb_basic_life_05_ephemeral_30',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Сфера HP V (30 зарядов)',
        'description': 'Временная сфера'
    },
    {
        'rewardId': '55',
        'amount': '1',
        'odds': '2000',
        'type': 'entity',
        'id': 'orb_basic_critical_05_ephemeral_30',
        'picture': '',
        'isBigwin': None,
        'isSuperJackpot': None,
        'isFreeTry': None,
        'name': 'Сфера крит. урона V (30 зарядов)',
        'description': 'Временная сфера'
    }
]


class RouletteSimulator:
    def __init__(self, root):
        self.root = root
        self.root.title("🎰 СИМУЛЯТОР РУЛЕТКИ - LUCKY SLOT")
        self.root.geometry("1200x800")
        self.root.configure(bg='#2c3e50')

        # Стили
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.configure_styles()

        # Данные
        self.rewards = rewards
        self.valid_rewards = [r for r in self.rewards if int(r['odds']) > 0]
        self.total_weight = sum(int(reward['odds']) for reward in self.valid_rewards)

        # Статистика
        self.total_spins = 0
        self.free_spins_earned = 0
        self.win_counts = {reward['rewardId']: 0 for reward in self.rewards}
        self.results_history = []
        self.resource_totals = defaultdict(int)

        # Создаем интерфейс
        self.create_widgets()

    def configure_styles(self):
        self.style.configure('TFrame', background='#2c3e50')
        self.style.configure('TLabel', background='#2c3e50', foreground='white', font=('Arial', 10))
        self.style.configure('TButton', background='#3498db', foreground='white', font=('Arial', 10, 'bold'))
        self.style.configure('TEntry', fieldbackground='#ecf0f1', font=('Arial', 10))
        self.style.configure('TSpinbox', fieldbackground='#ecf0f1', font=('Arial', 10))
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
        header = ttk.Label(main_frame, text="🎰 СИМУЛЯТОР РУЛЕТКИ LUCKY WHEEL",
                           style='Header.TLabel')
        header.pack(pady=(0, 15))

        # Фрейм управления
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill='x', pady=10)

        ttk.Label(control_frame, text="Количество прокрутов:", style='Big.TLabel').pack(side=tk.LEFT, padx=5)

        self.spin_count = tk.IntVar(value=100)
        spin_entry = ttk.Spinbox(control_frame, from_=1, to=100000, textvariable=self.spin_count, width=15)
        spin_entry.pack(side=tk.LEFT, padx=5)

        self.simulate_btn = ttk.Button(control_frame, text="🎲 ЗАПУСТИТЬ СИМУЛЯЦИЮ",
                                       command=self.run_simulation, style='Big.TButton')
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

        self.results_text = scrolledtext.ScrolledText(results_frame, height=15, width=90,
                                                      font=('Consolas', 10))
        self.results_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Вкладка статистики
        stats_frame = ttk.Frame(notebook)
        notebook.add(stats_frame, text="📈 СТАТИСТИКА")

        self.stats_text = scrolledtext.ScrolledText(stats_frame, height=20, width=90,
                                                    font=('Consolas', 10))
        self.stats_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Вкладка ресурсов
        resources_frame = ttk.Frame(notebook)
        notebook.add(resources_frame, text="💰 РЕСУРСЫ")

        self.resources_text = scrolledtext.ScrolledText(resources_frame, height=15, width=90,
                                                        font=('Consolas', 10))
        self.resources_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Вкладка шансов
        odds_frame = ttk.Frame(notebook)
        notebook.add(odds_frame, text="🎯 ШАНСЫ")

        self.odds_text = scrolledtext.ScrolledText(odds_frame, height=15, width=90,
                                                   font=('Consolas', 10))
        self.odds_text.pack(fill='both', expand=True, padx=10, pady=10)

        # Заполняем вкладку шансов
        self.display_odds()

    def display_odds(self):
        """Показывает теоретические шансы выпадения"""
        text = "🎯 ТЕОРЕТИЧЕСКИЕ ШАНСЫ ВЫПАДЕНИЯ:\n"
        text += "=" * 80 + "\n\n"

        # Группируем по типам наград
        categories = {
            '💰 ВАЛЮТА': [],
            '⭐ ЗВЕЗДЫ': [],
            '⚗️ МАТЕРИАЛЫ': [],
            '🎯 БУСТЕРЫ': [],
            '🌀 ФРИСПИНЫ': [],
            '🎰 ДЖЕКПОТЫ': [],
            '👾 МУТАНТЫ': [],
            '🔮 СФЕРЫ': []
        }

        for reward in self.valid_rewards:
            name = reward['name'].lower()
            reward_id = reward.get('id', '').lower()

            # ОПРЕДЕЛЕНИЕ МУТАНТОВ по ID и имени!
            is_mutant = ('specimen' in reward_id or
                         'mutant' in reward_id or
                         'носорог' in name or
                         'стремглав' in name or
                         'биг босс' in name or
                         'микс' in name or
                         'z-0' in name or
                         'шершеляшар' in name or
                         'футбот' in name or
                         'кранекен' in name or
                         'щиткалибур' in name or
                         'космопанды' in name or
                         'соколиный' in name)

            if is_mutant:
                categories['👾 МУТАНТЫ'].append(reward)
            elif 'звезд' in name:
                categories['⭐ ЗВЕЗДЫ'].append(reward)
            elif 'монет' in name or ('золот' in name and not is_mutant):
                categories['💰 ВАЛЮТА'].append(reward)
            elif 'аптечк' in name or 'мутостерон' in name or 'пропусков' in name or 'опыт' in name:
                categories['⚗️ МАТЕРИАЛЫ'].append(reward)
            elif 'бустер' in name:
                categories['🎯 БУСТЕРЫ'].append(reward)
            elif 'бесплатн' in name:
                categories['🌀 ФРИСПИНЫ'].append(reward)
            elif 'джекпот' in name:
                categories['🎰 ДЖЕКПОТЫ'].append(reward)
            elif 'сфер' in name:
                categories['🔮 СФЕРЫ'].append(reward)
            else:
                categories['⚗️ МАТЕРИАЛЫ'].append(reward)

        for category, items in categories.items():
            if items:
                text += f"\n{category}:\n"
                text += "-" * 60 + "\n"

                sorted_items = sorted(items, key=lambda x: int(x['odds']), reverse=True)
                for reward in sorted_items:
                    chance = (int(reward['odds']) / self.total_weight) * 100
                    text += f"  {reward['name']}: {chance:.6f}%\n"

        self.odds_text.insert(tk.END, text)
        self.odds_text.configure(state='disabled')

    def spin(self):
        """Один прокрут рулетки"""
        r = random.randint(1, self.total_weight)
        current_weight = 0

        for reward in self.valid_rewards:
            current_weight += int(reward['odds'])
            if current_weight >= r:
                return reward
        return None

    def run_simulation(self):
        """Запуск симуляции"""
        num_spins = self.spin_count.get()
        if num_spins <= 0:
            messagebox.showerror("Ошибка", "Количество прокрутов должно быть больше 0!")
            return

        # Сбрасываем кнопку
        self.simulate_btn.configure(state='disabled')
        self.root.update()

        try:
            # Запускаем симуляцию
            spins_remaining = num_spins
            self.total_spins = 0
            self.free_spins_earned = 0
            self.win_counts = {reward['rewardId']: 0 for reward in self.rewards}
            self.results_history = []
            self.resource_totals = defaultdict(int)

            results_text = f"🚀 ЗАПУСК СИМУЛЯЦИИ {num_spins} ПРОКРУТОВ...\n"
            results_text += "=" * 80 + "\n\n"
            self.update_results_display(results_text)

            while spins_remaining > 0:
                spins_remaining -= 1
                self.total_spins += 1

                won_reward = self.spin()

                # Обрабатываем бесплатные спины
                if won_reward['isFreeTry'] == 'true':
                    spins_remaining += 1
                    self.free_spins_earned += 1
                    result_text = f"🌀 [{self.total_spins}] 🎁 БЕСПЛАТНЫЙ ПРОКРУТ! (+1 спин)"
                    self.results_history.append(result_text)
                    continue

                # Записываем выигрыш
                self.win_counts[won_reward['rewardId']] += 1
                amount = int(won_reward['amount'])

                # Суммируем ресурсы
                reward_name = won_reward['name']
                self.resource_totals[reward_name] += amount

                result_text = f"🎁 [{self.total_spins}] {reward_name}"
                if amount > 1:
                    result_text += f" x{amount}"

                self.results_history.append(result_text)

                # Обновляем прогресс
                if self.total_spins % 50 == 0:
                    self.update_results_display("")
                    self.root.update()

            # Финальное обновление
            self.update_results_display("")
            self.display_statistics()
            self.display_resources()

            results_text = f"\n✅ СИМУЛЯЦИЯ ЗАВЕРШЕНА! Всего прокрутов: {self.total_spins}\n"
            self.results_text.insert(tk.END, results_text)
            self.results_text.see(tk.END)

        finally:
            self.simulate_btn.configure(state='normal')

    def update_results_display(self, initial_text):
        """Обновляет отображение результатов"""
        self.results_text.configure(state='normal')
        self.results_text.delete(1.0, tk.END)

        if initial_text:
            self.results_text.insert(tk.END, initial_text)

        # Показываем последние 30 результатов
        start_idx = max(0, len(self.results_history) - 30)
        recent_results = self.results_history[start_idx:]

        for result in recent_results:
            self.results_text.insert(tk.END, result + "\n")

        # Показываем прогресс
        progress = f"\n📊 ПРОГРЕСС: {self.total_spins} прокрутов"
        progress += f" | 🎰 Бесплатных: {self.free_spins_earned}"
        progress += f" | 💰 Платных: {self.total_spins - self.free_spins_earned}"
        self.results_text.insert(tk.END, progress + "\n")

        self.results_text.configure(state='disabled')
        self.results_text.see(tk.END)

    def display_statistics(self):
        """Отображает статистику"""
        self.stats_text.configure(state='normal')
        self.stats_text.delete(1.0, tk.END)

        text = f"📈 ДЕТАЛЬНАЯ СТАТИСТИКА СИМУЛЯЦИИ:\n"
        text += "=" * 80 + "\n\n"
        text += f"🎯 Всего прокрутов: {self.total_spins:,}\n".replace(",", " ")
        text += f"🌀 Бесплатных спинов: {self.free_spins_earned:,}\n".replace(",", " ")
        text += f"💰 Платных прокрутов: {self.total_spins - self.free_spins_earned:,}\n".replace(",", " ")
        text += f"🏆 Всего наград: {sum(self.win_counts.values()):,}\n\n".replace(",", " ")

        text += "📊 СТАТИСТИКА ПО НАГРАДАМ:\n"
        text += "-" * 60 + "\n"

        # Группируем по типам наград
        categories = defaultdict(list)
        for reward in self.rewards:
            count = self.win_counts[reward['rewardId']]
            if count > 0:
                actual_chance = (count / self.total_spins) * 100
                categories[self.get_category(reward['name'])].append((reward, count, actual_chance))

        # Выводим по категориям
        for category, items in categories.items():
            text += f"\n{category}:\n"
            text += "-" * 50 + "\n"

            # Сортируем по количеству выпадений
            items.sort(key=lambda x: x[1], reverse=True)

            for reward, count, chance in items:
                text += f"  {reward['name']}: {count:,} раз ({chance:.4f}%)\n".replace(",", " ")

        self.stats_text.insert(tk.END, text)
        self.stats_text.configure(state='disabled')
        self.stats_text.see(tk.END)

    def display_resources(self):
        """Отображает суммарные ресурсы"""
        self.resources_text.configure(state='normal')
        self.resources_text.delete(1.0, tk.END)

        text = f"💰 СУММАРНЫЕ РЕСУРСЫ:\n"
        text += "=" * 80 + "\n\n"

        # Считаем количество выпадений каждой награды
        reward_counts = {}
        for reward in self.rewards:
            count = self.win_counts[reward['rewardId']]
            if count > 0:
                reward_counts[reward['name']] = count

        # Группируем ресурсы по типам
        resource_groups = defaultdict(int)
        resource_counts = defaultdict(int)  # ← Количество выпадений по группам

        for reward_name, total_amount in self.resource_totals.items():
            count = reward_counts.get(reward_name, 0)
            group_name = self.get_resource_group(reward_name)
            resource_groups[group_name] += total_amount
            resource_counts[group_name] += count

        # Выводим общие суммы по группам
        text += "🏆 ОБЩАЯ СТАТИСТИКА РЕСУРСОВ:\n"
        text += "-" * 60 + "\n"
        for group, total in sorted(resource_groups.items(), key=lambda x: x[1], reverse=True):
            count = resource_counts[group]
            text += f"  {group}: {total:,} (выпало {count} раз)\n".replace(",", " ")

        text += "\n📦 ДЕТАЛЬНАЯ СТАТИСТИКА:\n"
        text += "-" * 60 + "\n"

        # Детальная статистика
        for reward_name, total in sorted(self.resource_totals.items(),
                                         key=lambda x: x[1], reverse=True):
            count = reward_counts.get(reward_name, 0)
            text += f"  {reward_name}: {total:,} (выпало {count} раз)\n".replace(",", " ")

        self.resources_text.insert(tk.END, text)
        self.resources_text.configure(state='disabled')
        self.resources_text.see(tk.END)

    def get_category(self, reward_name):
        """Определяет категорию награды"""
        name = reward_name.lower()

        # Тот же алгоритм определения мутантов
        is_mutant = ('носорог' in name or
                     'стремглав' in name or
                     'биг босс' in name or
                     'микс' in name or
                     'z-0' in name or
                     'шершеляшар' in name or
                     'футбот' in name or
                     'кранекен' in name or
                     'щиткалибур' in name or
                     'космопанды' in name or
                     'соколиный' in name)

        if is_mutant:
            return "👾 МУТАНТЫ"
        elif 'звезд' in name:
            return "⭐ ЗВЕЗДЫ"
        elif 'монет' in name or ('золот' in name and not is_mutant):
            return "💰 ВАЛЮТА"
        elif 'аптечк' in name or 'мутостерон' in name or 'пропусков' in name:
            return "⚗️ МАТЕРИАЛЫ"
        elif 'бустер' in name:
            return "🎯 БУСТЕРЫ"
        elif 'бесплатн' in name:
            return "🌀 ФРИСПИНЫ"
        elif 'джекпот' in name:
            return "🎰 ДЖЕКПОТЫ"
        elif 'сфер' in name:
            return "🔮 СФЕРЫ"
        elif 'опыт' in name:
            return "⚗️ МАТЕРИАЛЫ"
        else:
            return "🎁 ПРОЧЕЕ"

    def get_resource_group(self, reward_name):
        """Группирует ресурсы для суммарной статистики"""
        name = reward_name.lower()

        # Тот же алгоритм
        is_mutant = ('носорог' in name or
                     'стремглав' in name or
                     'биг босс' in name or
                     'микс' in name or
                     'z-0' in name or
                     'шершеляшар' in name or
                     'футбот' in name or
                     'кранекен' in name or
                     'щиткалибур' in name or
                     'космопанды' in name or
                     'соколиный' in name)

        if is_mutant:
            return "Всего мутантов"
        elif 'звезд' in name:
            return "Всего звезд"
        elif 'монет' in name:
            return "Всего монет"
        elif 'золот' in name and not is_mutant:
            return "Всего золота"
        elif 'аптечк' in name:
            return "Всего аптечек"
        elif 'мутостерon' in name:
            return "Всего мутостерона"
        elif 'пропусков' in name:
            return "Всего пропусков"
        elif 'опыт' in name:
            return "Всего опыта"
        elif 'бустер' in name:
            return "Всего бустеров"
        elif 'сфер' in name:
            return "Всего сфер"
        else:
            return "Прочие ресурсы"

    def clear_history(self):
        """Очищает всю историю"""
        self.results_text.configure(state='normal')
        self.results_text.delete(1.0, tk.END)
        self.results_text.configure(state='disabled')

        self.stats_text.configure(state='normal')
        self.stats_text.delete(1.0, tk.END)
        self.stats_text.configure(state='disabled')

        self.resources_text.configure(state='normal')
        self.resources_text.delete(1.0, tk.END)
        self.resources_text.configure(state='disabled')

        self.results_history = []
        self.resource_totals = defaultdict(int)


# Запуск приложения
if __name__ == "__main__":
    root = tk.Tk()
    app = RouletteSimulator(root)
    root.mainloop()





