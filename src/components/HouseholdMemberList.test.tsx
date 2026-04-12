import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HouseholdMembersList, HouseholdActions } from "./HouseholdMemberList";

describe("HouseholdMembersList", () => {
  const members = [
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
  ];

  it("renders members with names", () => {
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user1"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Member User")).toBeInTheDocument();
  });

  it("shows admin badge for admin members", () => {
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user1"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows (you) for current user", () => {
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user1"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText(/\(you\)/)).toBeInTheDocument();
  });

  it("does not show (you) for other users", () => {
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user1"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    const memberTexts = screen.getAllByText(/User/);
    expect(memberTexts[1]?.textContent ?? "").not.toContain("(you)");
  });

  it("shows email when preferredName exists", () => {
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user1"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("member@test.com")).toBeInTheDocument();
  });

  it("shows email when no preferredName", () => {
    const membersWithNoName = [
      {
        userId: "user1",
        role: "member" as const,
        preferredName: null,
        email: "onlyemail@test.com",
      },
    ];
    render(
      <HouseholdMembersList
        members={membersWithNoName}
        currentUserId="user2"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("onlyemail@test.com")).toBeInTheDocument();
  });

  it("shows Unknown when no name or email", () => {
    const membersWithNoInfo = [
      { userId: "user1", role: "member" as const, preferredName: null, email: null },
    ];
    render(
      <HouseholdMembersList
        members={membersWithNoInfo}
        currentUserId="user2"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("shows remove button for admins when removing other users", () => {
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user1"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    expect(removeButtons).toHaveLength(1);
  });

  it("does not show remove button for non-admins", () => {
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user2"
        isAdmin={false}
        onRemove={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /Remove/i })).not.toBeInTheDocument();
  });

  it("does not show remove button for current user", () => {
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user1"
        isAdmin={true}
        onRemove={vi.fn()}
      />
    );

    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    expect(removeButtons).toHaveLength(1);
  });

  it("calls onRemove when remove is clicked", () => {
    const onRemove = vi.fn();
    render(
      <HouseholdMembersList
        members={members}
        currentUserId="user1"
        isAdmin={true}
        onRemove={onRemove}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.getByText("Remove member?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Remove$/ }));
    expect(onRemove).toHaveBeenCalledWith("user2");
  });
});

describe("HouseholdActions", () => {
  it("shows leave button for non-admins", () => {
    render(<HouseholdActions isAdmin={false} onLeave={vi.fn()} onDisband={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Leave Household/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Disband Household/i })).not.toBeInTheDocument();
  });

  it("shows disband button for admins", () => {
    render(<HouseholdActions isAdmin={true} onLeave={vi.fn()} onDisband={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Disband Household/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Leave Household/i })).not.toBeInTheDocument();
  });

  it("calls onLeave when leave is clicked", () => {
    const onLeave = vi.fn();
    render(<HouseholdActions isAdmin={false} onLeave={onLeave} onDisband={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Leave Household/i }));
    expect(screen.getByText("Leave household?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Leave$/ }));
    expect(onLeave).toHaveBeenCalled();
  });

  it("calls onDisband when disband is clicked", () => {
    const onDisband = vi.fn();
    render(<HouseholdActions isAdmin={true} onLeave={vi.fn()} onDisband={onDisband} />);

    fireEvent.click(screen.getByRole("button", { name: /Disband Household/i }));
    expect(screen.getByText("Disband household?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Disband$/ }));
    expect(onDisband).toHaveBeenCalled();
  });
});
