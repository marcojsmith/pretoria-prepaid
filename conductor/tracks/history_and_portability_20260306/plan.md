# Implementation Plan: Historical Data Exploration and Portability

## Phase 1: History Page Refactoring (Infinite Scroll & Filtering)

- [x] Task: Update `usePurchases` and `useConsumption` hooks for full data access.
  - [x] Ensure `usePurchases` supports efficient access to all historical records (not just current month).
  - [x] Add `fetchNextPage` or equivalent logic if needed for infinite scroll.
- [x] Task: Implement Date Filter Component.
  - [x] Write failing tests for filtering logic in `HistoryPage.test.tsx`.
  - [x] Create `MonthYearFilter.tsx` component.
  - [x] Implement filtering logic in `HistoryPage.tsx` to filter local state based on selection.
  - [x] Verify tests pass.
- [x] Task: Implement Infinite Scroll in `HistoryPage`.
  - [x] Write failing tests for scrolling behavior.
  - [x] Replace `visibleCount` logic with an intersection observer pattern for auto-loading.
  - [x] Ensure smooth performance with many items.
  - [x] Verify tests pass.
- [x] Task: Conductor - User Manual Verification 'History Page Refactoring' (Protocol in workflow.md)

## Phase 2: Data Portability (CSV & Print-to-PDF)

- [x] Task: CSV Export Utility.
  - [x] Write failing tests for CSV generation in `src/lib/utils.test.ts`.
  - [x] Implement `generateCSV` helper in `src/lib/utils.ts`.
  - [x] Verify tests pass.
- [x] Task: Print-to-PDF Layout & Logic.
  - [x] Create `@media print` CSS rules in `index.css` to hide nav/buttons and format tables.
  - [x] Update `ExportPage.tsx` with "Download CSV" and "Print to PDF" actions.
  - [x] Verify layout in browser print preview.
- [x] Task: Conductor - User Manual Verification 'Data Portability' (Protocol in workflow.md)

## Phase 3: Yearly Analytics

- [x] Task: Yearly Consumption Chart.
  - [x] Write failing tests for yearly aggregation logic.
  - [x] Create `YearlyConsumptionChart.tsx` using the custom Tailwind bar style.
  - [x] Aggregate units by month for the current calendar year.
  - [x] Integrate into `Dashboard.tsx`.
  - [x] Verify tests pass.

- [x] Task: Conductor - User Manual Verification 'Yearly Analytics' (Protocol in workflow.md)

- [x] Task: Refactor History UI and add CSV Import.
  - [x] Move filters underneath the purchase form.
  - [x] Make filters collapsible.
  - [x] Remove grey background from filters card.
  - [x] Implement CSV import functionality in `ExportPage.tsx`.
  - [x] Verify import works with manual unit cost calculation.
