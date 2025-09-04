<header class="bg-gray-800 p-4 text-white flex justify-between items-center">
  <h1 class="text-xl font-bold">Mutants Fan Site</h1>
  <nav class="space-x-4">
    <a href="/" class="hover:text-green-400">Главная</a>
    <a href="/about" class="hover:text-green-400">О сайте</a>
  </nav>
</header>

<script>
  import { onMount } from 'svelte';

  let isMenuOpen = false;

  onMount(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        isMenuOpen = false;
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="relative inline-block">
  <button
    class="hover:text-green-400"
    on:click={() => { isMenuOpen = !isMenuOpen; }}>
    Мутанты ▾
  </button>
  <div
    class="absolute left-0 mt-2 bg-gray-800 text-white rounded shadow-lg z-10"
    class:hidden={!isMenuOpen ? 'hidden' : 'block'}>
    <a href="/mutants" class="block px-4 py-2 hover:bg-gray-700">Обычные версии</a>
    <a href="/bronze" class="block px-4 py-2 hover:bg-gray-700">Бронзовые версии</a>
    <a href="/silver" class="block px-4 py-2 hover:bg-gray-700">Серебряные версии</a>
    <a href="/gold" class="block px-4 py-2 hover:bg-gray-700">Золотые версии</a>
    <a href="/platinum" class="block px-4 py-2 hover:bg-gray-700">Платиновые версии</a>
    <a href="/skins" class="block px-4 py-2 hover:bg-gray-700">Скины</a>
  </div>
</div>
