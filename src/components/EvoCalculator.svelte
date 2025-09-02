<script>
  import mutants from "../data/mutants.json";

  let selectedId = mutants[0].id;
  let fromStage = 1;
  let toStage = 2;
  let result = null;

  function calculate() {
    const mutant = mutants.find(m => m.id === selectedId);
    let totalCoins = 0;
    let totalShards = 0;

    mutant.evo.forEach(stage => {
      if (stage.stage > fromStage && stage.stage <= toStage) {
        totalCoins += stage.req.coins;
        totalShards += stage.req.shards;
      }
    });

    result = { coins: totalCoins, shards: totalShards };
  }
</script>

<div class="p-4 rounded-2xl bg-gray-800 text-white shadow-xl max-w-md mx-auto">
  <h2 class="text-xl font-bold mb-2">Эво калькулятор</h2>

  <label class="block mb-2">
    <span class="text-sm">Выбери мутанта</span>
    <select bind:value={selectedId} class="w-full bg-gray-700 p-2 rounded">
      {#each mutants as m}
        <option value={m.id}>{m.name}</option>
      {/each}
    </select>
  </label>

  <div class="flex gap-2 my-2">
    <input type="number" min="1" max="5" bind:value={fromStage} class="w-1/2 bg-gray-700 p-2 rounded" placeholder="От стадии" />
    <input type="number" min="1" max="5" bind:value={toStage} class="w-1/2 bg-gray-700 p-2 rounded" placeholder="До стадии" />
  </div>

  <button on:click={calculate} class="w-full py-2 mt-2 bg-green-600 hover:bg-green-500 rounded-xl">
    Рассчитать
  </button>

  {#if result}
    <div class="mt-4 p-2 bg-gray-700 rounded">
      <p>Монеты: <strong>{result.coins}</strong></p>
      <p>Осколки: <strong>{result.shards}</strong></p>
    </div>
  {/if}
</div>

