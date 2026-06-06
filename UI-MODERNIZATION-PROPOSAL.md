# Դրամապանակ — UI Modernization Proposal
## Анализ текущего состояния и предложения по улучшению (2025-2026)

═══════════════════════════════════════════════════════════
1. ТЕКУЩЕЕ СОСТОЯНИЕ (ЧТО УЖЕ ХОРОШО)
═══════════════════════════════════════════════════════════

Проект уже имеет крепкий фундамент:
✓ oklch цветовая палитра (современный стандарт)
✓ shadcn/ui + Radix примитивы
✓ Motion (framer-motion) для анимаций
✓ Recharts для графиков
✓ Темная тема + акцентные темы (emerald/ocean/violet/rose/amber/teal)
✓ Privacy mode с блюром
✓ Command Palette (⌘K)
✓ AI Assistant + AI Insights
✓ Mobile FAB + Bottom Navigation
✓ Onboarding Wizard
✓ PWA поддержка

ВЫВОД: Не нужен рефакторинг. Нужен "polish" — точечные улучшения,
которые сделают интерфейс ощутимо более премиальным.

═══════════════════════════════════════════════════════════
2. ПРИОРИТЕТНЫЕ UI УЛУЧШЕНИЯ (от высокого к низкому)
═══════════════════════════════════════════════════════════

───────────────────────────────────────────────────────────
P0: BORDERLESS CARDS + MAGNETIC HOVER (Высокий импакт)
───────────────────────────────────────────────────────────

ПРОБЛЕМА: Карточки имеют видимую рамку (border) в покое.
Это выглядит "дешево" по стандартам 2025 года.

РЕШЕНИЕ:
• По умолчанию: border-transparent, shadow-none
• Hover: border-border/50, elevated shadow, легкий lift
• Magnetic tilt эффект при наведении мыши (desktop)

Файлы для изменения:
  src/components/ui/card.tsx
  src/components/shared/stat-card.tsx
  src/app/globals.css (добавить .card-modern утилиту)

