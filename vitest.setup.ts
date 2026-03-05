import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock PWA registration
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: vi.fn(() => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  })),
}));

// Mock convex/react globally to prevent 'Could not find Convex client' errors
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => [
    {
      _id: "1",
      tier_number: 1,
      tier_label: "Tier 1",
      min_units: 1,
      max_units: 100,
      rate: 3.42585,
    },
    {
      _id: "2",
      tier_number: 2,
      tier_label: "Tier 2",
      min_units: 101,
      max_units: 400,
      rate: 4.00936,
    },
    {
      _id: "3",
      tier_number: 3,
      tier_label: "Tier 3",
      min_units: 401,
      max_units: 650,
      rate: 4.36816,
    },
    {
      _id: "4",
      tier_number: 4,
      tier_label: "Tier 4",
      min_units: 651,
      max_units: null,
      rate: 4.70902,
    },
  ]),
  useMutation: vi.fn(() => vi.fn().mockResolvedValue({})),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}));
