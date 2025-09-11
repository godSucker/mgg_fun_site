<script>
  import { createEventDispatcher, onMount } from 'svelte';
  export let mutant; // { id, name, tier, gene, type, bingo, speed, hp, attack }
  const dispatch = createEventDispatcher();

  const TIER_SUFFIX = (t) => {
    const v = String(t ?? '').toLowerCase();
    if (v === 'platinum' || v === 'plat') return 'platinum';
    if (v === 'normal' || v === '') return 'normal';
    if (['bronze','silver','gold'].includes(v)) return v;
    return 'normal';
  };

  function baseCoreFromId(raw) {
    const noSpecimen = String(raw ?? '').trim().replace(/\s+/g,'_').replace(/^specimen[_-]*/i,'');
    const m = noSpecimen.match(/^(.*?)(?:_(normal|bronze|silver|gold|platinum|plat))?$/i);
    return (m ? m[1] : noSpecimen).toUpperCase();
  }

  // Собираем путь к полноразмерной текстуре
  const coreU = baseCoreFromId(mutant?.id);
  const coreL = coreU.toLowerCase();
  const suf   = TIER_SUFFIX(mutant?.tier);
  const imgSrc = `/textures_by_mutant/${coreL}/${coreU}_${suf}.png`;

  function handleLoad(ok) {
    // Сообщаем родителю (MutantsBrowser), чтобы он знал, у кого текстура есть
    dispatch('texture', { id: coreU, ok });
  }

  function open() {
    // Клик по карточке — открыть модалку
    dispatch('select', { id: mutant?.id });
  }

  // На всякий случай при монтировании отметим «неизвестно», пока не загрузится/не упадёт
  onMount(() => {
    // Ничего не диспатчим тут — ждём load/error от <img>
  });
</script>

<div class="card" on:click={open} title="Открыть">
  <div class="image">
    <img src={imgSrc} alt={mutant?.name ?? coreU}
         loading="lazy"
         on:load={() => handleLoad(true)}
         on:error={() => handleLoad(false)} />
  </div>
  <div class="body">
    <div class="name">{mutant?.name ?? 'Безымянный'}</div>
    <div class="meta">
      <span>Кодовое имя: <b>{coreU}</b></span>
      {#if mutant?.gene}<span>Ген: {mutant.gene}</span>{/if}
      {#if mutant?.speed != null}<span>Скорость: {mutant.speed}</span>{/if}
    </div>
  </div>
</div>

<style>
.card{
  display:flex; flex-direction:column; gap:8px;
  border:1px solid #2b3646; border-radius:14px; background:#0b0f14; padding:10px;
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
  cursor:pointer; will-change: transform;
}
.card:hover{ transform: translateY(-2px); background:#0f1520; box-shadow: 0 10px 24px rgba(0,0,0,.35); }
.image{ aspect-ratio: 1 / 1; display:grid; place-items:center; background:#0d1117; border:1px solid #263041; border-radius:10px; overflow:hidden; }
.image img{ width:100%; height:100%; object-fit:contain; image-rendering:auto; }
.body{ display:grid; gap:6px; }
.name{ color:#dbe6ff; font-weight:700; line-height:1.2; min-height:1.4em; }
.meta{ display:grid; gap:3px; color:#9fb5d4; font-size:.88rem; }
.meta b{ color:#cfe3ff; }
</style>
