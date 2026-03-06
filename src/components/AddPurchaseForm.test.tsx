import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddPurchaseForm } from "./AddPurchaseForm";
import * as convexReact from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
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

    fireEvent.click(screen.getByRole("button", { name: /Add Purchase/i }));

    expect(onAdd).toHaveBeenCalledWith(120, 500, expect.any(String), undefined);
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
});
