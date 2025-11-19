<script lang="ts">
  export let players: { rank: number; name: string; level: number; id: string; tandem: string; atk1: string; atk2: string; socials: any[] }[] = [];
  export let mutantsDb: any[] = [];

  let query = '';
  let displayCount = 50;
  let selectedPlayer: any = null;

  $: filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  $: visiblePlayers = filteredPlayers.slice(0, displayCount);

  function loadMore() { displayCount += 50; }

  function getRankIcon(rank: number) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }

  function getRankClass(rank: number) {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return 'rank-normal';
  }

  // --- ПОИСК КАРТИНКИ И СКОРОСТИ ---
  function findMutantVisuals(mutantName: string) {
    if (!mutantName || mutantName === 'undefined') return null;
    const clean = mutantName.trim().toLowerCase();

    const stopWords = ['отключен', 'нет', '—', '-', '?', 'none', 'off', 'disabled', '—','Низкое Эво для тандема'];
    if (stopWords.includes(clean) || stopWords.some(s => clean === s)) {
      return { isDisabled: true };
    }

    // Ищем в базе только ради картинки и скорости
    const found = mutantsDb.find(m => m.name.toLowerCase() === clean)
               || mutantsDb.find(m => m.name.toLowerCase().includes(clean));

    if (!found) return null;

    let image = '';
    if (Array.isArray(found.image)) {
      image = found.image.find((img: string) => img.includes('specimen') || img.includes('portrait')) || found.image[0];
    } else {
      image = found.image;
    }
    if (image && image.startsWith('/')) image = image.substring(1);

    // Достаем скорость из базы
    const speed = Number(found.base_stats?.speed_base ?? found.base_stats?.lvl30?.spd ?? found.speed ?? 0);

    return {
      isDisabled: false,
      name: found.name,
      image: image ? `/${image}` : null,
      speed: Math.round(speed * 100) / 100 // Округляем скорость
    };
  }

  function openPlayer(player: any) {
    const mutantData = findMutantVisuals(player.tandem);
    selectedPlayer = { ...player, mutantData };
  }

  function closePlayer() {
    selectedPlayer = null;
  }
</script>

<!-- БАННЕР -->
<div class="cta-banner">
  <a href="https://t.me/absolutely_poxuy" target="_blank" rel="noopener noreferrer">
    <span class="cta-icon">🚀</span>
    <span class="cta-text">
      Хочешь попасть в ТОП?
      <span class="cta-link">Напиши сюда (ТЫК)</span>
    </span>
  </a>
</div>

