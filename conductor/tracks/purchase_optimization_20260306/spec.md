# Specification: Purchase Optimization & Smart Alerts

## Overview

This track focuses on shifting the application from passive data logging to proactive strategic purchase guidance. Because users typically interact with the app only when their meter is low and they are ready to buy, we will optimize the app to answer "How much should I buy right now to get the most value?" and provide intelligent low-balance alerts.

## Functional Requirements

1.  **Tier Capacity Indicator**
    - Display how many kWh remain in the current (or lowest available) tier.
    - Advise the user if their intended purchase amount will push them into a more expensive tier.
    - Surface this indicator prominently in both the **Add Purchase Form** and the **Purchase Calculator**.

2.  **Estimation Staleness UI**
    - Add a visual indicator to the `ConsumptionStatsCard` indicating the "staleness" or confidence level of the estimated balance.
    - If the last meter reading is older than a set threshold (e.g., 7 days), nudge the user to provide a fresh reading for more accurate estimations.

3.  **Web Push Notifications for Low Balance**
    - Implement standard PWA Web Push notifications to proactively alert users when their estimated balance drops below their configured threshold.
    - Provide a setting in the user's profile/settings page to toggle these notifications on or off.

4.  **Refill Analysis Chart**
    - Add a visualization to the Dashboard that tracks the historical time between meter refills, helping users identify trends in their consumption burn rate.

## Non-Functional Requirements

- Web Push implementation should handle offline scenarios and graceful degradation if permissions are denied.
- The UI additions for the Tier Capacity indicator must remain clean, mobile-first, and aligned with the existing shadcn/ui components.

## Acceptance Criteria

- [ ] When entering a purchase amount in the Calculator or Add Form, the user sees a warning if the amount exceeds the remaining units in the current pricing tier.
- [ ] The Dashboard displays a warning message/icon when the estimated balance relies on a meter reading older than 7 days.
- [ ] A user can opt-in to receive Web Push notifications in their Settings.
- [ ] The system triggers a Web Push notification (if opted-in) when the background calculation estimates the balance is below the user's defined low-balance threshold.
- [ ] The Dashboard contains a Refill Analysis chart showing the time elapsed between recent purchases.

## Out of Scope

- SMS or direct email notification delivery.
- Direct integration with municipal smart meters for automated readings.
