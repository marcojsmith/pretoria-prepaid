![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/marcojsmith/pretoria-prepaid?utm_source=oss&utm_medium=github&utm_campaign=marcojsmith%2Fpretoria-prepaid&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

# Pretoria Prepaid Electricity Tracker

A production-grade Progressive Web App (PWA) designed to help residents of Pretoria, South Africa, calculate, track, and optimize their prepaid electricity costs.

## Key Features

- **Proactive Tier Guidance:** Get warned before you accidentally buy units at a higher price tier. The app calculates how many kWh remain in your current cheaper tier and exactly how much to spend to stay within it.
- **Smart Consumption Estimation:** Real-time balance estimation based on your personalized burn rate and manual meter readings.
- **Data Portability:** Export your entire purchase and reading history to CSV or print-to-PDF for your records.
- **Visual Analytics:** Interactive charts for yearly consumption, daily usage trends, and purchase frequency.
- **Advanced PWA Excellence:**
  - **App Badge Support:** See your estimated balance directly on the app icon.
  - **InstallPrompt:** Custom in-app installation experience.
  - **Offline-First:** Full background sync for logging data without an active connection.
  - **Push Notifications:** Low-balance alerts (Web Push API).
- **97%+ Test Coverage:** Robustly tested using Vitest and React Testing Library, including E2E UI verification.
- **Security & Speed:** Real-time synchronization via Convex, secure auth via Clerk, and a lightning-fast UI built with Tailwind CSS.

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
