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

## Testing Patterns

- **IntersectionObserver Mocking**: Global mock in `vitest.setup.ts` to support infinite scroll testing.
- **Radix UI Mocking**: Mocking `Tabs` components in tests (e.g., `ExportPage.test.tsx`) avoids JSDOM rendering issues with Radix's lazy loading and presence logic.
- **CSV Mocking**: Mocking `URL.createObjectURL` and `Blob` for utility tests.

## Data Schema

- `purchases`: Fields `amountPaid`, `units`, `tierBreakdown` (with `label` and `units`).
- `meter_readings`: Field `reading`.
- Date format: ISO strings (YYYY-MM-DD) for consistency in sorting and filtering.
