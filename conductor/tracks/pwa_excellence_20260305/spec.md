# Specification: Performance and Offline Excellence (PWA)

## Overview

Transform Pretoria Prepaid into a high-performance Progressive Web App (PWA) that remains functional during power outages and intermittent connectivity (load shedding). Ensure the app is installable on mobile devices and provides a native-like experience.

## Functional Requirements

- **Installability**: Enable "Add to Home Screen" functionality with a custom manifest and service worker.
- **Offline Calculator**: The Purchase Calculator must perform calculations using locally cached electricity rates.
- **Offline History**: Users must be able to view their last 50 purchase records without an active internet connection.
- **Offline Data Entry**: Allow users to log new purchases while offline, queuing them for synchronization once the network is restored.
- **Rates Access**: Ensure the latest retrieved rates are cached and accessible offline.

## Non-Functional Requirements

- **Performance**: Achieve a Lighthouse Performance score of >90.
- **Caching Strategy**: Implement "Stale-While-Revalidate" for static assets and "Network-First" (falling back to cache) for API data (rates/purchases).
- **Service Worker**: Use Workbox for robust service worker management and caching strategies.
- **Asset Optimization**: Minimize main bundle size and optimize images for fast initial load.

## Acceptance Criteria

- App is installable on Android and iOS (Safari).
- Calculator works correctly in Airplane mode.
- Purchase history is visible in Airplane mode.
- Logged purchases while offline sync automatically when the connection returns.
- Initial load time on 3G is under 3 seconds.

## Out of Scope

- Native push notifications (at this stage).
- Peer-to-peer data sharing.
