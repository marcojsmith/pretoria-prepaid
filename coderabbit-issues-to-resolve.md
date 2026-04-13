Verify each finding against the current code and only fix it if needed.

Inline comments:
In `@convex/household.ts`:

- Around line 63-78: The admin email is being leaked in the public invite lookup
  (getInviteByCode) via the fallback adminProfile?.email; change the adminName
  computation in the invite response to never return the raw email when this
  function is unauthenticated—use adminProfile?.preferredName ?? "Household admin"
  (or a masked email like "a\*\*\*@example.com") or null instead of
  adminProfile?.email; update the logic where adminName is set (the
  adminProfile/householdName return block) to apply this safe fallback so PII is
  not exposed.
- Around line 145-159: Replace the non-cryptographic Math.random() generator and
  blind insert with a loop that uses crypto.getRandomValues() to produce
  INVITE_CODE_LENGTH characters from the chars set, and before inserting call the
  household_invites by_code index via ctx.db to check for an existing row with
  that code; if it exists, retry (with a reasonable retry limit) until a unique
  code is found, then insert using ctx.db.insert with householdId:
  membership.householdId, code, createdBy: identity.subject, createdAt:
  Date.now(), and expiresAt: Date.now() + SEVEN_DAYS_MS; ensure you surface a
  clear error if the retry limit is exceeded.

In `@convex/readings.test.ts`:

- Around line 9-278: Tests in readings.test.ts lack household-member scenarios
  using effectiveUserId; add cases to exercise shared-account behavior for
  getReadings, addOnboardingReading, hasAnyReadings/hasPurchaseReadings, and
  getConsumptionStats. Update the test suite by adding tests that call
  t.withIdentity({ subject: memberId, effectiveUserId: adminId }) to verify: (1)
  getReadings returns admin's readings when a member queries; (2)
  addOnboardingReading by a member respects admin purchase readings (throws when
  admin has purchase readings) and is idempotent when allowed; (3) hasAnyReadings
  and hasPurchaseReadings reflect admin data when queried by a member; and (4)
  getConsumptionStats reads and updates profile/defaultDailyUsage for the
  effectiveUserId (admin) when a member provides defaultDailyUsage. Ensure each
  new test inserts data into "meter_readings" or "profiles" under adminId and
  asserts behavior using the existing helpers (convexTest, t.query, t.mutation,
  api.readings.\*) and index queries ("by_userId") so the household sharing model
  is covered.

In `@convex/readings.ts`:

- Around line 42-43: The onboarding update is still using identity.subject
  instead of the household-aware effectiveUserId from resolveEffectiveUserId;
  change all profile patches for onboarding-related fields (e.g., where
  defaultDailyUsage is set and the updates around lines 77-80) to use
  effectiveUserId (the value returned by resolveEffectiveUserId(ctx,
  identity.subject)) instead of identity.subject so the household-effective
  profile is updated consistently.

In `@src/pages/Auth.tsx`:

- Around line 8-9: The redirectUrl is taken directly from URLSearchParams
  (variable searchParams / redirectUrl) and can be abused to perform external
  redirects; sanitize it by validating the value before use: only accept relative,
  same-origin paths (e.g., must start with '/' and not start with '//' and must
  not contain a scheme or hostname), and fall back to "/dashboard" for anything
  invalid or missing; apply the same validation wherever redirectUrl is used
  (including the other usage around lines 35-39) so all post-auth redirects use
  the validated value.

In `@src/pages/HouseholdPage.tsx`:

- Around line 64-72: The join flow in handleJoin uses
  inviteCode.trim().split("/").pop() which can yield empty strings for trailing
  slashes and leaves query/hash fragments; instead parse inviteCode (after
  trimming) as a URL and extract the last non-empty pathname segment, falling back
  to the trimmed raw string if parsing fails; then pass that cleaned code to
  joinHousehold({ code }). Update handleJoin to: 1) trim inviteCode, 2) try new
  URL(trimmed) and compute the last non-empty segment from
  url.pathname.split("/"), 3) if parsing throws or no segment found, use the
  trimmed value, and 4) call joinHousehold with that result.

In `@src/pages/InvitePage.tsx`:

- Line 8: Remove the unused CardDescription import from the import list in
  InvitePage.tsx: update the import that currently includes Card, CardContent,
  CardDescription, CardHeader, CardTitle to exclude CardDescription (keep Card,
  CardContent, CardHeader, CardTitle) so the file no longer imports an unused
  symbol.
