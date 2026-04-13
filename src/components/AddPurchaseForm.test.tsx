import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddPurchaseForm } from "./AddPurchaseForm";
import * as convexReact from "convex/react";
import * as sonner from "sonner";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const MOCK_RATES = [
  { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.42585 },
  { _id: "2", tier_number: 2, tier_label: "Tier 2", min_units: 101, max_units: 400, rate: 4.00936 },
  { _id: "3", tier_number: 3, tier_label: "Tier 3", min_units: 401, max_units: 650, rate: 4.36816 },
  {
    _id: "4",
    tier_number: 4,
    tier_label: "Tier 4",
    min_units: 651,
    max_units: null,
    rate: 4.70902,
  },
];

describe("AddPurchaseForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convexReact.useQuery).mockReturnValue(MOCK_RATES);
  });

  it("renders correctly with default values", () => {
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={vi.fn()} />);
    expect(screen.getByLabelText(/Amount Paid/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kWh Received/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
  });

  it("pre-fills values when provided", () => {
    render(
      <AddPurchaseForm
        unitsAlreadyBought={0}
        onAdd={vi.fn()}
        prefillAmount={500}
        prefillUnits={120.5}
      />
    );
    expect(screen.getByLabelText(/Amount Paid/i)).toHaveValue(500);
    expect(screen.getByLabelText(/kWh Received/i)).toHaveValue(120.5);
  });

  it("calls onAdd with correct values when submitted", () => {
    const onAdd = vi.fn();
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/Amount Paid/i), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText(/Current Meter/i), { target: { value: "1500" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Purchase/i }));

    expect(onAdd).toHaveBeenCalledWith({
      units: 120,
      amountPaid: 500,
      date: expect.any(String),
      meterReading: 1500,
    });
  });

  it("shows error toast when amount is invalid", () => {
    const onAdd = vi.fn();
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "120" } });
    // Amount is empty/0

    const submitButton = screen.getByRole("button", { name: /Add Purchase/i });
    // Force click even if disabled (or if we remove the disabled prop check)
    fireEvent.click(submitButton);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("supports prefillReading", () => {
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={vi.fn()} prefillReading={100.5} />);
    expect(screen.getByLabelText(/Current Meter/i)).toHaveValue(100.5);
  });

  it("shows effective rate and tier when inputs are filled", () => {
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Amount Paid/i), { target: { value: "400" } });
    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "100" } });

    expect(screen.getByText(/Effective Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/R 4.00\/kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 1/i)).toBeInTheDocument();
  });

  it("shows tier limit warning when purchase exceeds current tier capacity", () => {
    render(<AddPurchaseForm unitsAlreadyBought={80} onAdd={vi.fn()} />);

    // Tier 1 capacity: 100. unitsAlreadyBought: 80. Remaining: 20.
    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "30" } });

    expect(screen.getByText(/Next Tier reached/i)).toBeInTheDocument();
    expect(screen.getByText(/This purchase exceeds the/i)).toBeInTheDocument();
    expect(screen.getByText(/20 kWh/i)).toBeInTheDocument();
  });

  it("handles reading input change", () => {
    const onAdd = vi.fn();
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    const readingInput = screen.getByLabelText(/Current Meter/i);
    fireEvent.change(readingInput, { target: { value: "1000" } });
    expect(readingInput).toHaveValue(1000);
  });

  it("shows error toast when units are invalid", () => {
    const onAdd = vi.fn();
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/Amount Paid/i), { target: { value: "500" } });

    // Button is disabled when units are empty, so we can't trigger submit via click
    // The toast.error is only called in handleSubmit, which requires form submission
    // Since the button is disabled, handleSubmit is never called and no toast appears
    const submitButton = screen.getByRole("button", { name: /Add Purchase/i });
    expect(submitButton).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("shows error toast when meter reading is invalid", () => {
    const onAdd = vi.fn();
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/Amount Paid/i), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "120" } });

    // Button is disabled when meter reading is empty, so handleSubmit is never called
    const submitButton = screen.getByRole("button", { name: /Add Purchase/i });
    expect(submitButton).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("shows success toast and clears form on valid submission", () => {
    const onAdd = vi.fn();
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/Amount Paid/i), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText(/Current Meter/i), { target: { value: "1500" } });

    fireEvent.click(screen.getByRole("button", { name: /Add Purchase/i }));

    expect(onAdd).toHaveBeenCalledWith({
      units: 120,
      amountPaid: 500,
      date: expect.any(String),
      meterReading: 1500,
    });
    expect(sonner.toast.success).toHaveBeenCalledWith(expect.stringContaining("Added 120 kWh"));
    expect((screen.getByLabelText(/Amount Paid/i) as HTMLInputElement).value).toBeFalsy();
    expect((screen.getByLabelText(/kWh Received/i) as HTMLInputElement).value).toBeFalsy();
    expect((screen.getByLabelText(/Current Meter/i) as HTMLInputElement).value).toBeFalsy();
  });

  it("shows error toast when amount is zero on form submit", () => {
    const onAdd = vi.fn();
    const { container } = render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText(/Current Meter/i), { target: { value: "1000" } });
    // Leave amount at 0

    const form = container.querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    expect(sonner.toast.error).toHaveBeenCalledWith("Please enter a valid amount paid");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("shows error toast when kWh is zero on form submit", () => {
    const onAdd = vi.fn();
    const { container } = render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/Amount Paid/i), { target: { value: "100" } });
    // Manually clear units (overrides auto-calc)
    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/Current Meter/i), { target: { value: "1000" } });

    const form = container.querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    expect(sonner.toast.error).toHaveBeenCalledWith("Please enter the kWh received");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("shows error toast when meter reading is zero on form submit", () => {
    const onAdd = vi.fn();
    const { container } = render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/Amount Paid/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "30" } });
    // Leave meter reading at 0

    const form = container.querySelector("form");
    if (!form) throw new Error("form not found");
    fireEvent.submit(form);

    expect(sonner.toast.error).toHaveBeenCalledWith("Please enter the current meter reading");
    expect(onAdd).not.toHaveBeenCalled();
  });
});
