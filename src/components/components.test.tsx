import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { NavLink } from "./NavLink";
import { DashboardStats } from "./DashboardStats";
import { TierProgress } from "./TierProgress";

describe("Application Components", () => {
  it("renders NavLink", () => {
    render(
      <BrowserRouter>
        <NavLink to="/">Home</NavLink>
      </BrowserRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders DashboardStats", () => {
    render(
      <BrowserRouter>
        <DashboardStats
          unitsThisMonth={100}
          costThisMonth={342}
          averageMonthlyUsage={300}
          dailyAverage={10}
          averageMonthlyCost={1000}
        />
      </BrowserRouter>
    );
    expect(screen.getByText(/100 kWh/)).toBeInTheDocument();
    expect(screen.getByText(/Calculator/)).toBeInTheDocument();
  });

  it("renders TierProgress", () => {
    render(<TierProgress unitsBought={50} />);
    expect(screen.getByText(/Tier 1/)).toBeInTheDocument();
    expect(screen.getByText(/50 \/ 100 kWh/)).toBeInTheDocument();
  });
});
