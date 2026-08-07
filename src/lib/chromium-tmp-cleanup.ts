import fs from 'fs/promises'
import path from 'path'

// Playwright создаёт свежий --user-data-dir на КАЖДЫЙ chromium.launch()
// (видно в Vercel-логах как /tmp/playwright_chromiumdev_profile-XXXXXX) и
// удаляет его при штатном browser.close(). Если запрос падает ДО close()
// (ошибка ресурсов, таймаут) - профиль остаётся сиротой. Контейнер Vercel
// живёт warm между вызовами, /tmp у него - tmpfs фиксированного размера, так
// что несколько таких сирот за сессию интенсивного тестирования (2026-08-07 -
// один "живой прогон" уронил ВСЕ скриншот-эндпоинты сразу, включая давно
// работавший screenshot-bingo) забивают его до нуля свободного места -
// новый Chromium не может выделить shared memory и падает на старте.
// Подметаем перед КАЖДЫМ launch, не полагаясь только на finally-close.
export async function cleanupStalePlaywrightProfiles(): Promise<void> {
  try {
    const entries = await fs.readdir('/tmp')
    await Promise.all(
      entries
        .filter((f) => f.startsWith('playwright_chromiumdev_profile-'))
        .map((f) => fs.rm(path.join('/tmp', f), { recursive: true, force: true }).catch(() => {})),
    )
  } catch {
    // /tmp недоступен/пуст - нечего убирать
  }
}
