# Specification: Historical Data Exploration and Portability

## Overview

Enable users to access, manage, and export their full electricity purchase and meter reading history. This track transforms the application into a long-term utility management companion by providing chronological depth and data portability.

## Functional Requirements

- **Infinite Scroll History**: The `HistoryPage` will load older purchase and reading records automatically as the user scrolls, moving away from the current "Current Month Only" restriction.
- **Date Filtering**: A new filter component on the `HistoryPage` allowing users to view records for a specific Month and Year.
- **CSV Export**: Ability to download the full purchase and reading history as a standard .csv file.
- **Print-to-PDF**: A print-optimized layout for history records triggered via a "Print/Save as PDF" button.
- **Yearly Analytics**: A "Year-at-a-Glance" chart on the Dashboard visualizing total monthly unit consumption for the current calendar year.

## Non-Functional Requirements

- **Lightweight Export**: Avoid heavy PDF generation libraries by using standard CSS print media queries.
- **Performance**: Ensure smooth scrolling and efficient filtering even with hundreds of historical records.

## Acceptance Criteria

- [ ] History logs can be scrolled back to the very first entry.
- [ ] Records can be filtered by month/year with an "All Time" option.
- [ ] CSV file is correctly formatted and includes all record fields.
- [ ] Print preview shows a clean, professional table of records without UI elements like headers/nav.
- [ ] Dashboard chart accurately aggregates units by month for the current year.

## Out of Scope

- Support for multiple meters (staying with single meter context for now).
- Advanced analytics like "Best Time to Buy" (reserved for a future track).
