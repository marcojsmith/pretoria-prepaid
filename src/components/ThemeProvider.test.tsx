import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children, ...props }: { children: ReactNode }) => (
    <div data-testid="mock-themes" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}));

describe("ThemeProvider", () => {
  it("renders children", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <div data-testid="child-content">Child Content</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toHaveTextContent("Child Content");
  });

  it("passes props to next-themes provider", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <div>Content</div>
      </ThemeProvider>
    );

    const mockThemes = screen.getByTestId("mock-themes");
    const props = JSON.parse(mockThemes.getAttribute("data-props") || "{}");

    expect(props.attribute).toBe("class");
    expect(props.defaultTheme).toBe("dark");
    expect(props.enableSystem).toBe(false);
  });
});