- Around line 27-29: Rename the catch parameter from err to error in the
  InvitePage.tsx catch block (the handler that calls toast.error) and update its
  usage inside the block (e.g., replace err instanceof Error ? err.message : ...
  with error instanceof Error ? error.message : ...); ensure the new name follows
  project convention and that any other references in the same catch are updated
  accordingly.

In `@src/pages/Settings.tsx`:

- Line 224: The submit button in Settings.tsx is incorrectly disabled for
  household members; remove isMember from the Button disabled prop so it only
  respects isSaving (i.e., change the disabled expression from "isSaving ||
  isMember" to just "isSaving"), and keep the existing field-level locks intact
  (do not alter per-field disabled logic) so household-managed fields remain
  protected while allowing personal updates and form submission.

---

Nitpick comments:
In `@convex/purchases.test.ts`:

- Around line 9-40: Extract the duplicated seedRates function into a shared test
  utility file (e.g., convex/test-utils.ts) and export it so both tests can import
  it; move the existing seedRates implementation (which uses the convexTest runner
  and ctx.db.insert calls) into that file, export a function with the same
  signature (seedRates(t: ReturnType<typeof convexTest>)) and then replace the
  inline seedRates definitions in purchases.test.ts and rates.test.ts with an
  import of the shared seedRates; ensure imports reference the convexTest type
  where needed and update any local references to use the shared seedRates helper.

In `@src/components/ShareModal.tsx`:

- Around line 40-50: The timeout started in handleCopy (the setTimeout that
  calls setCopied(false) using COPY_FEEDBACK_DURATION_MS) isn't cleared on
  unmount; store the timeout id in a ref (e.g., copyTimeoutRef), assign it when
  calling setTimeout, and clear it in a useEffect cleanup (and before creating a
  new timeout) so the pending timer is cancelled when the component unmounts or
  when handleCopy runs again; update any references to setCopied and
  COPY_FEEDBACK_DURATION_MS accordingly.

In `@src/hooks/useHousehold.tsx`:

- Around line 4-18: The household and invites properties are using an incorrect
  infer pattern; replace their types with the awaited return types of the Convex
  query functions so you get the resolved value (e.g. household:
  Awaited<ReturnType<typeof api.household.getMyHousehold>> and invites:
  Awaited<ReturnType<typeof api.household.getMyInvites>>), or drop the explicit
  UseHouseholdReturn interface and allow TypeScript to infer the hook's return
  type from the hook implementation to keep types in sync.

In `@src/pages/HouseholdPage.tsx`:

- Around line 27-349: HouseholdPage is doing too much; extract and compose
  smaller components so this file remains a coordinator. Create named components
  like HouseholdCreateForm (uses householdName state and handleCreate),
  HouseholdJoinForm (uses inviteCode state and handleJoin), MembersList (renders
  household?.members and calls handleRemove for member.userId; receives
  currentUserId and isAdmin), and AdminDangerZone / LeaveSection (invoke
  handleDisband and handleLeave respectively, and render the relevant AlertDialogs
  and buttons), and keep the ShareModal trigger as a small InviteButton component
  that toggles shareModalOpen. Move local state where appropriate (householdName,
  inviteCode, shareModalOpen, actionLoading) into the new form components or keep
  in HouseholdPage and pass as props; preserve existing handler names
  (handleCreate, handleJoin, handleRemove, handleLeave, handleDisband) and prop
  signatures so behavior is unchanged, and import/use these new components inside
  HouseholdPage to simplify rendering and separate responsibilities.

Verify each finding against the current code and only fix it if needed.

Inline comments:
In `@src/components/HouseholdMemberList.tsx`:

- Around line 76-78: The AlertDialogDescription currently uses
  member.preferredName ?? member.email which can produce the string "null" if both
  are null; update the expression in the AlertDialogDescription to use the same
  three-way fallback used elsewhere (e.g., member.preferredName ?? member.email ??
  'Unknown') so the dialog shows a sensible default; locate the
  AlertDialogDescription rendering in HouseholdMemberList (the JSX that references
  member.preferredName and member.email) and replace the fallback expression
  accordingly.
- Around line 16-22: Remove the local HouseholdMember interface declaration in
  HouseholdMemberList.tsx and import the shared type from the central definition;
  replace the local type usage with the imported HouseholdMember from
  "@/types/household" so the component uses the canonical type (refer to the
  HouseholdMember interface name and update any props or variables that reference
  it to use the imported symbol).

In `@src/components/ShareModal.test.tsx`:

- Around line 73-85: The test name and behavior diverge: update the test for
  ShareModal so the name matches its actions or change the actions to test
  closing/reset; either rename the spec from "resets state when modal is closed"
  to something like "generates new link when 'Generate Another Link' is clicked"
  (referencing ShareModal, mockCreateInvite, mockOnOpenChange and the "Generate
  Another Link" button) OR simulate closing the modal (call onOpenChange/trigger
  the close UI) and then assert the state reset (e.g., no invite code displayed
  and mockCreateInvite call count reset) to truly verify reset behavior.

---

Nitpick comments:
In `@src/components/HouseholdMemberList.test.tsx`:

- Around line 152-164: The test "does not show remove button for current user"
  duplicates an earlier assertion; update it to explicitly verify that the admin
  cannot remove themselves by checking for the absence of a remove button for the
  current user's list item. Render HouseholdMembersList with currentUserId="user1"
  and isAdmin={true}, then query for the specific remove control for user1 (e.g.,
  use screen.queryByRole or queryByLabelText targeting the remove button
  associated with the member name or id) and expect it to be null/not present;
  keep the earlier admin test that asserts other users still have a remove button.

In `@src/components/ShareModal.test.tsx`:

- Around line 97-99: The test is using fragile DOM selectors to find the copy
  button; update the ShareModal component to give the copy button an accessible
  name (e.g., aria-label or visible text like "Copy") and then change the test in
  ShareModal.test.tsx to use React Testing Library's accessible query: replace the
  document.querySelector fallback with screen.getByRole("button", { name: /copy/i
  }) (or getByRole with the actual label you add) and assert it's in the document;
  remove the button svg query fallback.
- Around line 124-136: The test "handles generate error gracefully" currently
  verifies console logging but doesn't assert the user-facing toast; update the
  test to also assert that the mocked toast.error was called when mockCreateInvite
  rejects (Error("Failed")). Specifically, import or reference the mocked toast
  from "sonner" and add an await waitFor block asserting
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Failed")) (or
  similar string-containing matcher) alongside the existing console assertion so
  the test verifies both logging and user-facing error feedback.

