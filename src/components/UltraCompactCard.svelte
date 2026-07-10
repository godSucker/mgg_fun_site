<script lang="ts">
  import { textureUrl } from '@/lib/texture-cdn';

  const {
    mutant = null,
    stats = null,
    level = 30,
    stars = 0,
    basicSlots = [],
    specialSlot = null,
    atkMultipliers = { 1: 1, 2: 1 },
    attackRows = [],
    typeIcon = '',
    onLevelChange = (_v: number) => {},
    onStarsChange = (_s: number) => {},
    onAtkMultChange = (_atk: number, _delta: number) => {},
    onSlotClick = (_kind: string, _index?: number) => {},
    onSlotClear = (_kind: string, _index?: number) => {},
  } = $props();

  const STAR_ICON: Record<number, string> = {
    0: '/stars/no_stars.webp',
    1: '/stars/star_bronze.webp',
    2: '/stars/star_silver.webp',
    3: '/stars/star_gold.webp',
    4: '/stars/star_platinum.webp'
  };
  const STAT_ICON = {
    hp: '/etc/icon_hp.webp',
    speed: '/etc/icon_speed.webp',
  };
  const GENE_ICON: Record<string, string> = {
    '': '/genes/gene_all.webp',
    A: '/genes/gene_a.webp', B: '/genes/gene_b.webp', C: '/genes/gene_c.webp',
    D: '/genes/gene_d.webp', E: '/genes/gene_e.webp', F: '/genes/gene_f.webp',
  };

  function figureImage(m: any, s: number): string {
    if (!m) return '';
    const keys = ['normal','bronze','silver','gold','platinum'];
    const key = keys[s] ?? 'normal';
    const starData = m._rawStars?.[key];
    if (starData?.images?.length) {
      const imgs = starData.images.map((p: string) => p.replace(/^\/+/, '/'));
      const specimen = imgs.find((p: string) => p.includes('specimen'));
      if (specimen) return specimen;
      return imgs[0];
    }
    const imgs = m.images ?? [];
    const specimen = imgs.find((p: string) => p?.includes('specimen'));
    return specimen || imgs[0] || '';
  }

  function fmt(n: number): string {
    return Math.round(n).toLocaleString('ru-RU');
  }
  function fmtSpeed(v: number): string {
    if (!Number.isFinite(v)) return '—';
    const abs = Math.abs(v);
    const hasFrac = Math.round(abs * 100) !== Math.round(abs) * 100;
    return Number(v).toLocaleString('ru-RU', {
      minimumFractionDigits: hasFrac ? 2 : 0,
      maximumFractionDigits: 2,
    });
  }
</script>

