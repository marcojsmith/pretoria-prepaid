# Implementation Plan: User Profile and Meter Settings Management

## Phase 1: Backend Infrastructure

- [ ] Task: Update Database Schema
  - [ ] Add `meterNumber`, `monthlyBudget`, and `preferredName` fields to the `profiles` table in `convex/schema.ts`.
- [ ] Task: Update User Mutations and Queries
  - [ ] Update `syncUser` in `convex/users.ts` to support the new fields.
  - [ ] Implement an `updateProfile` mutation for user-initiated changes.

## Phase 2: Frontend Implementation

- [ ] Task: Create Settings Page
  - [ ] Scaffold `src/pages/Settings.tsx` using shadcn components (Card, Input, Button, Label).
  - [ ] Implement the `updateProfile` mutation call on form submission.
- [ ] Task: Update Navigation Menu
  - [ ] Add a link to the Settings page in `src/components/NavMenu.tsx`.

## Phase 3: Integration and Polish

- [ ] Task: Budget Visibility on Dashboard
  - [ ] Update `src/components/DashboardStats.tsx` to show spending against the monthly budget if one is set.
- [ ] Task: UI/UX Refinement
  - [ ] Ensure the Settings page is fully responsive and adheres to the "Mobile-First" accessibility guideline.
- [ ] Task: Final Verification and Testing
  - [ ] Verify the complete flow from settings update to dashboard reflection.

- [ ] Task: Conductor - User Manual Verification 'User Profile and Meter Settings Management' (Protocol in workflow.md)
