---
name: testing
description: Write tests using Vitest and React Testing Library for this project.
license: MIT
---

This skill guides you to write effective tests for the Pretoria Prepaid application.

## Test Setup

- **Framework**: Vitest
- **Testing Library**: React Testing Library (@testing-library/react)
- **DOM Environment**: jsdom
- **Config**: `vitest.config.ts` (root)
- **Setup File**: `vitest.setup.ts`
- **Path Alias**: `@` maps to `src/`

## Running Tests

```bash
bun run test          # Watch mode
bun run test:coverage # With coverage report
bun run test --run    # Single run
```

## Coverage Thresholds

The project enforces 80% coverage for:

- Lines
- Functions
- Branches
- Statements

## Test File Patterns

- Tests alongside components: `ComponentName.test.tsx`
- Test utilities in `src/test/` directory
- Mock files can use `.mock.ts` or `__mocks__/`

## Writing Tests

### Component Tests

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AuctionCard } from "./AuctionCard";

describe("AuctionCard", () => {
  it("renders auction title", () => {
    render(<AuctionCard title="Test Auction" />);
    expect(screen.getByText("Test Auction")).toBeInTheDocument();
  });

  it("calls onBid when bid button clicked", () => {
    const onBid = vi.fn();
    render(<AuctionCard title="Test" onBid={onBid} />);
    fireEvent.click(screen.getByRole("button", { name: /bid/i }));
    expect(onBid).toHaveBeenCalled();
  });
});
```

### Hook Tests

```tsx
import { renderHook, act } from "@testing-library/react";
import { useAuctionTimer } from "./useAuctionTimer";

describe("useAuctionTimer", () => {
  it("starts timer on mount", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuctionTimer(60000));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.remaining).toBe(55000);
    vi.useRealTimers();
  });
});
```

### Mocking Convex

```tsx
import { vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => () => Promise.resolve()),
}));
```

### Mocking Clerk

```tsx
vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: { id: "test-user-id" } }),
  useClerk: () => ({ loaded: true }),
}));
```

## Best Practices

1. **Test behavior, not implementation** - Focus on user interactions
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **One expectation per test** when possible - Clearer failure messages
4. **Describe clearly** - Test names should read like sentences
5. **Mock external dependencies** - Convex, Clerk, external APIs
6. **Use fake timers** - For time-based functionality
7. **Test edge cases** - Empty states, loading, errors

## Excluded from Coverage

These are automatically excluded:

- `node_modules/`
- `convex/`
- `src/components/ui/` (shadcn components)
- `src/main.tsx`, `src/App.tsx`
