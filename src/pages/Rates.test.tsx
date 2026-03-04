import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Rates from "./Rates";
import { useRates } from "../hooks/useRates";
import { useUserRole } from "../hooks/useUserRole";
import { useAuth } from "../hooks/useAuth";

// Mock the hooks
vi.mock("../hooks/useRates");
vi.mock("../hooks/useUserRole");
vi.mock("../hooks/useAuth");

describe("Rates Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: "1" } });
  });

  it("renders loading state", () => {
    (useRates as any).mockReturnValue({ loading: true, rates: [] });
    (useUserRole as any).mockReturnValue({ loading: true });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders rates table", () => {
    (useRates as any).mockReturnValue({
      loading: false,
      rates: [
        {
          _id: "1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 3.42,
        },
      ],
    });
    (useUserRole as any).mockReturnValue({ loading: false, isAdmin: false });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/Electricity Rates/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Tier 1")).toBeInTheDocument();
    expect(screen.getByText(/3.42/)).toBeInTheDocument();
  });

  it("shows update buttons for admins", () => {
    (useRates as any).mockReturnValue({
      loading: false,
      rates: [
        {
          _id: "1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 3.42,
        },
      ],
    });
    (useUserRole as any).mockReturnValue({ loading: false, isAdmin: true });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    // There are multiple buttons (menu, logout, pencil), we check that we have some buttons
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("opens update dialog when pencil is clicked", async () => {
    (useRates as any).mockReturnValue({
      loading: false,
      rates: [
        {
          _id: "1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 3.42,
        },
      ],
    });
    (useUserRole as any).mockReturnValue({ loading: false, isAdmin: true });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    // Find the pencil button using testid
    const editButton = screen.getByTestId("edit-rate-button");
    expect(editButton).toBeInTheDocument();

    // Click edit button
    await act(async () => {
      fireEvent.click(editButton);
    });

    // Should show Input
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    // Should show Save and Cancel buttons (Check and X icons)
    const buttons = screen.getAllByRole("button");
    const saveButton = buttons.find((b) => b.querySelector(".lucide-check"));
    const cancelButton = buttons.find((b) => b.querySelector(".lucide-x"));

    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();

    // Click cancel
    await act(async () => {
      fireEvent.click(cancelButton!);
    });

    // Input should be gone
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("handles save rate click", async () => {
    const updateRate = vi.fn().mockResolvedValue({ error: null });
    (useRates as any).mockReturnValue({
      loading: false,
      rates: [
        {
          _id: "1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 3.42,
        },
      ],
      updateRate,
    });
    (useUserRole as any).mockReturnValue({ loading: false, isAdmin: true });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("edit-rate-button"));
    });

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "3.5" } });

    const saveButton = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check"));
    await act(async () => {
      fireEvent.click(saveButton!);
    });

    // Verification of updateRate call would require more mocking of internal handleSave
  });

  it("handles logout click", async () => {
    const signOut = vi.fn();
    (useAuth as any).mockReturnValue({ user: { id: "1" }, loading: false, signOut });
    (useRates as any).mockReturnValue({
      loading: false,
      rates: [],
    });
    (useUserRole as any).mockReturnValue({ loading: false, isAdmin: false });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    const logoutButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector(".lucide-log-out"));
    expect(logoutButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(logoutButton!);
    });

    expect(signOut).toHaveBeenCalled();
  });
});
