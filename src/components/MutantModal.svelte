<script>
  // НИКАКИХ браузерных API во время SSR
  export let open = false;
  export let mutant = null;
  export let onClose = () => {};

  const IS_BROWSER = typeof window !== 'undefined';
  const safeClose = () => { if (typeof onClose === 'function') onClose(); };

  // Привяжем ESC только в браузере и только один раз
  let escBound = false;
  function bindEsc() {
    if (!IS_BROWSER || escBound) return;
    const handler = (e) => { if (e.key === 'Escape') safeClose(); };
    window.addEventListener('keydown', handler);
    escBound = true;
  }

  // Когда модалка открывается в браузере — вешаем ESC
  $: if (open) bindEsc();
</script>

{#if open && mutant}
<div class="overlay" on:click={(e)=>{ if (e.target === e.currentTarget) safeClose(); }}>
  <div class="panel">
    <header>
      <h3>{mutant.name ?? 'Безымянный'}</h3>
      <button class="close" on:click={safeClose}>✕</button>
    </header>

    <section class="grid">
      <div class="media">
        <slot name="image"></slot>
      </div>
      <div class="info">
        <ul>
          {#if mutant.id}<li><strong>ID:</strong> {mutant.id}</li>{/if}
          {#if mutant.tier}<li><strong>Тир:</strong> {mutant.tier}</li>{/if}
          {#if mutant.gene}<li><strong>Ген:</strong> {mutant.gene}</li>{/if}
          {#if mutant.type}<li><strong>Тип:</strong> {mutant.type}</li>{/if}
          {#if mutant.speed != null}<li><strong>Скорость:</strong> {mutant.speed}</li>{/if}
          {#if mutant.hp != null}<li><strong>ХП:</strong> {mutant.hp}</li>{/if}
          {#if mutant.attack != null}<li><strong>Атака:</strong> {mutant.attack}</li>{/if}
          {#if mutant.bingo}
            <li><strong>Бинго:</strong> {Array.isArray(mutant.bingo) ? mutant.bingo.join(', ') : String(mutant.bingo)}</li>
          {/if}
        </ul>
      </div>
    </section>
  </div>
</div>
{/if}

<style>
.overlay{ position:fixed; inset:0; background:rgba(0,0,0,.55); display:grid; place-items:center; z-index:50; }
.panel{
  width:min(980px, 92vw); max-height:90vh; overflow:auto;
  background:#0b0f14; border:1px solid #2b3646; border-radius:16px; box-shadow: 0 20px 50px rgba(0,0,0,.45);
  padding:14px;
}
header{ display:flex; justify-content:space-between; align-items:center; padding:6px 8px 12px; }
h3{ margin:0; font-size:1.25rem; color:#dbe6ff; }
.close{ background:#1a2230; border:1px solid #2b3646; border-radius:10px; padding:.35rem .6rem; color:#dbe6ff; cursor:pointer; }
.grid{ display:grid; grid-template-columns: 1.1fr 1fr; gap:12px; }
.media{ background:#0d1117; border:1px solid #263041; border-radius:12px; display:grid; place-items:center; padding:8px; }
.info ul{ list-style:none; margin:0; padding:0; display:grid; gap:6px; color:#c9d1d9; }
.info strong{ color:#9ec2ff; }

@media (max-width: 860px){
  .grid{ grid-template-columns: 1fr; }
}
</style>
