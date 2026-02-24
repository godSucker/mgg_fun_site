import { f as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../../chunks/astro/server_C9fxJ0Ab.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from '../../../chunks/BaseLayout_Cdeq5Zjw.mjs';
import { c as escape_html, b as attr, d as attr_class, h as bind_props } from '../../../chunks/_@astro-renderers_DtO3kaqa.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_DtO3kaqa.mjs';
/* empty css                                       */

const id = "lucky";
const title = "Lucky Slots";
const cost = 0;
const tokenCost = 1;
const rewards = /* #__PURE__ */ JSON.parse("[{\"rewardId\":1,\"amount\":1,\"odds\":3,\"type\":\"entity\",\"id\":null,\"picture\":\"thumbnails/jackpot.webp\",\"isBigwin\":true,\"isSuperJackpot\":true,\"isFreeTry\":false,\"name\":\"Джекпот\",\"description\":\"Главный приз\",\"category\":\"jackpot\",\"icon\":\"/cash/jackpot.webp\"},{\"rewardId\":2,\"amount\":1,\"odds\":100000,\"type\":\"entity\",\"id\":null,\"picture\":\"thumbnails/freespin.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":true,\"name\":\"Бесплатный прокрут\",\"description\":\"Возможность крутить рулетку еще раз без оплаты\",\"category\":\"free-spin\",\"icon\":\"/etc/freespin.webp\"},{\"rewardId\":3,\"amount\":1,\"odds\":32500,\"type\":\"entity\",\"id\":\"Star_Bronze\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бронзовая звезда\",\"description\":\"Валюта для улучшений\",\"category\":\"star\",\"icon\":\"/stars/star_bronze.webp\"},{\"rewardId\":4,\"amount\":1,\"odds\":5200,\"type\":\"entity\",\"id\":\"Star_Silver\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Серебряная звезда\",\"description\":\"Редкая валюта для улучшений\",\"category\":\"star\",\"icon\":\"/stars/star_silver.webp\"},{\"rewardId\":5,\"amount\":1,\"odds\":2600,\"type\":\"entity\",\"id\":\"Star_Gold\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Золотая звезда\",\"description\":\"Очень редкая валюта для улучшений\",\"category\":\"star\",\"icon\":\"/stars/star_gold.webp\"},{\"rewardId\":6,\"amount\":1,\"odds\":16250,\"type\":\"entity\",\"id\":\"Material_Energy25\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"25 пропусков\",\"description\":\"Энергия для прохождения уровней\",\"category\":\"material\",\"icon\":\"/materials/ticket_25.webp\"},{\"rewardId\":7,\"amount\":15,\"odds\":28900,\"type\":\"entity\",\"id\":\"Material_LP100\",\"picture\":\"thumbnails/material_lp100_x15.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Аптечка\",\"description\":\"15 аптечек для лечения мутантов\",\"category\":\"material\",\"icon\":\"/med/normal_med.webp\"},{\"rewardId\":8,\"amount\":10,\"odds\":4330,\"type\":\"entity\",\"id\":\"Material_LP1000\",\"picture\":\"thumbnails/material_lp1000_x10.webp\",\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Большая аптечка\",\"description\":\"10 больших аптечек\",\"category\":\"material\",\"icon\":\"/med/big_med.webp\"},{\"rewardId\":9,\"amount\":2,\"odds\":13000,\"type\":\"entity\",\"id\":\"Material_Muto50\",\"picture\":\"thumbnails/material_muto50_x2.webp\",\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Большая доза мутостерона\",\"description\":\"2 большие дозы для улучшений\",\"category\":\"material\",\"icon\":\"/materials/big_muto.webp\"},{\"rewardId\":10,\"amount\":5000,\"odds\":10,\"type\":\"softcurrency\",\"id\":\"5000sc\",\"picture\":\"thumbnails/sc100.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"5000 монет\",\"description\":\"Игровая валюта\",\"category\":\"currency\",\"icon\":\"/cash/softcurrency.webp\"},{\"rewardId\":11,\"amount\":10000,\"odds\":110000,\"type\":\"softcurrency\",\"id\":null,\"picture\":\"thumbnails/sc500.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"10000 монет\",\"description\":\"Игровая валюта\",\"category\":\"currency\",\"icon\":\"/cash/s10000.webp\"},{\"rewardId\":12,\"amount\":20000,\"odds\":88000,\"type\":\"softcurrency\",\"id\":null,\"picture\":\"thumbnails/sc1000.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"20000 монет\",\"description\":\"Игровая валюта\",\"category\":\"currency\",\"icon\":\"/cash/softcurrency.webp\"},{\"rewardId\":13,\"amount\":50000,\"odds\":50000,\"type\":\"softcurrency\",\"id\":null,\"picture\":\"thumbnails/sc10000.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"50000 монет\",\"description\":\"Игровая валюта\",\"category\":\"currency\",\"icon\":\"/cash/s50000.webp\"},{\"rewardId\":14,\"amount\":100000,\"odds\":37154,\"type\":\"softcurrency\",\"id\":null,\"picture\":\"thumbnails/sc50000.webp\",\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"100000 монет\",\"description\":\"Крупная сумма игровой валюты\",\"category\":\"currency\",\"icon\":\"/cash/s100000.webp\"},{\"rewardId\":15,\"amount\":500000,\"odds\":13000,\"type\":\"softcurrency\",\"id\":null,\"picture\":\"thumbnails/sc75000.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"500000 монет\",\"description\":\"Очень крупная сумма игровой валюты\",\"category\":\"currency\",\"icon\":\"/cash/softcurrency.webp\"},{\"rewardId\":16,\"amount\":1000000,\"odds\":4342,\"type\":\"softcurrency\",\"id\":null,\"picture\":\"thumbnails/sc100000.webp\",\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"1000000 монет\",\"description\":\"Огромная сумма игровой валюты\",\"category\":\"currency\",\"icon\":\"/cash/s1000000.webp\"},{\"rewardId\":17,\"amount\":5000000,\"odds\":130,\"type\":\"softcurrency\",\"id\":null,\"picture\":\"thumbnails/sc1000000.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"5000000 монет\",\"description\":\"Гигантская сумма игровой валюты\",\"category\":\"currency\",\"icon\":\"/cash/softcurrency.webp\"},{\"rewardId\":18,\"amount\":1,\"odds\":6500,\"type\":\"entity\",\"id\":\"Material_Gacha_Token\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Жетон генератора\",\"description\":\"Для крутки других автоматов\",\"category\":\"token\",\"icon\":\"/tokens/material_gacha_token.webp\"},{\"rewardId\":19,\"amount\":1,\"odds\":0,\"type\":\"entity\",\"id\":\"Daily_Token\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Ежедневный жетон\",\"description\":\"Не участвует в розыгрыше (шанс 0%)\",\"category\":\"token\",\"icon\":\"/tokens/daily_token.webp\"},{\"rewardId\":20,\"amount\":10,\"odds\":91000,\"type\":\"hardcurrency\",\"id\":null,\"picture\":\"thumbnails/hc10.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"10 золота\",\"description\":\"Премиум валюта\",\"category\":\"currency\",\"icon\":\"/cash/g10.webp\"},{\"rewardId\":21,\"amount\":20,\"odds\":26000,\"type\":\"hardcurrency\",\"id\":null,\"picture\":\"thumbnails/hc20.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"20 золота\",\"description\":\"Премиум валюта\",\"category\":\"currency\",\"icon\":\"/cash/g20.webp\"},{\"rewardId\":22,\"amount\":40,\"odds\":2600,\"type\":\"hardcurrency\",\"id\":null,\"picture\":\"thumbnails/hc40.webp\",\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"40 золота\",\"description\":\"Премиум валюта\",\"category\":\"currency\",\"icon\":\"/cash/g40.webp\"},{\"rewardId\":23,\"amount\":1,\"odds\":32500,\"type\":\"entity\",\"id\":\"Material_XP250\",\"picture\":\"thumbnails/material_xp250.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Баночка опыта\",\"description\":\"Опыт для прокачки мутантов\",\"category\":\"material\",\"icon\":\"/materials/mini_xp.webp\"},{\"rewardId\":24,\"amount\":1,\"odds\":32500,\"type\":\"entity\",\"id\":\"Material_XP1000\",\"picture\":\"thumbnails/material_xp1000.webp\",\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Банка опыта\",\"description\":\"Много опыта для прокачки мутантов\",\"category\":\"material\",\"icon\":\"/materials/big_xp.webp\"},{\"rewardId\":25,\"amount\":1,\"odds\":130,\"type\":\"entity\",\"id\":\"Charm_Critical_7\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер критов (7 дней)\",\"description\":\"Повышение шанса критического удара\",\"category\":\"booster\",\"icon\":\"/boosters/charm_critical_7.webp\"},{\"rewardId\":26,\"amount\":1,\"odds\":130,\"type\":\"entity\",\"id\":\"Charm_Anticritical_7\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер щита (7 дней)\",\"description\":\"Защита от критических ударов\",\"category\":\"booster\",\"icon\":\"/boosters/charm_anticritical_7.webp\"},{\"rewardId\":27,\"amount\":1,\"odds\":130,\"type\":\"entity\",\"id\":\"Charm_Xpx2_7\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер опыта +100% (7 дней)\",\"description\":\"Удвоение получаемого опыта\",\"category\":\"booster\",\"icon\":\"/boosters/charm_xpx2_7.webp\"},{\"rewardId\":28,\"amount\":1,\"odds\":130,\"type\":\"entity\",\"id\":\"Charm_Xpx3_7\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер опыта +200% (7 дней)\",\"description\":\"Утроение получаемого опыта\",\"category\":\"booster\",\"icon\":\"/boosters/charm_xpx3_7.webp\"},{\"rewardId\":29,\"amount\":1,\"odds\":26000,\"type\":\"entity\",\"id\":\"Charm_Critical_1\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер критов (1 день)\",\"description\":\"Повышение шанса критического удара\",\"category\":\"booster\",\"icon\":\"/boosters/charm_critical_1.webp\"},{\"rewardId\":30,\"amount\":1,\"odds\":26000,\"type\":\"entity\",\"id\":\"Charm_Anticritical_1\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер щита (1 день)\",\"description\":\"Защита от критических ударов\",\"category\":\"booster\",\"icon\":\"/boosters/charm_anticritical_1.webp\"},{\"rewardId\":31,\"amount\":1,\"odds\":6500,\"type\":\"entity\",\"id\":\"Charm_Xpx2_1\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер опыта +100% (1 день)\",\"description\":\"Удвоение получаемого опыта\",\"category\":\"booster\",\"icon\":\"/boosters/charm_xpx2_1.webp\"},{\"rewardId\":32,\"amount\":1,\"odds\":3900,\"type\":\"entity\",\"id\":\"Charm_Xpx3_1\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер опыта +200% (1 день)\",\"description\":\"Утроение получаемого опыта\",\"category\":\"booster\",\"icon\":\"/boosters/charm_xpx3_1.webp\"},{\"rewardId\":33,\"amount\":1,\"odds\":2600,\"type\":\"entity\",\"id\":\"Charm_Regenx2_1\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер регенерации +100% (1 день)\",\"description\":\"Удвоение скорости восстановления HP\",\"category\":\"booster\",\"icon\":\"/boosters/charm_regenx2_1.webp\"},{\"rewardId\":34,\"amount\":1,\"odds\":2600,\"type\":\"entity\",\"id\":\"Charm_Regenx4_1\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Бустер регенерации +300% (1 день)\",\"description\":\"Учетверение скорости восстановления HP\",\"category\":\"booster\",\"icon\":\"/boosters/charm_regenx4_1.webp\"},{\"rewardId\":35,\"amount\":1,\"odds\":500,\"type\":\"entity\",\"id\":\"Specimen_DA_04\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Эскадрилья Носорог\",\"description\":\"Мутант\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/da_04/specimen_da_04_normal.webp\"},{\"rewardId\":36,\"amount\":1,\"odds\":500,\"type\":\"entity\",\"id\":\"Specimen_AF_04\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Стремглав\",\"description\":\"Мутант\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/af_04/specimen_af_04_normal.webp\"},{\"rewardId\":37,\"amount\":1,\"odds\":1300,\"type\":\"entity\",\"id\":\"Star_Platinum\",\"picture\":null,\"isBigwin\":true,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Платиновая звезда\",\"description\":\"Очень редкая валюта для улучшений\",\"category\":\"star\",\"icon\":\"/stars/star_platinum.webp\"},{\"rewardId\":38,\"amount\":1000,\"odds\":200,\"type\":\"hardcurrency\",\"id\":null,\"picture\":\"thumbnails/jackpot_gold_x1000.webp\",\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"1000 золота\",\"description\":\"Огромное количество премиум валюты\",\"category\":\"currency\",\"icon\":\"/cash/g1000.webp\"},{\"rewardId\":39,\"amount\":1,\"odds\":30,\"type\":\"entity\",\"id\":\"Specimen_CA_09\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Биг Босс\",\"description\":\"Редкий мутант\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/ca_09/specimen_ca_09_normal.webp\"},{\"rewardId\":40,\"amount\":1,\"odds\":30,\"type\":\"entity\",\"id\":\"Specimen_AE_11\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Микс0-Лог (Золотой)\",\"description\":\"Редкий мутант с золотым скином\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/ae_11/specimen_ae_11_normal.webp\"},{\"rewardId\":41,\"amount\":1,\"odds\":100,\"type\":\"entity\",\"id\":\"Specimen_BA_06\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Z-0 (Золотой)\",\"description\":\"Редкий мутант с золотым скином\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/ba_06/specimen_ba_06_normal.webp\"},{\"rewardId\":42,\"amount\":1,\"odds\":100,\"type\":\"entity\",\"id\":\"Specimen_DD_07\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Шершеляшар (Золотой)\",\"description\":\"Редкий мутант с золотым скином\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/dd_07/specimen_dd_07_normal.webp\"},{\"rewardId\":43,\"amount\":1,\"odds\":30,\"type\":\"entity\",\"id\":\"Specimen_FA_08\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Футбот (Золотой)\",\"description\":\"Редкий мутант с золотым скином\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/fa_08/specimen_fa_08_normal.webp\"},{\"rewardId\":44,\"amount\":1,\"odds\":30,\"type\":\"entity\",\"id\":\"Specimen_CB_12\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Кранекен (Золотой)\",\"description\":\"Редкий мутант с золотым скином\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/cb_12/specimen_cb_12_normal.webp\"},{\"rewardId\":45,\"amount\":1,\"odds\":30,\"type\":\"entity\",\"id\":\"Specimen_EC_09\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Щиткалибур (Золотой)\",\"description\":\"Редкий мутант с золотым скином\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/ec_09/specimen_ec_09_normal.webp\"},{\"rewardId\":46,\"amount\":1,\"odds\":30,\"type\":\"entity\",\"id\":\"Specimen_DE_08\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Космопанды (Золотой)\",\"description\":\"Редкий мутант с золотым скином\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/de_08/specimen_de_08_normal.webp\"},{\"rewardId\":47,\"amount\":1,\"odds\":30,\"type\":\"entity\",\"id\":\"Specimen_DA_10\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Соколиный Глаз (Золотой)\",\"description\":\"Редкий мутант с золотым скином\",\"category\":\"mutant\",\"icon\":\"/textures_by_mutant/da_10/specimen_da_10_normal.webp\"},{\"rewardId\":48,\"amount\":1,\"odds\":32000,\"type\":\"entity\",\"id\":\"orb_basic_xp_01_ephemeral_10\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Сфера опыта I (10 зарядов)\",\"description\":\"Временная сфера\",\"category\":\"orb\",\"icon\":\"/orbs/basic/orb_basic_xp_01.webp\"},{\"rewardId\":49,\"amount\":1,\"odds\":16000,\"type\":\"entity\",\"id\":\"orb_basic_xp_02_ephemeral_10\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Сфера опыта II (10 зарядов)\",\"description\":\"Временная сфера\",\"category\":\"orb\",\"icon\":\"/orbs/basic/orb_basic_xp_02.webp\"},{\"rewardId\":50,\"amount\":1,\"odds\":8000,\"type\":\"entity\",\"id\":\"orb_basic_xp_03_ephemeral_10\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Сфера опыта III (10 зарядов)\",\"description\":\"Временная сфера\",\"category\":\"orb\",\"icon\":\"/orbs/basic/orb_basic_xp_03.webp\"},{\"rewardId\":51,\"amount\":1,\"odds\":4000,\"type\":\"entity\",\"id\":\"orb_basic_xp_04_ephemeral_10\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Сфера опыта IV (10 зарядов)\",\"description\":\"Временная сфера\",\"category\":\"orb\",\"icon\":\"/orbs/basic/orb_basic_xp_04.webp\"},{\"rewardId\":52,\"amount\":1,\"odds\":2000,\"type\":\"entity\",\"id\":\"orb_basic_xp_05_ephemeral_10\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Сфера опыта V (10 зарядов)\",\"description\":\"Временная сфера\",\"category\":\"orb\",\"icon\":\"/orbs/basic/orb_basic_xp_05.webp\"},{\"rewardId\":53,\"amount\":1,\"odds\":2000,\"type\":\"entity\",\"id\":\"orb_basic_attack_05_ephemeral_30\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Сфера атаки V (30 зарядов)\",\"description\":\"Временная сфера\",\"category\":\"orb\",\"icon\":\"/orbs/basic/orb_basic_attack_05.webp\"},{\"rewardId\":54,\"amount\":1,\"odds\":2000,\"type\":\"entity\",\"id\":\"orb_basic_life_05_ephemeral_30\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Сфера HP V (30 зарядов)\",\"description\":\"Временная сфера\",\"category\":\"orb\",\"icon\":\"/orbs/basic/orb_basic_life_05.webp\"},{\"rewardId\":55,\"amount\":1,\"odds\":2000,\"type\":\"entity\",\"id\":\"orb_basic_critical_05_ephemeral_30\",\"picture\":null,\"isBigwin\":false,\"isSuperJackpot\":false,\"isFreeTry\":false,\"name\":\"Сфера крит. урона V (30 зарядов)\",\"description\":\"Временная сфера\",\"category\":\"orb\",\"icon\":\"/orbs/basic/orb_basic_critical_05.webp\"}]");
const rawMachine = {
  id,
  title,
  cost,
  tokenCost,
  rewards,
};

const luckyMachine = rawMachine;
function getValidRewards(machine = luckyMachine) {
  return machine.rewards.filter((reward) => reward.odds > 0);
}
function getTotalWeight(machine = luckyMachine) {
  return getValidRewards(machine).reduce((sum, reward) => sum + reward.odds, 0);
}
function getRewardWithChance(reward, machine = luckyMachine) {
  const totalWeight = getTotalWeight(machine);
  const chance = totalWeight > 0 ? reward.odds / totalWeight : 0;
  return {
    ...reward,
    chance
  };
}

function LuckyMachineSimulator($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let machine = $$props['machine'];
		const rewardChances = machine.rewards.filter((reward) => reward.odds > 0).map((reward) => getRewardWithChance(reward, machine)).sort((a, b) => b.chance - a.chance);
		let spins = 200;
		let isSimulating = false;

		const resourceSummaryConfig = {
			consumables: {
				label: 'Расходники',
				icon: '/med/normal_med.webp',
				metaLabel: 'Ресурсов суммарно'
			},
			stars: {
				label: 'Звёзды',
				icon: '/stars/all_stars.webp',
				metaLabel: 'Ресурсов суммарно'
			},
			spheres: {
				label: 'Сферы',
				icon: '/orbs/basic/orb_slot.webp',
				metaLabel: 'Ресурсов суммарно'
			},
			boosters: {
				label: 'Бустеры',
				icon: '/boosters/charm_xpx2_7.webp',
				metaLabel: 'Ресурсов суммарно'
			},
			tokens: {
				label: 'Жетоны',
				icon: '/tokens/material_gacha_token.webp',
				metaLabel: 'Ресурсов суммарно'
			},
			mutants: {
				label: 'Мутанты',
				icon: '/etc/icon_larva.webp',
				metaLabel: 'Выпало суммарно'
			},
			jackpots: {
				label: 'Джекпоты',
				icon: '/cash/jackpot.webp',
				metaLabel: 'Выпало суммарно'
			}
		};

		const resourceSummaryOrder = [
			'consumables',
			'stars',
			'spheres',
			'boosters',
			'tokens',
			'mutants',
			'jackpots'
		];

		const rewardChanceMap = new Map();

		for (const reward of rewardChances) {
			rewardChanceMap.set(reward.rewardId, reward.chance);
		}

		function buildResourceSummaries(simulation) {
			const totals = new Map();

			return resourceSummaryOrder.map((key) => {
				const config = resourceSummaryConfig[key];
				const bucket = totals.get(key) ?? { count: 0, totalAmount: 0 };

				return { key, ...config, ...bucket };
			});
		}

		let resourceSummaries = [];

		resourceSummaries = buildResourceSummaries();
		resourceSummaries.find((s) => s.key === 'jackpots')?.count ?? 0;

		$$renderer.push(`<div class="machine-shell svelte-1s5ogca"><div class="machine-body svelte-1s5ogca"><div class="machine-header svelte-1s5ogca"><span class="machine-tag svelte-1s5ogca">Lucky Slots</span> <h2 class="svelte-1s5ogca">${escape_html(machine.title)}</h2> <p>Крутите слот-машину с реальными шансами. Бесплатные прокруты добавляются автоматически.</p></div> <form class="control-panel svelte-1s5ogca" style="order: -1;"><label class="input-group"><span>Количество платных прокрутов</span> <div class="input-wrapper svelte-1s5ogca"><input type="number"${attr('min', 1)}${attr('value', spins)} class="svelte-1s5ogca"/> <span class="suffix">спинов</span></div></label> <div class="actions svelte-1s5ogca"><button type="submit" class="primary svelte-1s5ogca"${attr('disabled', isSimulating, true)}>${escape_html('Запустить симуляцию')}</button> <button type="button" class="ghost svelte-1s5ogca">${escape_html('Очистить')}</button></div> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></form> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></div> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--> <aside${attr_class('odds-panel svelte-1s5ogca', void 0, { 'collapsed': true })}><button class="odds-toggle svelte-1s5ogca"><h3>Шансы</h3> <span class="chevron svelte-1s5ogca">${escape_html('▲')}</span></button> `);

		{
			$$renderer.push('<!--[!-->');
		}

		$$renderer.push(`<!--]--></aside></div>`);
		bind_props($$props, { machine });
	});
}