CSS паттерн:
  .card-modern {
    border-color: transparent;
    box-shadow: none;
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .card-modern:hover {
    border-color: color-mix(in oklch, var(--border) 50%, transparent);
    box-shadow: 0 8px 32px -8px oklch(0.2 0.02 175 / 0.12);
    transform: translateY(-2px);
  }
  .dark .card-modern:hover {
    border-color: oklch(1 0 0 / 10%);
  }

Magnetic hover (JS):
  onMouseMove → вычислить позицию мыши относительно центра карточки
  → rotateX/rotateY через perspective(1000px)
  → плавный возврат в 0 при mouseLeave (0.4s transition)

ИМПАКТ: ★★★★★ — мгновенно делает UI "дороже"
СЛОЖНОСТЬ: Низкая (CSS-first, JS опционален)

───────────────────────────────────────────────────────────
P1: BENTO GRID DASHBOARD (Средний импакт)
───────────────────────────────────────────────────────────

ПРОБЛЕМА: Текущий dashboard — вертикальный стек карточек.
Это стандартно, но не использует пространство оптимально.

РЕШЕНИЕ: Асимметричная сетка (Bento Grid):
  ┌─────────────────────┬──────────┐
  │   Balance Hero      │ Savings  │
  │   (gradient card)   │ Rate     │
  ├──────────┬──────────┤ Ring     │
  │ Income   │ Expense  ├──────────┤
  │ StatCard │ StatCard │ Trend    │
  ├──────────┴──────────┤ Chart    │
  │   Category Donut    │          │
  └─────────────────────┴──────────┘

Grid template:
  grid-template-columns: repeat(12, 1fr)
  Balance Hero: col-span-8
  Savings Rate: col-span-4, row-span-2
  StatCards: col-span-4 each
  Trend Chart: col-span-8
  Donut: col-span-4

Файлы для изменения:
  src/app/(app)/page.tsx

ИМПАКТ: ★★★★☆ — более эффективное использование пространства
СЛОЖНОСТЬ: Средняя (перестройка grid layout)

───────────────────────────────────────────────────────────
P2: VIEW TRANSITIONS API (Премиум ощущение)
───────────────────────────────────────────────────────────

ПРОБЛЕМА: Переходы между страницами резкие.
Нет визуальной связи между элементами.

РЕШЕНИЕ:
• Баланс на дашборде → баланс в аналитике (shared element)
• Категория в списке → категория в деталях
• Плавная морфинг-анимация чисел при навигации

Реализация:
  style={{ viewTransitionName: `balance-hero` } as React.CSSProperties}

  CSS:
  ::view-transition-old(balance-hero),
  ::view-transition-new(balance-hero) {
    animation-duration: 0.4s;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }

Файлы для изменения:
  src/app/(app)/page.tsx
  src/app/(app)/analytics/page.tsx
  src/app/globals.css

ВАЖНО: View Transitions работают только в Chrome 111+.
Firefox/Safari gracefully degrade (без перехода).
React требует передачу через style cast, не как prop.

ИМПАКТ: ★★★★☆ — нативное app-like ощущение
СЛОЖНОСТЬ: Средняя

───────────────────────────────────────────────────────────
P3: EXPANDABLE SEARCH BAR (Desktop)
───────────────────────────────────────────────────────────

ПРОБЛЕМА: Поиск — отдельная кнопка в сайдбаре.
Требует клика для активации.

РЕШЕНИЕ: Always-visible input, который расширяется при фокусе:
  • Покой: compact pill с иконкой Search + "⌘K"
  • Focus-within: расширяется до полной ширины
  • Открывает CommandPalette при фокусе (readOnly input)

CSS:
  .search-expandable {
    width: 44px;
    transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .search-expandable:focus-within {
    width: 100%;
    border-color: color-mix(in oklch, var(--primary) 50%, transparent);
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 10%, transparent);
  }

Файлы для изменения:
  src/components/layout/app-shell.tsx (desktop sidebar search)

ИМПАКТ: ★★★☆☆ — улучшает discoverability
СЛОЖНОСТЬ: Низкая

───────────────────────────────────────────────────────────
P4: TYPOGRAPHY UPGRADES
───────────────────────────────────────────────────────────

РЕШЕНИЕ:
• text-wrap: balance для всех заголовков (предотвращает сирот)
• Gradient text для hero-заголовков (уже есть .text-gradient,
  но применяется только к имени — расширить на все h1)
• Увеличить контраст muted-foreground в dark mode
  (текущий 0.71 lightness → 0.75 для лучшей читаемости)

CSS:
  .text-balance { text-wrap: balance; }

Файлы для изменения:
  src/app/globals.css
  src/app/(app)/page.tsx (применить к greeting)
  src/components/shared/page-header.tsx

ИМПАКТ: ★★☆☆☆ — тонкое улучшение читаемости
СЛОЖНОСТЬ: Минимальная

───────────────────────────────────────────────────────────
P5: DARK MODE REFINEMENT
───────────────────────────────────────────────────────────

ПРОБЛЕМА: В dark mode карточки сливаются с фоном.
Недостаточно визуального разделения.

РЕШЕНИЕ:
• Добавить ambient glow под активными элементами:
  shadow-[0_0_20px_var(--primary)/0.15]
• Subtle gradient background вместо flat color:
  background: radial-gradient(ellipse at top, oklch(0.22 0.03 185), oklch(0.17 0.02 185))
• Border-white/10 на hover для всех card surfaces

Файлы для изменения:
  src/app/globals.css (.dark секция)

ИМПАКТ: ★★★☆☆ — глубина и атмосфера в dark mode
СЛОЖНОСТЬ: Низкая

───────────────────────────────────────────────────────────
P6: MICRO-INTERACTIONS & FEEDBACK
───────────────────────────────────────────────────────────

РЕШЕНИЕ:
• Haptic feedback (navigator.vibrate) на mobile при добавлении транзакции
• Success confetti/sparkle после достижения цели
• Skeleton shimmer → content fade-in (уже есть shimmer,
  добавить crossfade при появлении данных)
• Number counter animation (уже есть AnimatedNumber,
  но можно улучшить easing)
• Pull-to-refresh gesture на mobile

Файлы для изменения:
  src/components/shared/add-transaction-dialog.tsx
  src/components/shared/animated-number.tsx
  src/app/globals.css

ИМПАКТ: ★★☆☆☆ — polish, не функциональность
СЛОЖНОСТЬ: Средняя

═══════════════════════════════════════════════════════════
3. КРЕАТИВНЫЕ ФИЧИ (Дифференциация)
═══════════════════════════════════════════════════════════

───────────────────────────────────────────────────────────
C1: FINANCIAL HEALTH SCORE WIDGET
───────────────────────────────────────────────────────────

ИДЕЯ: Единый визуальный индикатор финансового здоровья.
Круговой прогресс-бар (0-100) с цветовой кодировкой:
  🟢 80-100: Отлично
  🟡 60-79: Хорошо
  🟠 40-59: Внимание
  🔴 0-39: Критично

Формула: savings_rate * 0.3 + budget_adherence * 0.3 +
         debt_ratio * 0.2 + goal_progress * 0.2

Расположение: Sidebar (desktop) или верх mobile header.
Постоянно виден, мотивирует.

───────────────────────────────────────────────────────────
C2: SPENDING HEATMAP (Calendar-style)
───────────────────────────────────────────────────────────

ИДЕЯ: GitHub-style heatmap для ежедневных расходов.
Каждая ячейка = день, интенсивность цвета = сумма.
Позволяет мгновенно увидеть паттерны.

Интеграция: Страница /calendar или виджет на dashboard.

───────────────────────────────────────────────────────────
C3: NATURAL LANGUAGE INPUT
───────────────────────────────────────────────────────────

ИДЕЯ: Вместо формы — текстовое поле:
  "Кофе 1500р сегодня" → автопарсинг → предзаполненная форма

Уже есть /api/ai-parse — нужно добавить inline UI
в AddTransactionDialog с toggle "Smart Input".

───────────────────────────────────────────────────────────
C4: WEEKLY DIGEST CARD
───────────────────────────────────────────────────────────

ИДЕЯ: Еженедельная сводка в стиле "Spotify Wrapped":
  "На этой неделе вы потратили на 12% меньше.
   Топ категория: Продукты (45%).
   Вы сэкономили 15,000֏!"

Показывать при входе в понедельник или по запросу.

═══════════════════════════════════════════════════════════
4. РЕКОМЕНДУЕМЫЙ ПОРЯДОК РАБОТЫ
═══════════════════════════════════════════════════════════

Фаза 1 (Quick Wins, 1-2 дня):
  → P0: Borderless Cards
  → P4: Typography (text-balance)
  → P5: Dark Mode Refinement

Фаза 2 (Core UX, 2-3 дня):
  → P1: Bento Grid Dashboard
  → P3: Expandable Search

Фаза 3 (Premium Feel, 2-3 дня):
  → P2: View Transitions
  → P6: Micro-interactions

Фаза 4 (Differentiation, 3-5 дней):
  → C1: Health Score
  → C3: Natural Language Input
  → C2/C4: Heatmap / Weekly Digest

═══════════════════════════════════════════════════════════
5. ТЕХНИЧЕСКИЕ ЗАМЕТКИ
═══════════════════════════════════════════════════════════

• Все изменения инкрементальные — не ломают существующий код
• CSS-first подход: минимум JS для визуальных эффектов
• Progressive enhancement: fallback для старых браузеров
• Motion library уже установлена — использовать для сложных анимаций
• oklch палитра позволяет легко создавать harmonious gradients
• Testing: проверять dark mode после каждого визуального изменения

═══════════════════════════════════════════════════════════
Готов начать реализацию любого из пунктов.
Какой приоритет реализовать первым?
═══════════════════════════════════════════════════════════
