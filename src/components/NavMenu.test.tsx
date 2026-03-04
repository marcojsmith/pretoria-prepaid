import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { NavMenu } from "./NavMenu";

// Mock Sheet component since it's complex and depends on Radix
vi.mock("./ui/sheet", () => ({
  Sheet: ({ children }: any) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe("NavMenu", () => {
  it("renders correctly", () => {
    render(
      <BrowserRouter>
        <NavMenu />
      </BrowserRouter>
    );
    // The menu trigger button has the lucide-menu icon
    expect(screen.getByRole("button", { name: "" })).toBeInTheDocument();
  });

  it("handles navigation", () => {
    render(
      <BrowserRouter>
        <NavMenu />
      </BrowserRouter>
    );

    const dashboardButton = screen.getByText(/Dashboard/i);
    fireEvent.click(dashboardButton);
  });
});
