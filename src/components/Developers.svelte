<script lang="ts">
  const teamMembers = [
    {
      name: "がらんの画眉丸",
      role: "Основатель & Главный разработчик",
      desc: "Каждый баг на сайте лежит на его совести(ее нет). По поводу найденных багов, предложений и пожеланий обращаться в телеграмм",
      color: "platinum",
      avatar: "avatars/my_avatar.jpg",
      socials: [
        { name: "Telegram", url: "https://t.me/absolutely_poxuy" },
        { name: "GitHub", url: "https://github.com/godSucker" }
      ]
    },
    {
      name: "Евгений aka DonutSafe",
      role: "Спонсор и хранитель проекта",
      desc: "Настоящий архивариус информации и генератор идей, помогал на каждой стадии разработки, так же занимается донатом в игры(MGG, Genshin etc)",
      color: "blue",
      avatar: "avatars/jenya_avatar.jpg",
      socials: [
        { name: "Telegram", url: "https://t.me/Donut_Safe" },
        { name: "ВК", url: "https://vk.com/id187030288" }
      ]
    },
    {
      name: "imashio",
      role: "Разработчик базовых версий симуляторов",
      desc: "Помогал в разработке каждого симулятора на этом сайте и невероятный трудяга",
      color: "gold",
      avatar: "avatars/blind_avatar.jpg",
      socials: [
        { name: "Telegram", url: "https://t.me/blindpain" }
      ]
    },
    {
      name: "ミーギー",
      role: "Контрибьютор",
      desc: "Невероятный мотиватор и просто хороший человек",
      color: "purple",
      avatar: "avatars/mege_avatar.jpg",
      socials: [
        { name: "Telegram", url: "https://t.me/meeggee" }
      ]
    },
    {
      name: "Ctrl+C Ctrl + V Master",
      role: "Контрибьютор",
      desc: "Оттарабанил клавиатуру во все щелочки между клавишами, чтобы работа сайта началась как можно скорее",
      color: "green",
      avatar: "avatars/german_avatar.jpg",
      socials: [
      ]
    },
    {
      name: "Егор",
      role: "Один из ведущих бета-тестеров",
      desc: "Человек который доскольно проверял сайт и просто хороший помощник ",
      color: "red",
      avatar: "avatars/egor_avatar.jpg",
      socials: [
        { name: "Telegram", url: "https://t.me/+79014144308" }
      ]
    },
  ];

  // Цвета для рангов (как в игре)
  const colors = {
    gold: "linear-gradient(135deg, #fbbf24, #d97706)",
    platinum: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
    purple: "linear-gradient(135deg, #c084fc, #7c3aed)",
    blue: "linear-gradient(135deg, #38bdf8, #2563eb)",
    green: "linear-gradient(135deg, #4ade80, #059669)",
    red: "linear-gradient(135deg, #f87171, #dc2626)",
  };

  const glowColors = {
    gold: "rgba(251, 191, 36, 0.5)",
    platinum: "rgba(226, 232, 240, 0.5)",
    purple: "rgba(167, 139, 250, 0.5)",
    blue: "rgba(56, 189, 248, 0.5)",
    green: "rgba(74, 222, 128, 0.5)",
    red: "rgba(248, 113, 113, 0.5)",
  };
</script>

<div class="dev-container">
  <header class="hero">
    <span class="badge">Команда проекта</span>
    <h1>Архивариусы</h1>
    <p>Люди, благодаря которым существует библиотека архивариуса.</p>
  </header>

  <div class="grid">
    {#each teamMembers as member}
      <div
        class="card"
        style:--border-gradient={colors[member.color] || colors.blue}
        style:--glow-color={glowColors[member.color] || glowColors.blue}
      >
        <div class="card-content">
          <div class="avatar-wrapper">
            {#if member.avatar}
              <img src={member.avatar} alt={member.name} class="avatar" />
            {:else}
              <div class="avatar-placeholder">{member.name[0]}</div>
            {/if}
            <div class="rank-badge" style:background={colors[member.color] || colors.blue}></div>
          </div>

          <div class="info">
            <div class="role">{member.role}</div>
            <h3 class="name">{member.name}</h3>
            {#if member.desc}
              <p class="desc">{member.desc}</p>
            {/if}
          </div>

          {#if member.socials.length > 0}
            <div class="socials">
              {#each member.socials as link}
                <a href={link.url} target="_blank" rel="noopener noreferrer" class="social-link">
                  {link.name} ↗
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .dev-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  /* --- HERO --- */
  .hero {
    text-align: center;
    margin-bottom: 4rem;
  }

  .badge {
    display: inline-block;
    padding: 0.4rem 1rem;
    border-radius: 99px;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: #60a5fa;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
    font-weight: 600;
    font-family: "TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }

  h1 {
    font-size: clamp(2.5rem, 5vw, 4rem);
    margin: 0 0 1rem;
    background: linear-gradient(to right, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 800;
    font-family: "TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }

  p {
    color: #e2e8f0;
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
    font-weight: 500;
    font-family: "TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }

  /* --- GRID --- */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    justify-items: center; /* Центрируем элементы сетки */
  }

  @media (max-width: 768px) {
    .grid {
      gap: 1.5rem; /* Уменьшаем отступ между карточками на мобилках */
      grid-template-columns: 1fr; /* Одна колонка на мобилках */
    }

    .card {
      max-width: 320px; /* Ограничиваем максимальную ширину карточки на мобилках */
      width: 100%;
    }

    .dev-container {
      padding: 1rem 0.5rem;
    }
  }

  /* --- CARD --- */
  .card {
    position: relative;
    background: rgba(30, 41, 59, 0.4);
    border-radius: var(--radius-xl);
    padding: 2px; /* Space for gradient border */
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .card::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: var(--radius-xl);
    padding: 2px;
    background: var(--border-gradient);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.5;
    pointer-events: none;
  }

  .card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px -10px var(--glow-color);
  }

  .card:hover::before {
    opacity: 1;
  }

  .card-content {
    background: #1e293b;
    border-radius: var(--radius-xl);
    padding: 2rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  /* --- AVATAR --- */
  .avatar-wrapper {
    position: relative;
    margin-bottom: 1.5rem;
  }

  .avatar, .avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #0f172a;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.1);
  }

  .avatar-placeholder {
    background: #334155;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 700;
    color: #94a3b8;
    font-family: "TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }

  .rank-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid #1e293b;
    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  }

  /* --- INFO --- */
  .role {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #94a3b8;
    margin-bottom: 0.5rem;
    font-weight: 700;
    font-family: "TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }

  .name {
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    color: #fff;
    font-family: "TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }

  .desc {
    font-size: 0.9rem;
    color: #cbd5f5;
    line-height: 1.5;
    margin: 0 0 1.5rem;
    font-family: "TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }

  /* --- SOCIALS --- */
  .socials {
    margin-top: auto;
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .social-link {
    font-size: 0.8rem;
    color: #fff;
    background: rgba(255,255,255,0.05);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    text-decoration: none;
    transition: background 0.2s;
    border: 1px solid rgba(255,255,255,0.05);
    font-family: "TT Supermolot Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  }

  .social-link:hover {
    background: rgba(255,255,255,0.15);
  }
</style>
