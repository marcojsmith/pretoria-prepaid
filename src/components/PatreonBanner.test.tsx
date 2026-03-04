import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PatreonBanner } from "./PatreonBanner";

describe("PatreonBanner", () => {
  it("renders correctly", () => {
    render(<PatreonBanner />);
    expect(screen.getByText(/Has this app helped you\?/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Support on Patreon/i })).toHaveAttribute(
      "href",
      "https://www.patreon.com/MarcoSmith"
    );
  });

  it("is dismissed when X button is clicked", () => {
    render(<PatreonBanner />);
    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);
    expect(screen.queryByText(/Has this app helped you\?/i)).not.toBeInTheDocument();
  });
});
