# Codebase Notes

## Architecture

- **History & Portability**:
  - `HistoryPage` uses a unified filter state for both Purchases and Readings.
  - Infinite scroll implemented via `IntersectionObserver` in `PurchaseHistory` and `ReadingHistory`.
  - CSV Export uses `convertToCSV` and `downloadCSV` utilities in `src/lib/utils.ts`.
  - Print styles in `index.css` handle PDF generation by hiding UI elements and formatting tables.
- **Analytics**:
  - `YearlyConsumptionChart` provides monthly aggregation using Tailwind-based bars and Framer Motion.
  - Custom Select triggers for year switching.

## PWA & Service Worker

- **App Badge API**: Used to display the estimated electricity balance directly on the app icon when supported.
- **Custom InstallPrompt**: `InstallPrompt.tsx` handles the `beforeinstallprompt` event to provide a stylized, non-intrusive install experience.
- **Background Sync**: Service worker (`sw.ts`) handles background synchronization for failed purchase/reading logs.
- **InjectManifest Mode**: Custom service worker logic allows for fine-grained control over push notifications and precaching.

## Testing Standards

- **Target Coverage**: **97%** or higher for all new features.
- **Tools**: Vitest for unit/integration, Chrome DevTools MCP for E2E verification.
- **Mocking Strategy**:
  - `IntersectionObserver` mocked for infinite scroll tests.
  - `navigator.serviceWorker` and `navigator.setAppBadge` mocked for PWA feature tests.
  - `Clerk` and `Convex` hooks mocked for authentication and data fetching.

## Data Schema

- `purchases`: Fields `amountPaid`, `units`, `tierBreakdown` (with `label` and `units`).
- `meter_readings`: Field `reading`.
- Date format: ISO strings (YYYY-MM-DD) for consistency in sorting and filtering.

## Multi-Meter Architecture (phase 1 backend + phase 2a switcher UI implemented; phase 2b multi-household membership not yet built)

**Decided target model**

- A **household owns meters** (0..n). True multi-household membership (a user holding a personal AND a separate household at once) is phase 2b, not yet implemented — see below.
- Only a household **admin** can add/edit/archive meters.
- Each profile has an `activeMeterId`; the header's `MeterSwitcher` switches it, and every read-only query reactively follows via Convex's live queries — no explicit `meterId` threading needed on the read path.
- Data rows (`purchases`, `meter_readings`) keep their legacy `userId` key AND gain `meterId`, so legacy readers keep working.

**Schema**

- `meters` table: `{ householdId, name, meterNumber?, lowBalanceThreshold?, defaultDailyUsage?, lastAlertSent?, archived?, createdAt }` with `by_householdId`.
- `profiles` += `activeMeterId?` (`v.id("meters")`).
- `purchases` += `meterId?` + index `by_meterId_date`.
- `meter_readings` += `meterId?` + indexes `by_meterId_date`, `by_meterId_source`.
- `household_members` += index `by_householdId_userId`.

**Phase 1 (backend, behaviour-preserving) — done**

`convex/lib/meters.ts` helpers (`getMembership`, `resolveMeter`, `requireHouseholdAdmin`, `ensurePersonalHouseholdAndMeter`), `convex/meters.ts` CRUD, `syncUser` provisions a personal household+meter, `updateProfile` mirrors meter fields to the meter doc, meter-path readers in `purchases.ts`/`readings.ts`/`users.ts`/`household.ts`/`alerts_queries.ts`, and `convex/migrations.ts` backfill.

**Phase 2a (switcher UI + offline-queue safety) — done**

- `MeterSwitcher` (header dropdown, hidden when the caller has ≤1 meter) and `MeterManagementCard` (add/edit/archive on the Household page, admin-gated) — see `src/hooks/useMeters.tsx`.
- Offline purchase queue captures the active `meterId` at queue time so a queued action always targets the meter it was meant for, even if the active meter changes before it syncs (`src/hooks/usePurchase.tsx`).
- Per-meter localStorage cache keys (`purchases_history:<meterId>` / `offline_purchases_queue:<meterId>`).
- Alerts are per-meter, not per-profile: `checkLowBalances` iterates meters, cooldown lives on `meter.lastAlertSent`, one push per subscribed household member per breaching meter.
- Settings page no longer edits `meterNumber`/`lowBalanceThreshold` — that moved to the Household page's meter cards.

**Phase 2b (multi-household membership) — not started**

A user holding a personal household AND a separate household (e.g. work) at once. Blocked today because `household_members` lookups throughout `household.ts` assume one membership per user (`.unique()` on `by_userId`), and `joinHousehold`/`createHousehold` reject anyone who already has a membership — which is nearly everyone, since `syncUser` auto-provisions a personal household on first login. Needs its own planning pass: `getMyHousehold` → plural, `HouseholdPage` UI redesign, and reworking every `household.ts` function that assumes uniqueness.

**Scenario registry (covered by tests)**

1. Multi-meter scoping with explicit `meterId` arg (purchases, readings, consumption stats; stats threshold from meter doc).
2. No-arg fallback to `activeMeterId`, then first membership's first non-archived meter, then legacy userId path, then null.
3. Unauthorized / archived `meterId` → `Error("Unauthorized")`.
4. Dual-keying: meter-path rows carry both `meterId` and `userId` (legacy path stays correct).
5. Rate repricing (`rates.ts` schedules by `{ userId, monthKey }`) still works on migrated rows.
6. `updateProfile` mirrors meter fields onto the meter when the caller is the household admin; non-admin member edits are profile-only.
7. Archive clears `activeMeterId` on affected profiles and hides meters from `listMyMeters`.
8. `joinHousehold`/`createHousehold` reject users who already have an auto-provisioned personal household — accepted, deferred to phase 2b.
9. Offline-queued purchase/delete actions replay against the meter captured at queue time, not whatever is active when connectivity returns.
10. Low-balance alert cooldown is per-meter, shared across household members watching that meter.

**Known accepted divergence:** admin dashboard + rate tooling stay global/userId-keyed — unaffected by the meter model.
