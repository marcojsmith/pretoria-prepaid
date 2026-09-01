import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditableBalance } from "./EditableBalance";

describe("EditableBalance", () => {
  it("renders the estimated balance and threshold", () => {
    render(
      <EditableBalance
        estimatedBalance={80.2}
        isLow={false}
        lowBalanceThreshold={10}
        onUpdateBalance={vi.fn()}
      />
    );

    expect(screen.getByText(/80.2/)).toBeInTheDocument();
    expect(screen.getByText(/Threshold: 10 kWh/)).toBeInTheDocument();
  });

  it("switches to an input when the pencil is clicked", () => {
    render(
      <EditableBalance
        estimatedBalance={80.2}
        isLow={false}
        lowBalanceThreshold={10}
        onUpdateBalance={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Edit meter balance"));

    expect(screen.getByLabelText("Actual meter reading (kWh)")).toBeInTheDocument();
  });

  it("prompts for confirmation on blur when the value changed, and saves on confirm", async () => {
    const onUpdateBalance = vi.fn().mockResolvedValue(undefined);
    render(
      <EditableBalance
        estimatedBalance={80.2}
        isLow={false}
        lowBalanceThreshold={10}
        onUpdateBalance={onUpdateBalance}
      />
    );

    fireEvent.click(screen.getByLabelText("Edit meter balance"));
    const input = screen.getByLabelText("Actual meter reading (kWh)");
    fireEvent.change(input, { target: { value: "65" } });
    fireEvent.blur(input);

    expect(await screen.findByText(/Update meter balance\?/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(onUpdateBalance).toHaveBeenCalledWith(65));
  });

  it("discards the edit when the confirmation is cancelled", async () => {
    const onUpdateBalance = vi.fn();
    render(
      <EditableBalance
        estimatedBalance={80.2}
        isLow={false}
        lowBalanceThreshold={10}
        onUpdateBalance={onUpdateBalance}
      />
    );

    fireEvent.click(screen.getByLabelText("Edit meter balance"));
    const input = screen.getByLabelText("Actual meter reading (kWh)");
    fireEvent.change(input, { target: { value: "65" } });
    fireEvent.blur(input);

    await screen.findByText(/Update meter balance\?/);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onUpdateBalance).not.toHaveBeenCalled();
    expect(screen.getByText(/80.2/)).toBeInTheDocument();
  });

  it("does not prompt when the value is unchanged on blur", () => {
    const onUpdateBalance = vi.fn();
    render(
      <EditableBalance
        estimatedBalance={80.2}
        isLow={false}
        lowBalanceThreshold={10}
        onUpdateBalance={onUpdateBalance}
      />
    );

    fireEvent.click(screen.getByLabelText("Edit meter balance"));
    fireEvent.blur(screen.getByLabelText("Actual meter reading (kWh)"));

    expect(screen.queryByText(/Update meter balance\?/)).not.toBeInTheDocument();
    expect(onUpdateBalance).not.toHaveBeenCalled();
  });
});
