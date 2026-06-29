<script lang="ts">
  import { textureUrl } from '@/lib/texture-cdn';

  let { id = '', name = '', variant = 'normal', tier = null, type = '' } = $props()

  function normalizeId(raw: string): string {
    if (!raw) return ''
    let s = String(raw).trim()
    s = s.replace(/^specimen[_-]/i, '')
    s = s.replace(/_(normal|bronze|silver|gold|platinum)$/i, '')
    s = s.replace(/_(plat|platinum)$/i, '')
    return s
  }

  const base = $derived(normalizeId(id))
  const folder = $derived(base.toLowerCase())

  const SUFFIX: Record<string, string> = { normal:'normal', bronze:'bronze', silver:'silver', gold:'gold', platinum:'platinum' }
  const RUS: Record<string, string> = { normal:'Обычный', bronze:'Бронза', silver:'Серебро', gold:'Золото', platinum:'Платина' }
  const suffix = $derived(SUFFIX[variant] ?? 'normal')
  const rarityLabel = $derived(RUS[variant] ?? '—')

  let srcExt = $state('webp')

  function buildSpecimenSrc(): string {
    const specSuffix = suffix === 'normal' ? '' : `_${suffix}`
    return textureUrl(`textures_by_mutant/${folder}/thumb_specimen_${folder}${specSuffix}.${srcExt}`)
  }

  const specimenSrc = $derived(buildSpecimenSrc())

  let imgSrc = $state(specimenSrc)
  let triedJpg = $state(false)
  let broken = $state(false)

  function onError() {
    if (!triedJpg) {
      triedJpg = true
      srcExt = 'jpg'
      imgSrc = textureUrl(`textures_by_mutant/${folder}/specimen_${folder}${suffix === 'normal' ? '' : `_${suffix}`}.jpg`)
    } else {
      broken = true
    }
  }

  let cardEl: HTMLDivElement
  let rx = $state(0), ry = $state(0), glowX = $state(50), glowY = $state(50)
  function onMove(e: MouseEvent) {
    const r = cardEl.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const mx = r.width / 2, my = r.height / 2
    ry = ((x - mx) / mx) * 6
    rx = (-(y - my) / my) * 5
    glowX = (x / r.width) * 100
    glowY = (y / r.height) * 100
  }
  function onLeave() { rx = 0; ry = 0; glowX = 50; glowY = 50 }
</script>

<div class="relative" style="perspective: 1000px;">
  <div
    bind:this={cardEl}
    onmousemove={onMove}
    onmouseleave={onLeave}
    class="group relative overflow-hidden rounded-2xl border border-slate-700/70
           bg-gradient-to-b from-slate-900/80 to-slate-900/60
           shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)]
           transition-transform duration-150 will-change-transform"
    style="transform: rotateX({rx}deg) rotateY({ry}deg); transform-style: preserve-3d;"
  >
    <div
      class="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      style="background: radial-gradient(600px circle at {glowX}% {glowY}%, rgba(56,189,248,0.15), transparent 40%);"
    />

    {#if tier != null}
      <div class="absolute left-2 top-2 z-20" style="transform: translateZ(24px);">
        <span class="inline-flex items-center rounded-md border border-amber-500/40 bg-amber-400/15
                     px-2 py-0.5 text-[11px] font-bold text-amber-200/90 shadow-sm">
          {tier}+
        </span>
      </div>
    {/if}

    <div class="relative w-full aspect-square p-2" style="transform: translateZ(18px);">
      {#if !broken}
        <img
          src={imgSrc}
          alt={`Текстура ${name || id}`}
          class="h-full w-full object-contain drop-shadow-[0_6px_28px_rgba(0,0,0,0.45)]"
          loading="lazy"
          decoding="async"
          onerror={onError}
        />
      {:else}
        <div class="flex h-full w-full items-center justify-center bg-slate-950/40 text-sky-300/80 text-xs">
          нет текстуры
        </div>
      {/if}
    </div>

    <div class="px-3 pb-3 -mt-0.5" style="transform: translateZ(20px);">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-[1rem] leading-tight font-extrabold text-sky-50 break-words">{name || 'Безымянный'}</h3>
        <span class="rounded-full border border-sky-700/50 bg-sky-900/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-sky-200/90">
          {rarityLabel}
        </span>
      </div>
    </div>
  </div>
</div>
