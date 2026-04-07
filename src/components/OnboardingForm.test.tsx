import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingForm } from "./OnboardingForm";

describe("OnboardingForm", () => {
  it("renders form with default values", () => {
    render(<OnboardingForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Current Meter Reading/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Daily Usage/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Get Started/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Get Started/i })).toBeDisabled();
  });

  it("calls onSubmit with reading when form is submitted", () => {
    const onSubmit = vi.fn();
    render(<OnboardingForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Current Meter Reading/i), {
      target: { value: "1234.5" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Get Started/i }));

    expect(onSubmit).toHaveBeenCalledWith(1234.5, undefined);
  });

  it("calls onSubmit with reading and daily usage when both are provided", () => {
    const onSubmit = vi.fn();
    render(<OnboardingForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Current Meter Reading/i), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText(/Estimated Daily Usage/i), {
      target: { value: "15.5" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Get Started/i }));

    expect(onSubmit).toHaveBeenCalledWith(500, 15.5);
  });

  it("does not submit when reading is negative", () => {
    const onSubmit = vi.fn();
    render(<OnboardingForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Current Meter Reading/i), {
      target: { value: "-10" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Get Started/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when reading is empty", () => {
    const onSubmit = vi.fn();
    render(<OnboardingForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /Get Started/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("enables submit button when reading is entered", () => {
    render(<OnboardingForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Get Started/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Current Meter Reading/i), {
      target: { value: "100" },
    });

    expect(screen.getByRole("button", { name: /Get Started/i })).not.toBeDisabled();
  });

  it("shows default burn rate in placeholder", () => {
    render(<OnboardingForm onSubmit={vi.fn()} />);

    expect(screen.getByText(/Leave blank to use/)).toBeInTheDocument();
  });
});
