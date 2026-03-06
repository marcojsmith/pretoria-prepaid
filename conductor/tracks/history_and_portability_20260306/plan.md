# Implementation Plan: Historical Data Exploration and Portability

## Phase 1: History Page Refactoring (Infinite Scroll & Filtering)

- [ ] Task: Update `usePurchases` and `useConsumption` hooks for full data access.
  - [ ] Ensure `usePurchases` supports efficient access to all historical records (not just current month).
  - [ ] Add `fetchNextPage` or equivalent logic if needed for infinite scroll.
- [ ] Task: Implement Date Filter Component.
  - [ ] Write failing tests for filtering logic in `HistoryPage.test.tsx`.
  - [ ] Create `MonthYearFilter.tsx` component.
  - [ ] Implement filtering logic in `HistoryPage.tsx` to filter local state based on selection.
  - [ ] Verify tests pass.
- [ ] Task: Implement Infinite Scroll in `HistoryPage`.
  - [ ] Write failing tests for scrolling behavior.
  - [ ] Replace `visibleCount` logic with an intersection observer pattern for auto-loading.
  - [ ] Ensure smooth performance with many items.
  - [ ] Verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'History Page Refactoring' (Protocol in workflow.md)

## Phase 2: Data Portability (CSV & Print-to-PDF)

- [ ] Task: CSV Export Utility.
  - [ ] Write failing tests for CSV generation in `src/lib/utils.test.ts`.
  - [ ] Implement `generateCSV` helper in `src/lib/utils.ts`.
  - [ ] Verify tests pass.
- [ ] Task: Print-to-PDF Layout & Logic.
  - [ ] Create `@media print` CSS rules in `index.css` to hide nav/buttons and format tables.
  - [ ] Update `ExportPage.tsx` with "Download CSV" and "Print to PDF" actions.
  - [ ] Verify layout in browser print preview.
- [ ] Task: Conductor - User Manual Verification 'Data Portability' (Protocol in workflow.md)

## Phase 3: Yearly Analytics

- [ ] Task: Yearly Consumption Chart.
  - [ ] Write failing tests for yearly aggregation logic.
  - [ ] Create `YearlyConsumptionChart.tsx` using the custom Tailwind bar style.
  - [ ] Aggregate units by month for the current calendar year.
  - [ ] Integrate into `Dashboard.tsx`.
  - [ ] Verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'Yearly Analytics' (Protocol in workflow.md)
