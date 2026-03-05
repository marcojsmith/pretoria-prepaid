# Implementation Plan: Performance and Offline Excellence (PWA)

## Phase 1: PWA Configuration and Asset Setup [DONE]

- [x] Task: Service Worker and Manifest Setup b69439b
  - [x] Add `manifest.json` with appropriate icons (512x512, 192x192), splash screen, and theme colors.
  - [x] Configure `vite-plugin-pwa` in `vite.config.ts`.
  - [x] Implement `RegisterSW` component to handle service worker registration.
- [x] Task: Static Asset Optimization 8c7a6aa
  - [x] Audit existing assets and compress images (using `sharp` or similar).
  - [x] Implement code-splitting for main pages (Dashboard, Calculator, History).
- [x] Task: Conductor - User Manual Verification 'PWA Configuration and Asset Setup' (Protocol in workflow.md)

## Phase 2: Offline Data and Calculator [DONE]

- [x] Task: Offline Purchase Calculator 0ce27d7
  - [x] Use `react-query` or similar for caching electricity rates with stale-while-revalidate.
  - [x] Ensure the calculator can perform calculations using cached rates when offline.
- [x] Task: Offline Purchase History 33c6020
  - [x] Implement local storage or IndexedDB (using `idb` or `dexie`) to cache the last 50 purchases.
  - [x] Update `PurchaseHistory` component to read from local cache if Convex is unavailable.
- [x] Task: Conductor - User Manual Verification 'Offline Data and Calculator' (Protocol in workflow.md)

## Phase 3: Background Sync and UI Refinement [DONE]

- [x] Task: Offline Data Entry and Background Sync 21da8fd
  - [x] Create an offline queue for purchases added while disconnected.
  - [x] Implement a background sync mechanism (or manual sync on reconnect) to push queued purchases to Convex.
- [x] Task: Connection Status UI 21da8fd
  - [x] Add an "Offline Mode" indicator (e.g., a small banner or icon) to the UI.
  - [x] Provide user feedback when data is being synced.
- [x] Task: Performance Audit and Polish 8ac24d1
  - [x] Run Lighthouse audits and address any performance bottlenecks.
  - [x] Final UI/UX refinement for a native-like experience.
- [x] Task: Conductor - User Manual Verification 'Background Sync and UI Refinement' (Protocol in workflow.md) 8ac24d1