const $$Lucky = createComponent(($$result, $$props, $$slots) => {
  const jackpotReward = luckyMachine.rewards.find((reward) => reward.isSuperJackpot) ?? null;
  const freeSpinReward = luckyMachine.rewards.find((reward) => reward.isFreeTry) ?? null;
  const jackpotChance = jackpotReward ? getRewardWithChance(jackpotReward, luckyMachine).chance : 0;
  const freeSpinChance = freeSpinReward ? getRewardWithChance(freeSpinReward, luckyMachine).chance : 0;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Lucky Slots \u2014 \u0441\u0438\u043C\u0443\u043B\u044F\u0442\u043E\u0440 \u0440\u0443\u043B\u0435\u0442\u043A\u0438", "fullWidth": true, "data-astro-cid-c7dkyjqm": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="back-nav" data-astro-cid-c7dkyjqm> <a href="/simulators/roulette" class="back-button" data-astro-cid-c7dkyjqm> <span class="icon" data-astro-cid-c7dkyjqm>←</span> <span class="text" data-astro-cid-c7dkyjqm>Назад к рулеткам</span> </a> </div> <section class="hero" data-astro-cid-c7dkyjqm> <div class="hero-card" data-astro-cid-c7dkyjqm> <span class="badge" data-astro-cid-c7dkyjqm>Sim • Lucky Slots</span> <h1 data-astro-cid-c7dkyjqm>Lucky Slots</h1> <p data-astro-cid-c7dkyjqm>
Рулетка ресурсов. Используются оригинальные шансы из игры.
</p> <dl class="quick-stats" aria-label="Основные параметры Lucky Slots" data-astro-cid-c7dkyjqm> <div data-astro-cid-c7dkyjqm> <dt data-astro-cid-c7dkyjqm>Стоимость прокрута</dt> <dd data-astro-cid-c7dkyjqm>1 жетон джекпота</dd> </div> <div data-astro-cid-c7dkyjqm> <dt data-astro-cid-c7dkyjqm>Количество призов</dt> <dd data-astro-cid-c7dkyjqm>${luckyMachine.rewards.length}</dd> </div> <div data-astro-cid-c7dkyjqm> <dt data-astro-cid-c7dkyjqm>Шанс бесплатного спина</dt> <dd data-astro-cid-c7dkyjqm>${(freeSpinChance * 100).toFixed(2)}%</dd> </div> <div data-astro-cid-c7dkyjqm> <dt data-astro-cid-c7dkyjqm>Шанс джекпота</dt> <dd data-astro-cid-c7dkyjqm>${(jackpotChance * 100).toFixed(4)}%</dd> </div> </dl> </div> </section> ${renderComponent($$result2, "LuckyMachineSimulator", LuckyMachineSimulator, { "client:load": true, "machine": luckyMachine, "client:component-hydration": "load", "client:component-path": "C:/Users/Aberration/Downloads/mgg_fun_site/src/components/simulators/lucky/LuckyMachineSimulator.svelte", "client:component-export": "default", "data-astro-cid-c7dkyjqm": true })} ` })} `;
}, "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/simulators/roulette/lucky.astro", void 0);

const $$file = "C:/Users/Aberration/Downloads/mgg_fun_site/src/pages/simulators/roulette/lucky.astro";
const $$url = "/simulators/roulette/lucky";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Lucky,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
