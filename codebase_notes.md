# Codebase Notes

## Architecture

- **History & Portability**:
  - `HistoryPage` uses a unified filter state for both Purchases and Readings.
  - Infinite scroll implemented via `IntersectionObserver` in `PurchaseHistory` and `ReadingHistory`.
  - CSV Export uses `convertToCSV` and `downloadCSV` utilities in `src/lib/utils.ts`.
  - Print styles in `index.css` handle PDF generation by hiding UI elements and formatting tables.
- **Analytics**:
  - `YearlyConsumptionChart` provides monthly aggregation using Tailwind-based bars and Framer Motion.
  - Custom Select triggers for year switching.

## PWA & Service Worker

- **App Badge API**: Used to display the estimated electricity balance directly on the app icon when supported.
- **Custom InstallPrompt**: `InstallPrompt.tsx` handles the `beforeinstallprompt` event to provide a stylized, non-intrusive install experience.
- **Background Sync**: Service worker (`sw.ts`) handles background synchronization for failed purchase/reading logs.
- **InjectManifest Mode**: Custom service worker logic allows for fine-grained control over push notifications and precaching.

## Testing Standards

- **Target Coverage**: **97%** or higher for all new features.
- **Tools**: Vitest for unit/integration, Chrome DevTools MCP for E2E verification.
- **Mocking Strategy**:
  - `IntersectionObserver` mocked for infinite scroll tests.
  - `navigator.serviceWorker` and `navigator.setAppBadge` mocked for PWA feature tests.
  - `Clerk` and `Convex` hooks mocked for authentication and data fetching.

## Data Schema

- `purchases`: Fields `amountPaid`, `units`, `tierBreakdown` (with `label` and `units`).
- `meter_readings`: Field `reading`.
- Date format: ISO strings (YYYY-MM-DD) for consistency in sorting and filtering.
