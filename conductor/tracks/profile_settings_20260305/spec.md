# Specification: User Profile and Meter Settings Management

## Goal

Allow users to personalize their Pretoria Prepaid experience by managing their meter settings, monthly budget, and personal profile information. This data will be used to provide more accurate tracking and proactive spending insights.

## Requirements

- **Backend Updates:**
  - Update `profiles` table in `convex/schema.ts` to include: `meterNumber` (string), `monthlyBudget` (number, optional), and `preferredName` (string, optional).
  - Create/Update mutations in `convex/users.ts` for updating profile data.
- **Frontend Updates:**
  - New **Settings Page**: A clean, accessible interface for managing profile and budget information.
  - **Navigation Update**: Link the Settings page in the main navigation menu.
  - **Dashboard Integration**: Use the monthly budget data (if provided) to show spending progress on the dashboard.

## Success Criteria

- Users can save and retrieve their meter number and monthly budget.
- The navigation menu correctly directs users to the Settings page.
- The Dashboard reflects the user's budget status if configured.
