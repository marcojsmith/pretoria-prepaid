import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HouseholdPage from "./HouseholdPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock("../hooks/useHousehold", () => ({
  useHousehold: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: "user1",
      firstName: "Test",
      primaryEmailAddress: { emailAddress: "test@example.com" },
    },
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock("../components/ShareModal", () => ({
  ShareModal: vi.fn(() => null),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useHousehold } from "../hooks/useHousehold";
import { toast } from "sonner";

describe("HouseholdPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultMockProps = {
    household: null,
    invites: undefined,
    loading: false,
    inHousehold: false,
    isAdmin: false,
    isMember: false,
    createHousehold: vi.fn(),
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
    joinHousehold: vi.fn(),
    removeMember: vi.fn(),
    leaveHousehold: vi.fn(),
    disbandHousehold: vi.fn(),
  } as unknown as ReturnType<typeof useHousehold>;

  it("renders without crashing", () => {
    vi.mocked(useHousehold).mockReturnValue(defaultMockProps);
    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Share Your Account/i)).toBeInTheDocument();
  });

  it("renders join household section when not in household", () => {
    vi.mocked(useHousehold).mockReturnValue(defaultMockProps);
    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Join a Household/i)).toBeInTheDocument();
  });

  it("has create and join buttons", () => {
    vi.mocked(useHousehold).mockReturnValue(defaultMockProps);
    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );
    expect(screen.getByRole("button", { name: /Create Household/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Join Household/i })).toBeInTheDocument();
  });

  it("renders loading spinner when loading", () => {
    vi.mocked(useHousehold).mockReturnValue({
      ...defaultMockProps,
      loading: true,
    } as unknown as ReturnType<typeof useHousehold>);
    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders household view when inHousehold is true", () => {
    vi.mocked(useHousehold).mockReturnValue({
      ...defaultMockProps,
      household: {
        householdId: "h1",
        name: "My House",
        adminUserId: "user1",
        myRole: "admin" as const,
        members: [],
      },
      loading: false,
      inHousehold: true,
      isAdmin: true,
    } as unknown as ReturnType<typeof useHousehold>);
    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );
    expect(screen.getByText("My House")).toBeInTheDocument();
  });

  it("calls createHousehold when Create Household is clicked", () => {
    const createHousehold = vi.fn();
    vi.mocked(useHousehold).mockReturnValue({
      ...defaultMockProps,
      createHousehold,
    } as unknown as ReturnType<typeof useHousehold>);

    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/e.g. The Smith Household/i);
    fireEvent.change(input, { target: { value: "Test House" } });
    fireEvent.click(screen.getByRole("button", { name: /Create Household/i }));

    expect(createHousehold).toHaveBeenCalledWith({ name: "Test House" });
  });

  it("shows validation error when creating with empty name", () => {
    vi.mocked(useHousehold).mockReturnValue(defaultMockProps);

    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Create Household/i }));

    expect(toast.error).toHaveBeenCalledWith("Enter a household name");
  });

  it("calls joinHousehold with invite code when Join Household is clicked", () => {
    const joinHousehold = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useHousehold).mockReturnValue({
      ...defaultMockProps,
      joinHousehold,
    } as unknown as ReturnType<typeof useHousehold>);

    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Paste invite link or code/i);
    fireEvent.change(input, { target: { value: "ABC123" } });
    fireEvent.click(screen.getByRole("button", { name: /Join Household/i }));

    expect(joinHousehold).toHaveBeenCalledWith({ code: "ABC123" });
  });

  it("extracts code from URL when joining with invite link", () => {
    const joinHousehold = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useHousehold).mockReturnValue({
      ...defaultMockProps,
      joinHousehold,
    } as unknown as ReturnType<typeof useHousehold>);

    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Paste invite link or code/i);
    fireEvent.change(input, { target: { value: "https://example.com/invite/XYZ789" } });
    fireEvent.click(screen.getByRole("button", { name: /Join Household/i }));

    expect(joinHousehold).toHaveBeenCalledWith({ code: "XYZ789" });
  });

  it("calls leaveHousehold when leaving household", () => {
    const leaveHousehold = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useHousehold).mockReturnValue({
      ...defaultMockProps,
      household: {
        householdId: "h1",
        name: "My House",
        adminUserId: "user1",
        myRole: "admin" as const,
        members: [
          {
            userId: "user1",
            role: "admin" as const,
            preferredName: "Admin User",
            email: "admin@test.com",
          },
        ],
      },
      loading: false,
      inHousehold: true,
      isAdmin: false,
      leaveHousehold,
    } as unknown as ReturnType<typeof useHousehold>);

    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Leave Household/i }));
    const confirmButton = screen.getByRole("button", { name: /Leave/i });
    fireEvent.click(confirmButton);

    expect(leaveHousehold).toHaveBeenCalled();
  });

  it("calls disbandHousehold when disbanding household", () => {
    const disbandHousehold = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useHousehold).mockReturnValue({
      ...defaultMockProps,
      household: {
        householdId: "h1",
        name: "My House",
        adminUserId: "user1",
        myRole: "admin" as const,
        members: [
          {
            userId: "user1",
            role: "admin" as const,
            preferredName: "Admin User",
            email: "admin@test.com",
          },
        ],
      },
      loading: false,
      inHousehold: true,
      isAdmin: true,
      disbandHousehold,
    } as unknown as ReturnType<typeof useHousehold>);

    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Disband Household/i }));
    const confirmButton = screen.getByRole("button", { name: /Disband/i });
    fireEvent.click(confirmButton);

    expect(disbandHousehold).toHaveBeenCalled();
  });

  it("calls removeMember when removing a member", () => {
    const removeMember = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useHousehold).mockReturnValue({
      ...defaultMockProps,
      household: {
        householdId: "h1",
        name: "My House",
        adminUserId: "user1",
        myRole: "admin" as const,
        members: [
          {
            userId: "user1",
            role: "admin" as const,
            preferredName: "Admin User",
            email: "admin@test.com",
          },
          {
            userId: "user2",
            role: "member" as const,
            preferredName: "Member User",
            email: "member@test.com",
          },
        ],
      },
      loading: false,
      inHousehold: true,
      isAdmin: true,
      removeMember,
    } as unknown as ReturnType<typeof useHousehold>);

    render(
      <BrowserRouter>
        <HouseholdPage />
      </BrowserRouter>
    );

    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    fireEvent.click(removeButtons[0]!);
    const confirmButton = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(confirmButton);

    expect(removeMember).toHaveBeenCalledWith({ userId: "user2" });
  });
});
