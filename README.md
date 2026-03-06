# Pretoria Prepaid Electricity Tracker

A production-grade Progressive Web App (PWA) designed to help residents of Pretoria, South Africa, calculate, track, and optimize their prepaid electricity costs.

## Key Features

- **Proactive Tier Guidance:** Get warned before you accidentally buy units at a higher price tier. The app calculates how many kWh remain in your current cheaper tier and exactly how much to spend to stay within it.
- **Smart Consumption Estimation:** Real-time balance estimation based on your personalized burn rate.
- **Data Staleness Indicator:** Visual nudges to provide new meter readings if your data is more than 7 days old, ensuring high estimation accuracy.
- **Refill Frequency Analysis:** Visualize the time elapsed between recent purchases to identify patterns and optimize refill strategies.
- **Web Push Notifications:** Receive low-balance alerts directly on your device when your estimated units fall below your custom threshold.
- **Offline Excellence:** Full PWA support with background synchronization for logging purchases and readings without an internet connection.
- **Privacy First:** Secure authentication via Clerk and real-time backend powered by Convex.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- **Backend & Database:** Convex (Real-time synchronization).
- **Authentication:** Clerk.
- **PWA & Notifications:** Vite-PWA (InjectManifest), Web Push API.
- **Testing:** Vitest, React Testing Library.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (Recommended) or Node.js.
- A [Convex](https://www.convex.dev/) account.
- A [Clerk](https://clerk.com/) account.

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/marcosmith/pretoria-prepaid.git
    cd pretoria-prepaid
    ```

2.  Install dependencies:

    ```bash
    bun install
    ```

3.  Configure environment variables:
    Copy `.env.example` to `.env.local` and fill in your Clerk, Convex, and VAPID keys.

4.  Start the development server:

    ```bash
    bun run dev
    ```

5.  In a separate terminal, start the Convex dev server:
    ```bash
    npx convex dev
    ```

## Development

- **Run Tests:** `bun run test`
- **Linting:** `bun run lint`
- **Build for Production:** `bun run build`

## License

MIT
