# Список измененных файлов для мобильной адаптации

## Измененные файлы

1. **src/layouts/BaseLayout.astro**
   - Добавлено гамбургер-меню для мобильных
   - Реализовано выдвижное боковое меню
   - Добавлены media queries для адаптивности
   - JavaScript для управления меню

2. **src/pages/index.astro**
   - Адаптивная hero секция
   - Вертикальное расположение кнопок на мобильных
   - Оптимизированные размеры шрифтов

3. **src/components/CardGrid.astro**
   - Адаптивная сетка (1 колонка → 2 колонки → auto)
   - Оптимизированные отступы

4. **src/components/Card.astro**
   - Адаптивные размеры padding и шрифтов
   - Оптимизированные иконки
   - Touch-friendly active states

## Новые файлы (опционально)

- vite.config.js - обновлен allowedHosts
- astro.config.ts - обновлен allowedHosts

## Тестирование

Протестировано на:
- iPhone 12 Pro (390x844)
- Различные размеры viewport
- Desktop, Tablet, Mobile

Все страницы работают корректно!
