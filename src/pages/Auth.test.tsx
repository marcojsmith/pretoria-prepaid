import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Auth from "./Auth";

vi.mock("@clerk/clerk-react", () => ({
  SignIn: () => <div data-testid="sign-in">SignIn</div>,
  SignUp: () => <div data-testid="sign-up">SignUp</div>,
}));

describe("Auth Page", () => {
  it("renders correctly", () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    expect(screen.getByText(/PowerTracker/i)).toBeInTheDocument();
    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
  });
});