In `@src/hooks/useHousehold.tsx`:

- Around line 5-19: Add JSDoc for the UseHouseholdReturn interface and replace
  the loose invites: unknown with a concrete type derived from the Convex query or
  an explicit array type (e.g., HouseholdInvite[]). Update the interface
  declaration (UseHouseholdReturn) to document each field and change the invites
  symbol to the proper type that matches the query result (or a defined
  HouseholdInvite type) so consumers get autocomplete and compile-time checking;
  keep the rest of the return types (createHousehold, createInvite, etc.) as-is.
- Around line 32-38: The loading flag currently only reflects the household
  query; if callers must wait for invites too, change the returned loading to
  account for both (e.g., set loading to true when household === undefined OR
  invites === undefined) in the hook return object, and replace the verbose
  inHousehold expression with the simpler !!household; update the return
  properties referencing household, invites, loading, and inHousehold accordingly.

In `@src/pages/HouseholdPage.tsx`:

- Around line 233-249: The members array type in the HasHouseholdViewProps
  interface duplicates the HouseholdMember shape; replace the inline member type
  with a reused type by importing HouseholdMember and declaring members as
  Array<Pick<HouseholdMember, "userId" | "role" | "preferredName" | "email">> so
  the component uses the single source of truth; update the HasHouseholdViewProps
  definition and imports accordingly (refer to HasHouseholdViewProps, members, and
  HouseholdMember).
- Around line 71-97: The remove/leave/disband handlers (handleRemove,
  handleLeave, handleDisband) lack an async loading guard like
  handleCreate/handleJoin; update these handlers to set and check the existing
  actionLoading state (or add a local loading flag) so the function returns early
  if already loading, set actionLoading = true before awaiting the mutation, and
  reset it to false in a finally block and on error; also ensure the corresponding
  action buttons/AlertDialog confirm buttons are disabled when actionLoading is
  true to prevent double-clicked/destructive repeats.
