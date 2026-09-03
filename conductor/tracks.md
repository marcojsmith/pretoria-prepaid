# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

---

- [x] **Track: Implement User Profile and Meter Settings Management**
      _Link: [./tracks/profile_settings_20260305/](./tracks/profile_settings_20260305/)_

---

- [x] **Track: Performance and Offline Excellence (PWA)**
      _Link: [./tracks/pwa_excellence_20260305/](./tracks/pwa_excellence_20260305/)_

---

- [x] **Track: Purchase Optimization & Smart Alerts**
      _Link: [./tracks/purchase_optimization_20260306/](./tracks/purchase_optimization_20260306/)_

---

- [~] **Track: Historical Data Exploration and Portability**
  _Link: [./tracks/history_and_portability_20260306/](./tracks/history_and_portability_20260306/)_

---

- [~] **Track: Multi-Meter & Multi-Household Support**
  _See `codebase_notes.md`'s "Multi-Meter Architecture" section for the full model and scenario registry._
  - Phase 1 (backend, behaviour-preserving) — done: `meters` table, access helpers, CRUD, meter-path readers, migration backfill.
  - Phase 2a (switcher UI + offline-queue safety) — done: meter switcher, per-meter management UI, per-meter caches, alerts-per-meter.
  - Phase 2b (multi-household membership) — not started: resolve the invite/join guard so a user can hold a personal household and a separate one (e.g. work) at once.
