# Implementation Plan: Purchase Optimization & Smart Alerts

## Phase 1: Tier Capacity & Purchase Guidance

- [ ] Task: Extend Electricity Logic for Tier Capacity
  - [ ] Update `src/lib/electricity.ts` to calculate and expose the remaining kWh capacity in the user's current tier.
  - [ ] Write unit tests to verify the tier capacity calculation handles edge cases (e.g., crossing multiple tiers).
- [ ] Task: Purchase Calculator Integration
  - [ ] Update `src/components/PurchaseCalculator.tsx` to display a warning when the estimated purchase amount exceeds the current tier's capacity.
  - [ ] Ensure the warning clearly states how much money to spend to stay within the cheaper tier.
- [ ] Task: Add Purchase Form Integration
  - [ ] Update `src/components/AddPurchaseForm.tsx` to dynamically show a tier capacity warning based on the inputted amount/units.
- [ ] Task: Conductor - User Manual Verification 'Tier Capacity & Purchase Guidance' (Protocol in workflow.md)

## Phase 2: Estimation Staleness & Refill Analysis

- [ ] Task: Implement Staleness Indicator UI
  - [ ] Modify `src/components/ConsumptionStatsCard.tsx` to calculate the age of the `lastReadingDate`.
  - [ ] Add a visual nudge (e.g., an alert icon or banner) if the reading is older than 7 days.
- [ ] Task: Develop Refill Analysis Logic
  - [ ] Update `src/hooks/usePurchase.tsx` or `src/lib/electricity.ts` to calculate the time (days) elapsed between consecutive purchases.
- [ ] Task: Create Refill Analysis Chart Component
  - [ ] Create `src/components/RefillAnalysisChart.tsx` to visualize the time between refills using simple, responsive Tailwind CSS bars or a charting library.
  - [ ] Integrate this component into `src/pages/Dashboard.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Estimation Staleness & Refill Analysis' (Protocol in workflow.md)

## Phase 3: Web Push Notifications for Low Balance

- [ ] Task: Profile Settings for Push Notifications
  - [ ] Update `profiles` schema in `convex/schema.ts` to include an optional `pushNotificationsEnabled` boolean and `pushSubscription` object.
  - [ ] Update `src/pages/Settings.tsx` to include a toggle for enabling/disabling Push Notifications.
- [ ] Task: PWA Push Subscription Service
  - [ ] Implement browser logic to request Notification permission from the user.
  - [ ] Create a Convex mutation to save the user's Web Push subscription object to their profile.
- [ ] Task: Low Balance Alert Trigger (Backend)
  - [ ] Implement a Convex action or cron job (`convex/alerts.ts`) that runs periodically to check if a user's estimated balance has fallen below their `lowBalanceThreshold`.
  - [ ] Integrate a web push library (e.g., `web-push`) in the Convex backend to dispatch the notification to the stored subscription if the threshold is met and notifications are enabled.
- [ ] Task: Conductor - User Manual Verification 'Web Push Notifications for Low Balance' (Protocol in workflow.md)
