import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MeterManagementCard } from "./MeterManagementCard";
import { useMeters } from "@/hooks/useMeters";
import type { Id } from "../../convex/_generated/dataModel";
import type { HouseholdMeter } from "@/types/household";

vi.mock("@/hooks/useMeters", () => ({
  useMeters: vi.fn(),
}));

const meters: HouseholdMeter[] = [
  { meterId: "m1", name: "Main", meterNumber: "123", archived: false },
  { meterId: "m2", name: "Cottage", archived: false },
];

const fullMeters = [
  {
    meterId: "m1" as Id<"meters">,
    householdId: "h1" as Id<"households">,
    householdName: "Home",
    name: "Main",
    meterNumber: "123",
    lowBalanceThreshold: 15,
    defaultDailyUsage: 4,
    isActive: true,
    myRole: "admin" as const,
  },
  {
    meterId: "m2" as Id<"meters">,
    householdId: "h1" as Id<"households">,
    householdName: "Home",
    name: "Cottage",
    isActive: false,
    myRole: "admin" as const,
  },
];

describe("MeterManagementCard", () => {
  const mockUpdateMeter = vi.fn();
  const mockArchiveMeter = vi.fn();
  const mockAddMeter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMeters).mockReturnValue({
      meters: fullMeters,
      activeMeter: fullMeters[0],
      loading: false,
      setActiveMeter: vi.fn(),
      addMeter: mockAddMeter,
      updateMeter: mockUpdateMeter,
      archiveMeter: mockArchiveMeter,
    } as unknown as ReturnType<typeof useMeters>);
  });

  it("renders an empty state when there are no meters", () => {
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={[]} isAdmin={true} />
    );
    expect(screen.getByText("No meters yet.")).toBeInTheDocument();
  });

  it("lists meters with their meter number", () => {
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(screen.getByText("Cottage")).toBeInTheDocument();
  });

  it("hides admin controls and the add-meter form for non-admins", () => {
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={false} />
    );
    expect(screen.queryByPlaceholderText(/Meter name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Archive meter/i)).not.toBeInTheDocument();
  });

  it("submits the add-meter form with a meter number", async () => {
    mockAddMeter.mockResolvedValue("newId" as unknown as Id<"meters">);
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Meter name/i), {
      target: { value: "Garden" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Meter number/i), {
      target: { value: "999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add Meter/i }));

    await waitFor(() => {
      expect(mockAddMeter).toHaveBeenCalledWith({
        householdId: "h1",
        name: "Garden",
        meterNumber: "999",
      });
    });
  });

  it("does not submit the add-meter form with a blank name", () => {
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );
    expect(screen.getByRole("button", { name: /Add Meter/i })).toBeDisabled();
  });

  it("opens the edit dialog pre-filled and saves the updated fields", async () => {
    mockUpdateMeter.mockResolvedValue(undefined);
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );

    fireEvent.click(screen.getByLabelText("Edit meter Main"));

    expect(await screen.findByText("Edit meter")).toBeInTheDocument();
    const dialog = within(screen.getByRole("dialog"));
    expect(screen.getByLabelText("Name")).toHaveValue("Main");
    expect(dialog.getByLabelText("Meter Number")).toHaveValue("123");
    expect(screen.getByLabelText(/Low Balance Threshold/)).toHaveValue(15);
    expect(screen.getByLabelText(/Default Daily Usage/)).toHaveValue(4);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Main House" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => {
      expect(mockUpdateMeter).toHaveBeenCalledWith({
        meterId: "m1",
        name: "Main House",
        meterNumber: "123",
        lowBalanceThreshold: 15,
        defaultDailyUsage: 4,
      });
    });
  });

  it("omits meter number and thresholds from the update when left blank", async () => {
    mockUpdateMeter.mockResolvedValue(undefined);
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );

    fireEvent.click(screen.getByLabelText("Edit meter Cottage"));
    expect(await screen.findByText("Edit meter")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByLabelText("Meter Number")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => {
      expect(mockUpdateMeter).toHaveBeenCalledWith({
        meterId: "m2",
        name: "Cottage",
      });
    });
  });

  it("disables Save while the name is blank", () => {
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );
    fireEvent.click(screen.getByLabelText("Edit meter Cottage"));

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /^Save$/ })).toBeDisabled();
  });

  it("archives a meter after confirming the alert dialog", async () => {
    mockArchiveMeter.mockResolvedValue(undefined);
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );

    fireEvent.click(screen.getAllByLabelText(/Archive meter/i)[0] as HTMLElement);
    expect(await screen.findByText("Archive meter?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    await waitFor(() => {
      expect(mockArchiveMeter).toHaveBeenCalledWith("m1");
    });
  });

  it("cancelling the archive dialog does not call archiveMeter", async () => {
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );

    fireEvent.click(screen.getAllByLabelText(/Archive meter/i)[0] as HTMLElement);
    expect(await screen.findByText("Archive meter?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockArchiveMeter).not.toHaveBeenCalled();
  });

  it("populates the edit dialog's threshold/usage fields once meters finish loading after mount", async () => {
    // myMeters is still undefined (loading) at first mount.
    vi.mocked(useMeters).mockReturnValue({
      meters: undefined,
      activeMeter: undefined,
      loading: true,
      setActiveMeter: vi.fn(),
      addMeter: mockAddMeter,
      updateMeter: mockUpdateMeter,
      archiveMeter: mockArchiveMeter,
    } as unknown as ReturnType<typeof useMeters>);

    const { rerender } = render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );

    // myMeters resolves on a later re-render.
    vi.mocked(useMeters).mockReturnValue({
      meters: fullMeters,
      activeMeter: fullMeters[0],
      loading: false,
      setActiveMeter: vi.fn(),
      addMeter: mockAddMeter,
      updateMeter: mockUpdateMeter,
      archiveMeter: mockArchiveMeter,
    } as unknown as ReturnType<typeof useMeters>);

    rerender(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );

    fireEvent.click(screen.getByLabelText("Edit meter Main"));

    expect(await screen.findByText("Edit meter")).toBeInTheDocument();
    expect(screen.getByLabelText(/Low Balance Threshold/)).toHaveValue(15);
    expect(screen.getByLabelText(/Default Daily Usage/)).toHaveValue(4);
  });

  it("gives the add-meter meter-number input an accessible label", () => {
    render(
      <MeterManagementCard householdId={"h1" as Id<"households">} meters={meters} isAdmin={true} />
    );
    expect(screen.getByLabelText("Meter Number")).toBe(
      screen.getByPlaceholderText(/Meter number/i)
    );
  });
});
