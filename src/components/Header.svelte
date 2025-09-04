<script>
  let isMenuOpen = false;

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen;
    console.log('Button clicked! isMenuOpen:', isMenuOpen);  // Проверим, что выводится в консоль
  };
</script>

<button on:click={toggleMenu}>Toggle Menu</button>
<p>{isMenuOpen ? 'Menu is open' : 'Menu is closed'}</p>


<header class="bg-gray-800 p-4 text-white flex justify-between items-center">
  <h1 class="text-xl font-bold">Mutants Fan Site</h1>
  <button on:click={toggleMenu}>
    Мутанты ▾
  </button>

  <!-- Вывод состояния -->
  <div class="text-white mt-2">{isMenuOpen ? 'Menu is open' : 'Menu is closed'}</div>

  <!-- Меню отображается, если isMenuOpen == true -->
  {#if isMenuOpen}
    <ul class="absolute left-0 mt-2 bg-gray-800 text-white rounded shadow-lg z-20 w-48">
      <li><a href="/mutants" class="block px-4 py-2 hover:bg-gray-700">Обычные версии</a></li>
      <li><a href="/bronze" class="block px-4 py-2 hover:bg-gray-700">Бронзовые версии</a></li>
      <li><a href="/silver" class="block px-4 py-2 hover:bg-gray-700">Серебряные версии</a></li>
      <li><a href="/gold" class="block px-4 py-2 hover:bg-gray-700">Золотые версии</a></li>
      <li><a href="/platinum" class="block px-4 py-2 hover:bg-gray-700">Платиновые версии</a></li>
      <li><a href="/skins" class="block px-4 py-2 hover:bg-gray-700">Скины</a></li>
    </ul>
  {/if}
</header>

<style>
  button {
    cursor: pointer;
  }

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
    background-color: #333;
    color: white;
    width: 200px;
    display: block;
  }

  li a {
    display: block;
    padding: 8px;
    text-decoration: none;
    color: white;
  }

  li a:hover {
    background-color: #4A4A4A;
  }

  .relative {
    position: relative;
  }

  .absolute {
    position: absolute;
  }
</style>
