import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import NotFound from "./NotFound";

describe("NotFound Page", () => {
  it("renders correctly", () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Oops! Page not found")).toBeInTheDocument();
    expect(screen.getByText("Return to Home")).toBeInTheDocument();
  });
});
