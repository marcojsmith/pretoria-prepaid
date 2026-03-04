import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddPurchaseForm } from "./AddPurchaseForm";

describe("AddPurchaseForm", () => {
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

    expect(onAdd).toHaveBeenCalledWith(120, 500, expect.any(String));
  });

  it("shows effective rate and tier when inputs are filled", () => {
    render(<AddPurchaseForm unitsAlreadyBought={0} onAdd={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Amount Paid/i), { target: { value: "400" } });
    fireEvent.change(screen.getByLabelText(/kWh Received/i), { target: { value: "100" } });

    expect(screen.getByText(/Effective Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/R 4.00\/kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 1/i)).toBeInTheDocument();
  });
});
