# Implementation Plan: Performance and Offline Excellence (PWA)

## Phase 1: PWA Configuration and Asset Setup

- [~] Task: Service Worker and Manifest Setup
  - [ ] Add `manifest.json` with appropriate icons (512x512, 192x192), splash screen, and theme colors.
  - [ ] Configure `vite-plugin-pwa` in `vite.config.ts`.
  - [ ] Implement `RegisterSW` component to handle service worker registration.
- [ ] Task: Static Asset Optimization
  - [ ] Audit existing assets and compress images (using `sharp` or similar).
  - [ ] Implement code-splitting for main pages (Dashboard, Calculator, History).
- [ ] Task: Conductor - User Manual Verification 'PWA Configuration and Asset Setup' (Protocol in workflow.md)

## Phase 2: Offline Data and Calculator

- [ ] Task: Offline Purchase Calculator
  - [ ] Use `react-query` or similar for caching electricity rates with stale-while-revalidate.
  - [ ] Ensure the calculator can perform calculations using cached rates when offline.
- [ ] Task: Offline Purchase History
  - [ ] Implement local storage or IndexedDB (using `idb` or `dexie`) to cache the last 50 purchases.
  - [ ] Update `PurchaseHistory` component to read from local cache if Convex is unavailable.
- [ ] Task: Conductor - User Manual Verification 'Offline Data and Calculator' (Protocol in workflow.md)

## Phase 3: Background Sync and UI Refinement

- [ ] Task: Offline Data Entry and Background Sync
  - [ ] Create an offline queue for purchases added while disconnected.
  - [ ] Implement a background sync mechanism (or manual sync on reconnect) to push queued purchases to Convex.
- [ ] Task: Connection Status UI
  - [ ] Add an "Offline Mode" indicator (e.g., a small banner or icon) to the UI.
  - [ ] Provide user feedback when data is being synced.
- [ ] Task: Performance Audit and Polish
  - [ ] Run Lighthouse audits and address any performance bottlenecks.
  - [ ] Final UI/UX refinement for a native-like experience.
- [ ] Task: Conductor - User Manual Verification 'Background Sync and UI Refinement' (Protocol in workflow.md)