<div class="leaderboard-container">
  <div class="search-bar">
    <div class="search-icon">🔍</div>
    <input type="text" placeholder="Найти игрока..." bind:value={query} />
  </div>

  <div class="list">
    <div class="list-header mobile-hidden">
      <span class="col-rank">Ранг</span>
      <span class="col-name">Игрок</span>
      <span class="col-tandem">Тандем</span>
      <span class="col-lvl">Уровень Эво</span>
    </div>

    {#each visiblePlayers as player (player.id)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="row {getRankClass(player.rank)}"
        on:click={() => openPlayer(player)}
        role="button"
        tabindex="0"
      >
        <div class="cell rank">
          <div class="rank-badge">{getRankIcon(player.rank)}</div>
        </div>
        <div class="cell name">
          {player.name}
        </div>
        <div class="cell tandem mobile-hidden">
          {player.tandem || '—'}
        </div>
        <div class="cell level">
          <span class="lvl-label mobile-only">Evo:</span>
          <span class="lvl-value">{player.level}</span>
        </div>
      </div>
    {/each}

    {#if filteredPlayers.length === 0}
      <div class="empty-state">Игроки не найдены...</div>
    {/if}
  </div>

  {#if visiblePlayers.length < filteredPlayers.length}
    <button class="load-more" on:click={loadMore}>Показать еще</button>
  {/if}
</div>

<!-- МОДАЛЬНОЕ ОКНО -->
{#if selectedPlayer}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-overlay" on:click={closePlayer} role="button" tabindex="0">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="modal-card {getRankClass(selectedPlayer.rank)}" on:click|stopPropagation role="presentation">
      <button class="modal-close" on:click={closePlayer}>×</button>

      <div class="modal-header">
        <div class="modal-rank">{getRankIcon(selectedPlayer.rank)}</div>
        <h2 class="modal-name">{selectedPlayer.name}</h2>
        <div class="modal-level">Evo Lvl: <span>{selectedPlayer.level}</span></div>
      </div>

      <div class="modal-divider"></div>

      {#if selectedPlayer.mutantData}

        {#if selectedPlayer.mutantData.isDisabled}
          <div class="tandem-section">
            <h3 class="sad-title">Тандем отключен</h3>
            <div class="mutant-preview sad-preview">
              <img src="/avatars/sad_emoji.gif" alt="Sad" class="sad-icon" />
            </div>
            <p class="sad-text">У этого игрока нет активного тандема.</p>
          </div>
        {:else}
          <div class="tandem-section">
            <h3>Тандем: <span class="tandem-name">{selectedPlayer.mutantData.name}</span></h3>

            <div class="mutant-preview">
              {#if selectedPlayer.mutantData.image}
                <img src={selectedPlayer.mutantData.image} alt={selectedPlayer.mutantData.name} />
              {:else}
                <div class="no-image">?</div>
              {/if}
            </div>

            <div class="mutant-stats">
              <!-- АТАКА 1 (Из таблицы) -->
              <div class="stat-row">
                <span class="stat-label">⚔️ ATK 1</span>
                <span class="stat-val">{selectedPlayer.atk1}</span>
              </div>
              <!-- АТАКА 2 (Из таблицы) -->
              <div class="stat-row">
                <span class="stat-label">⚔️ ATK 2</span>
                <span class="stat-val">{selectedPlayer.atk2}</span>
              </div>
              <!-- СКОРОСТЬ (Из базы) -->
              <div class="stat-row">
                <span class="stat-label">⚡ SPD</span>
                <span class="stat-val">{selectedPlayer.mutantData.speed}</span>
              </div>
            </div>
          </div>
        {/if}

      {:else}
        <div class="no-tandem">
          <p>Мутант "{selectedPlayer.tandem}" не найден в базе.</p>
        </div>
      {/if}

      {#if selectedPlayer.socials && selectedPlayer.socials.length > 0}
        <div class="socials-section">
          <div class="socials-header">Соц. сети игрока</div>
          <div class="socials-grid">
            {#each selectedPlayer.socials as social}
              <a href={social.url} target="_blank" rel="noopener noreferrer" class="social-btn {social.type}">
                <div class="btn-content">
                  <span class="btn-icon">
                    {#if social.type === 'tg'}✈️
                    {:else if social.type === 'vk'}vk
                    {:else if social.type === 'fb'}f
                    {:else}🔗{/if}
                  </span>
                  <span class="btn-label">{social.label}</span>
                </div>
                <span class="btn-arrow">→</span>
              </a>
            {/each}
          </div>
        </div>
      {/if}

    </div>
  </div>
{/if}

<style>
  /* СТИЛИ ОСТАЮТСЯ ТЕМИ ЖЕ, ИХ НЕ МЕНЯЕМ */
  .cta-banner { max-width: 800px; margin: 0 auto 2rem; text-align: center; }
  .cta-banner a { display: inline-flex; align-items: center; gap: 0.75rem; background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15)); border: 1px solid rgba(147, 51, 234, 0.3); padding: 0.8rem 1.5rem; border-radius: 16px; text-decoration: none; color: #e2e8f0; font-size: 0.95rem; transition: transform 0.2s, box-shadow 0.2s; }
  .cta-banner a:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(147, 51, 234, 0.2); border-color: rgba(147, 51, 234, 0.6); }
  .cta-link { color: #38bdf8; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; }

  .leaderboard-container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
  .search-bar { position: relative; width: 100%; margin-bottom: 0.5rem; }
  .search-bar input { width: 100%; padding: 14px 16px 14px 48px; border-radius: 16px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; font-size: 1rem; outline: none; transition: all 0.2s; box-sizing: border-box; }
  .search-bar input:focus { background: rgba(30, 41, 59, 0.9); border-color: #3b82f6; }
  .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); opacity: 0.5; }

  .list { display: flex; flex-direction: column; gap: 0.75rem; }
  .list-header { display: grid; grid-template-columns: 60px 1.5fr 1fr 100px; padding: 0 1.5rem; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .col-lvl { text-align: right; }

  .row { display: grid; grid-template-columns: 60px 1.5fr 1fr 100px; align-items: center; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 1rem 1.5rem; transition: transform 0.2s, background 0.2s; cursor: pointer; }
  .row:hover { background: rgba(30, 41, 59, 0.8); transform: scale(1.01); }

  .rank-gold { background: linear-gradient(90deg, rgba(234, 179, 8, 0.15), rgba(30, 41, 59, 0.4)); border-color: rgba(234, 179, 8, 0.5); }
  .rank-silver { background: linear-gradient(90deg, rgba(148, 163, 184, 0.15), rgba(30, 41, 59, 0.4)); border-color: rgba(148, 163, 184, 0.5); }
  .rank-bronze { background: linear-gradient(90deg, rgba(217, 119, 6, 0.15), rgba(30, 41, 59, 0.4)); border-color: rgba(217, 119, 6, 0.5); }

  .cell.rank { font-weight: 800; font-size: 1.2rem; color: #64748b; }
  .rank-gold .cell.rank { color: #facc15; }
  .rank-silver .cell.rank { color: #e2e8f0; }
  .rank-bronze .cell.rank { color: #fbbf24; }

  .cell.name { font-weight: 600; color: #f1f5f9; font-size: 1.05rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cell.tandem { color: #94a3b8; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cell.level { text-align: right; font-family: monospace; font-size: 1.2rem; font-weight: 700; color: #38bdf8; }

  .load-more { width: 100%; padding: 1rem; border-radius: 16px; background: rgba(255,255,255,0.05); border: none; color: #94a3b8; cursor: pointer; font-weight: 600; }
  .load-more:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .empty-state { text-align: center; padding: 3rem; color: #64748b; }

  /* MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .modal-card { background: #1e293b; width: 100%; max-width: 400px; border-radius: 24px; padding: 2rem; position: relative; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); border: 1px solid rgba(255,255,255,0.1); animation: popIn 0.2s ease-out; }
  @keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

  .modal-close { position: absolute; top: 1rem; right: 1rem; background: transparent; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer; }
  .modal-header { text-align: center; }
  .modal-rank { font-size: 2rem; margin-bottom: 0.5rem; }
  .modal-name { font-size: 1.5rem; color: #fff; margin: 0; }
  .modal-level { color: #38bdf8; font-weight: 700; font-size: 1.1rem; margin-top: 0.25rem; }
  .modal-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 1.5rem 0; }

  .tandem-section { text-align: center; }
  .tandem-section h3 { color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 1rem; }
  .tandem-name { color: #fff; font-weight: 700; }

  .mutant-preview { width: 140px; height: 140px; margin: 0 auto 1.5rem; border-radius: 20px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); }
  .mutant-preview img { max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5)); }
  .no-image { font-size: 2rem; color: #475569; }

  .mutant-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 12px; }
  .stat-row { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
  .stat-label { font-size: 0.7rem; color: #94a3b8; }
  .stat-val { color: #fff; font-weight: 700; font-size: 0.95rem; }

  .no-tandem { text-align: center; color: #64748b; font-style: italic; }

  /* SAD MODE */
  .sad-title { color: #f87171; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 0.05em; margin-bottom: 1rem; text-align: center; }
  .sad-preview { border-color: rgba(248, 113, 113, 0.3); background: rgba(248, 113, 113, 0.05); }
  .sad-icon { width: 64px !important; height: 64px !important; opacity: 0.8; }
  .sad-text { text-align: center; color: #94a3b8; font-size: 0.9rem; font-style: italic; }

  /* SOCIALS */
  .socials-section { margin-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; }
  .socials-header { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.75rem; text-align: center; }
  .socials-grid { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
  .social-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; padding: 0.9rem 1.2rem; border-radius: 14px; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: transform 0.2s, filter 0.2s; color: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .social-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
  .btn-content { display: flex; align-items: center; gap: 0.75rem; }
  .btn-icon { font-size: 1.1rem; width: 24px; text-align: center; }
  .btn-arrow { opacity: 0.6; font-weight: 400; }
  .social-btn.fb { background: #1877f2; }
  .social-btn.vk { background: #0077ff; }
  .social-btn.tg { background: #24A1DE; }
  .social-btn.link { background: #475569; }

  /* MOBILE */
  .mobile-only { display: none; }
  @media (max-width: 640px) {
    .mobile-hidden { display: none; }
    .mobile-only { display: inline; }
    .row { display: flex; gap: 1rem; padding: 0.75rem 1rem; }
    .cell.rank { width: 40px; font-size: 1rem; }
    .cell.name { flex: 1; }
    .cell.level { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
    .lvl-label { font-size: 0.65rem; color: #64748b; margin-bottom: 2px; }
  }
</style>