<div class="uc-card">
  <!-- HEADER: Имя -->
  <div class="uc-header">
    <span class="uc-name">{mutant?.name || '—'}</span>
  </div>

  <!-- АВАТАР + ГЕНЫ -->
  <div class="uc-hero">
    <img class="uc-avatar" src={textureUrl(figureImage(mutant, stars))} alt={mutant?.name} />
    <div class="uc-genes">
      {#each (mutant?.genes ?? []) as g}
        <img src={textureUrl(GENE_ICON[g] || GENE_ICON[''])} alt={g} />
      {/each}
    </div>
  </div>

  <!-- УРОВЕНЬ + ЗВЁЗДЫ (вертикально) -->
  <div class="uc-level-block">
    <div class="uc-level-row">
      <span class="uc-lvl-label">Ур.</span>
      <input
        class="uc-lvl-input"
        type="number" min="1" max="500"
        value={level}
        oninput={(e) => onLevelChange(Number((e.target as HTMLInputElement).value) || 1)}
      />
    </div>
    <div class="uc-stars">
      {#each [0,1,2,3,4] as s}
        <button
          class="uc-star"
          class:active={stars === s}
          disabled={!mutant?.availableStars?.has(s)}
          onclick={() => onStarsChange(s)}
        >
          <img src={textureUrl(STAR_ICON[s])} alt="*" />
        </button>
      {/each}
    </div>
  </div>

  <!-- СФЕРЫ (микро) -->
  <div class="uc-slots">
    {#each basicSlots as orb, i}
      <button class="uc-slot" onclick={() => onSlotClick('basic', i)}>
        <img class="uc-slot-bg" src={textureUrl("/orbs/basic/orb_slot.webp")} alt="" />
        {#if orb}
          <img class="uc-orb" src={textureUrl(orb.icon)} alt="" />
          <span class="uc-slot-x" onclick={(e) => { e.stopPropagation(); onSlotClear('basic', i); }}>×</span>
        {/if}
      </button>
    {/each}
    {#if (mutant?.specialSlotCount ?? 0) > 0}
      <button class="uc-slot uc-slot-special" onclick={() => onSlotClick('special')}>
        <img class="uc-slot-bg" src={textureUrl("/orbs/special/orb_slot_spe.webp")} alt="" />
        {#if specialSlot}
          <img class="uc-orb" src={textureUrl(specialSlot.icon)} alt="" />
          <span class="uc-slot-x" onclick={(e) => { e.stopPropagation(); onSlotClear('special'); }}>×</span>
        {/if}
      </button>
    {/if}
  </div>

  <!-- СТАТЫ -->
  <div class="uc-stats">
    <div class="uc-stat">
      <span class="uc-stat-label">
        <img src={typeIcon || STAT_ICON.hp} alt="" /> Тип
      </span>
      <span class="uc-stat-val">{mutant?.typeLabel || '—'}</span>
    </div>
    <div class="uc-stat">
      <span class="uc-stat-label">
        <img src={STAT_ICON.hp} alt="" /> HP
      </span>
      <span class="uc-stat-val">{fmt(stats?.hp ?? 0)}</span>
    </div>

    {#each attackRows as atk}
      <div class="uc-atk-row">
        <div class="uc-atk-dmg">{fmt(atk.damage * (atkMultipliers[atk.attack] ?? 1))}</div>
        {#if atk.gene !== 'neutro'}
          <div class="uc-mult-group">
            {#each [-0.5, -0.25, 0, 0.25, 0.5] as delta}
              {@const active = (atkMultipliers[atk.attack] ?? 1) === (1 + delta)}
              <button
                class="uc-mult-btn"
                class:active
                class:m-neg={delta < 0}
                class:m-pos={delta > 0}
                onclick={() => onAtkMultChange(atk.attack, delta)}
              >{delta === 0 ? '0' : `${delta > 0 ? '+' : ''}${delta * 100}%`}</button>
            {/each}
          </div>
        {/if}
        {#if atk.effects?.length}
          {#each atk.effects as eff}
            <div class="uc-effect">
              <span class="uc-eff-val">{fmt(eff.value * (atkMultipliers[atk.attack] ?? 1))}</span>
            </div>
          {/each}
        {/if}
      </div>
    {/each}

    <div class="uc-stat">
      <span class="uc-stat-label">
        <img src={STAT_ICON.speed} alt="" /> Скор.
      </span>
      <span class="uc-stat-val">{fmtSpeed(stats?.speed ?? 0)}</span>
    </div>
    <div class="uc-stat">
      <span class="uc-stat-label">
        <img src={textureUrl("/cash/softcurrency.webp")} alt="" /> Серебро
      </span>
      <span class="uc-stat-val">{fmt(stats?.bank ?? 0)}</span>
    </div>
  </div>
</div>

<style>
  .uc-card {
    flex: 1 1 0;
    min-width: 0;
    background: #1e2530;
    border-radius: 10px;
    padding: 6px 5px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    overflow: hidden;
  }

  /* HEADER */
  .uc-header {
    text-align: center;
    padding: 0 2px;
    min-height: 18px;
  }
  .uc-name {
    font-size: 11px;
    font-weight: 800;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    line-height: 1.2;
  }

  /* HERO */
  .uc-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 2px 0;
  }
  .uc-avatar {
    width: 52px;
    height: 52px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }
  .uc-genes {
    display: flex;
    gap: 3px;
    justify-content: center;
  }
  .uc-genes img {
    width: 16px;
    height: 16px;
    object-fit: contain;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));
  }

  /* LEVEL + STARS */
  .uc-level-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .uc-level-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .uc-lvl-label {
    font-size: 9px;
    color: #8899aa;
    font-weight: 700;
  }
  .uc-lvl-input {
    width: 44px;
    padding: 2px 4px;
    border-radius: 5px;
    border: 1px solid #2e3948;
    background: #10161f;
    color: #e9eef6;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
    font-family: inherit;
  }
  .uc-stars {
    display: flex;
    gap: 2px;
  }
  .uc-star {
    width: 18px;
    height: 18px;
    min-width: 18px;
    border-radius: 50%;
    background: transparent;
    border: none;
    padding: 0;
    opacity: 0.35;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.15s;
  }
  .uc-star.active {
    opacity: 1;
    transform: scale(1.1);
  }
  .uc-star:disabled {
    display: none;
  }
  .uc-star img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .uc-star:not(.active) img {
    filter: grayscale(1) brightness(0.5);
  }

  /* SLOTS */
  .uc-slots {
    display: flex;
    gap: 4px;
    justify-content: center;
    padding: 1px 0;
  }
  .uc-slot {
    position: relative;
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 6px;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    overflow: visible;
  }
  .uc-slot-bg {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .uc-orb {
    position: absolute;
    inset: 10%;
    object-fit: contain;
    border-radius: 4px;
  }
  .uc-slot-x {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ff4444;
    color: #fff;
    font-size: 9px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    z-index: 2;
    cursor: pointer;
  }

  /* STATS */
  .uc-stats {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .uc-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #151c25;
    border: 1px solid #242d3a;
    border-radius: 6px;
    padding: 2px 6px;
    min-height: 20px;
  }
  .uc-stat-label {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 9px;
    color: #8899aa;
    font-weight: 600;
  }
  .uc-stat-label img {
    width: 12px;
    height: 12px;
    object-fit: contain;
  }
  .uc-stat-val {
    font-size: 11px;
    font-weight: 700;
    color: #e9eef6;
    font-variant-numeric: tabular-nums;
  }

  /* ATK ROW */
  .uc-atk-row {
    background: #151c25;
    border: 1px solid #242d3a;
    border-radius: 6px;
    padding: 3px 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .uc-atk-dmg {
    font-size: 13px;
    font-weight: 800;
    color: #fff;
    text-align: center;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }

  /* MODIFIER BUTTONS */
  .uc-mult-group {
    display: flex;
    gap: 2px;
    justify-content: center;
  }
  .uc-mult-btn {
    appearance: none;
    border: 1px solid #2e3948;
    background: #10161f;
    color: #6b7a8d;
    border-radius: 3px;
    padding: 1px 4px;
    font-size: 8px;
    font-weight: 700;
    line-height: 1.3;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    font-family: inherit;
    min-width: 24px;
    text-align: center;
  }
  .uc-mult-btn:hover {
    background: #1b212a;
    color: #aab6c8;
  }
  .uc-mult-btn.active {
    background: rgba(59,130,246,0.25);
    color: #60a5fa;
    border-color: rgba(59,130,246,0.5);
  }
  .uc-mult-btn.active.m-neg {
    color: #fbbf24;
    border-color: rgba(251,191,36,0.4);
    background: rgba(251,191,36,0.15);
  }
  .uc-mult-btn.active.m-pos {
    color: #f87171;
    border-color: rgba(248,113,113,0.4);
    background: rgba(248,113,113,0.15);
  }

  /* EFFECTS */
  .uc-effect {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
  }
  .uc-eff-val {
    font-size: 9px;
    font-weight: 700;
    color: #90f36b;
    font-variant-numeric: tabular-nums;
  }
</style>
