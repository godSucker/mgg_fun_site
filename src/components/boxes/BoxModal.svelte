<script lang="ts">
  import boxesData from '@/data/boxes.json'
  import { textureUrl } from '@/lib/texture-cdn'
  import { getMutantTexturePath, getRewardTexturePath, getRewardLabel } from '@/lib/bingo-textures'

  interface BoxMutantRef {
    id: string
    name: string
    tier: string | null
    skin: string | null
  }
  interface BoxReward {
    name: string
    type: 'entity' | 'hardcurrency' | 'softcurrency'
    amount: number
  }
  interface Box {
    itemId: string
    icon: string | null
    category: string
    name: string
    mutants: BoxMutantRef[]
    rewards: BoxReward[]
  }

  const boxes = boxesData as Box[]
  const boxByItemId = new Map(boxes.map((b) => [b.itemId, b]))

  const TIER_ICON: Record<string, string> = {
    'бронза': '/stars/star_bronze.webp',
    'серебро': '/stars/star_silver.webp',
    'золото': '/stars/star_gold.webp',
    'платина': '/stars/star_platinum.webp',
  }

  function mutantIcon(m: BoxMutantRef): string {
    const variant = (m.tier && ['бронза', 'серебро', 'золото', 'платина'].includes(m.tier)
      ? { 'бронза': 'bronze', 'серебро': 'silver', 'золото': 'gold', 'платина': 'platinum' }[m.tier]
      : 'normal') as 'normal' | 'bronze' | 'silver' | 'gold' | 'platinum'
    return getMutantTexturePath(m.id, m.skin ?? '_any', variant)
  }

  // Одинаковые ресурсы (напр. 24 звезды в LuckyBox_Stars) сворачиваем по count -
  // это пул случайного выбора, показывать 24 одинаковые строки бессмысленно.
  function groupedRewards(rewards: BoxReward[]) {
    const map = new Map<string, { reward: BoxReward; count: number }>()
    for (const r of rewards) {
      const key = `${r.type}|${r.name}|${r.amount}`
      const existing = map.get(key)
      if (existing) existing.count++
      else map.set(key, { reward: r, count: 1 })
    }
    return [...map.values()]
  }

  let open = $state(false)
  let box: Box | null = $state(null)

  function onOpen(e: Event) {
    const itemId = (e as CustomEvent).detail?.boxId as string | undefined
    if (!itemId) return
    const found = boxByItemId.get(itemId)
    if (!found) return
    box = found
    open = true
  }

  function close() {
    open = false
    box = null
  }

  function openMutant(specimenId: string) {
    window.dispatchEvent(new CustomEvent('archivist:open-mutant', { detail: { specimenId } }))
  }

  let escHandler: ((e: KeyboardEvent) => void) | null = null
  $effect(() => {
    window.addEventListener('archivist:open-box', onOpen)
    escHandler = (e) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', escHandler)
    return () => {
      window.removeEventListener('archivist:open-box', onOpen)
      if (escHandler) window.removeEventListener('keydown', escHandler)
    }
  })
</script>

{#if open && box}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-start justify-center p-2 md:p-4 overflow-y-auto overscroll-contain"
    onclick={(e) => { if (e.target === e.currentTarget) close() }}
  >
    <div class="modal-panel w-full max-w-2xl mt-4 md:mt-10 mb-4 rounded-xl bg-slate-950 ring-1 ring-white/10 shadow-2xl" role="dialog" aria-modal="true" aria-label={box.name}>
      <div class="modal-head flex items-start gap-4 p-4 border-b border-white/10">
        {#if box.icon}
          <img class="box-icon" src={textureUrl(box.icon)} alt="" loading="lazy" decoding="async" />
        {/if}
        <div class="flex-1 min-w-0">
          {#if box.category}<div class="text-[11px] uppercase tracking-wide text-blue-300/80">{box.category}</div>{/if}
          <h2 class="text-lg font-bold text-white leading-snug break-words">{box.name}</h2>
          {#if box.mutants.length}<div class="text-xs text-slate-400 mt-1">Мутантов в дроп-листе: {box.mutants.length}</div>{/if}
        </div>
        <button class="close-btn shrink-0" onclick={close} aria-label="Закрыть">&times;</button>
      </div>

      <div class="p-4 flex flex-col gap-4">
        {#if box.rewards.length}
          <div>
            <div class="section-title">Прочие награды</div>
            <div class="reward-row">
              {#each groupedRewards(box.rewards) as { reward, count } (reward.type + reward.name + reward.amount)}
                <span class="reward-chip">
                  {#if getRewardTexturePath(reward)}
                    <img src={textureUrl(getRewardTexturePath(reward))} alt="" loading="lazy" decoding="async" />
                  {/if}
                  {getRewardLabel(reward)}{#if count > 1}<span class="reward-count">×{count} слотов</span>{/if}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        {#if box.mutants.length}
          <div class="mutant-grid">
            {#each box.mutants as m, i (i)}
              <button class="mutant-cell" onclick={() => openMutant(m.id)}>
                <span class="mutant-cell-img">
                  {#if mutantIcon(m)}
                    <img src={textureUrl(mutantIcon(m))} alt="" loading="lazy" decoding="async" />
                  {/if}
                </span>
                <span class="mutant-cell-name">{m.name}</span>
                <span class="mutant-cell-tags">
                  {#if m.tier && TIER_ICON[m.tier]}
                    <img class="tier-icon" src={textureUrl(TIER_ICON[m.tier])} alt={m.tier} title={m.tier} loading="lazy" decoding="async" />
                  {/if}
                  {#if m.skin}
                    <span class="skin-text" title={`Скин: ${m.skin}`}>скин «{m.skin}»</span>
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .box-icon { width: 64px; height: 64px; object-fit: contain; border-radius: 10px; background: rgba(255,255,255,0.04); padding: 6px; }
  .close-btn { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #cbd5f5; font-size: 1.4rem; line-height: 1; border: none; cursor: pointer; }
  .close-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; margin-bottom: 0.5rem; }

  .reward-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .reward-chip { display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; padding: 0.25rem 0.6rem 0.25rem 0.3rem; font-size: 11.5px; color: #e2e8f0; }
  .reward-chip img { width: 20px; height: 20px; object-fit: contain; }
  .reward-count { color: #64748b; margin-left: 0.15rem; }

  .mutant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 0.6rem; max-height: 50vh; overflow-y: auto; }

  .mutant-cell { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 0.5rem 0.35rem; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; text-align: center; }
  .mutant-cell:hover { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.35); }
  .mutant-cell:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }

  .mutant-cell-img { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; }
  .mutant-cell-img img { width: 100%; height: 100%; object-fit: cover; }

  .mutant-cell-name { font-size: 11px; color: #cbd5f5; line-height: 1.15; word-break: break-word; }

  .mutant-cell-tags { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .tier-icon { width: 14px; height: 14px; }
  .skin-text { font-size: 9px; color: #a5b4fc; word-break: break-word; }

  @media (prefers-reduced-motion: no-preference) {
    .modal-panel { animation: modal-in 0.18s ease-out; }
  }
  @keyframes modal-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>
