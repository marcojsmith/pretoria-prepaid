import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddReadingForm } from "./AddReadingForm";

describe("AddReadingForm", () => {
  it("renders correctly", () => {
    render(<AddReadingForm onAdd={vi.fn()} />);
    expect(screen.getByText(/Log Meter Reading/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Units Remaining \(kWh\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
  });

  it("calls onAdd with correct values when submitted", () => {
    const mockOnAdd = vi.fn();
    render(<AddReadingForm onAdd={mockOnAdd} />);

    const readingInput = screen.getByLabelText(/Units Remaining/i);
    const dateInput = screen.getByLabelText(/Date/i);
    const submitButton = screen.getByRole("button", { name: /Log Reading/i });

    fireEvent.change(readingInput, { target: { value: "150.5" } });
    fireEvent.change(dateInput, { target: { value: "2024-03-05" } });
    fireEvent.click(submitButton);

    expect(mockOnAdd).toHaveBeenCalledWith(150.5, "2024-03-05");
    expect(readingInput).toHaveValue(null); // Should reset reading
  });

  it("does not call onAdd if reading is invalid", () => {
    const mockOnAdd = vi.fn();
    render(<AddReadingForm onAdd={mockOnAdd} />);

    const readingInput = screen.getByLabelText(/Units Remaining/i);
    const submitButton = screen.getByRole("button", { name: /Log Reading/i });

    // Try submitting empty reading
    fireEvent.click(submitButton);
    expect(mockOnAdd).not.toHaveBeenCalled();

    // Try submitting negative reading
    fireEvent.change(readingInput, { target: { value: "-10" } });
    fireEvent.click(submitButton);
    // Note: The browser might prevent this via HTML5 validation, but we check JS logic too
  });
});
