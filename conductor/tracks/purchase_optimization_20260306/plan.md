# Implementation Plan: Purchase Optimization & Smart Alerts

## Phase 1: Tier Capacity & Purchase Guidance

- [x] Task: Extend Electricity Logic for Tier Capacity f3e477d
  - [x] Update `src/lib/electricity.ts` to calculate and expose the remaining kWh capacity in the user's current tier.
  - [x] Write unit tests to verify the tier capacity calculation handles edge cases (e.g., crossing multiple tiers).
- [x] Task: Purchase Calculator Integration bf4799d
  - [x] Update `src/components/PurchaseCalculator.tsx` to display a warning when the estimated purchase amount exceeds the current tier's capacity.
  - [x] Ensure the warning clearly states how much money to spend to stay within the cheaper tier.
- [x] Task: Add Purchase Form Integration b5c91eb
  - [x] Update `src/components/AddPurchaseForm.tsx` to dynamically show a tier capacity warning based on the inputted amount/units.
- [x] Task: Conductor - User Manual Verification 'Tier Capacity & Purchase Guidance' (Protocol in workflow.md)

## Phase 2: Estimation Staleness & Refill Analysis

- [x] Task: Implement Staleness Indicator UI fe29855
  - [x] Modify `src/components/ConsumptionStatsCard.tsx` to calculate the age of the `lastReadingDate`.
  - [x] Add a visual nudge (e.g., an alert icon or banner) if the reading is older than 7 days.
- [x] Task: Develop Refill Analysis Logic 5edfea2
  - [x] Update `src/hooks/usePurchase.tsx` or `src/lib/electricity.ts` to calculate the time (days) elapsed between consecutive purchases.
- [x] Task: Create Refill Analysis Chart Component 3f25675
  - [x] Create `src/components/RefillAnalysisChart.tsx` to visualize the time between refills using simple, responsive Tailwind CSS bars or a charting library.
  - [x] Integrate this component into `src/pages/Dashboard.tsx`.
- [x] Task: Conductor - User Manual Verification 'Estimation Staleness & Refill Analysis' (Protocol in workflow.md)

## Phase 3: Web Push Notifications for Low Balance

- [x] Task: Profile Settings for Push Notifications 3c5d228
  - [x] Update `profiles` schema in `convex/schema.ts` to include an optional `pushNotificationsEnabled` boolean and `pushSubscription` object.
  - [x] Update `src/pages/Settings.tsx` to include a toggle for enabling/disabling Push Notifications.
- [x] Task: PWA Push Subscription Service 4d5c45a
  - [x] Implement browser logic to request Notification permission from the user.
  - [x] Create a Convex mutation to save the user's Web Push subscription object to their profile.
- [x] Task: Low Balance Alert Trigger (Backend) 4d5c45a
  - [x] Implement a Convex action or cron job (`convex/alerts.ts`) that runs periodically to check if a user's estimated balance has fallen below their `lowBalanceThreshold`.
  - [x] Integrate a web push library (e.g., `web-push`) in the Convex backend to dispatch the notification to the stored subscription if the threshold is met and notifications are enabled.
- [x] Task: Conductor - User Manual Verification 'Web Push Notifications for Low Balance' (Protocol in workflow.md)
- [x] Task: Address User Feedback on UI and Graph visibility.
