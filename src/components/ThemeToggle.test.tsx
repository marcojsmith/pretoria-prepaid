import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

const mockSetTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: mockSetTheme }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the toggle button", () => {
    render(<ThemeToggle />);
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
  });

  it("sets light theme when Light is clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByText("Light"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("sets dark theme when Dark is clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByText("Dark"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("sets system theme when System is clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByText("System"));
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });
});
