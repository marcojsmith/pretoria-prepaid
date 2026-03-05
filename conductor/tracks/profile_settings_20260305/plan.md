# Implementation Plan: User Profile and Meter Settings Management

## Phase 1: Backend Infrastructure [checkpoint: d8c7e41]

- [x] Task: Update Database Schema d1d84b8
  - [x] Add `meterNumber`, `monthlyBudget`, and `preferredName` fields to the `profiles` table in `convex/schema.ts`.
- [x] Task: Update User Mutations and Queries d8c7e41
  - [x] Update `syncUser` in `convex/users.ts` to support the new fields.
  - [x] Implement an `updateProfile` mutation for user-initiated changes.

## Phase 2: Frontend Implementation [checkpoint: 684dc0b]

- [x] Task: Create Settings Page 684dc0b
  - [x] Scaffold `src/pages/Settings.tsx` using shadcn components (Card, Input, Button, Label).
  - [x] Implement the `updateProfile` mutation call on form submission.
- [x] Task: Update Navigation Menu 684dc0b
  - [x] Add a link to the Settings page in `src/components/NavMenu.tsx`.

## Phase 3: Integration and Polish [checkpoint: 30739f7]

- [x] Task: Budget Visibility on Dashboard 30739f7
  - [x] Update `src/components/DashboardStats.tsx` to show spending against the monthly budget if one is set.
- [x] Task: UI/UX Refinement 30739f7
  - [x] Ensure the Settings page is fully responsive and adheres to the "Mobile-First" accessibility guideline.
- [x] Task: Final Verification and Testing 30739f7
  - [x] Verify the complete flow from settings update to dashboard reflection.

- [x] Task: Conductor - User Manual Verification 'User Profile and Meter Settings Management' (Protocol in workflow.md) 30739f7
