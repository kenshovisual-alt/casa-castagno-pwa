import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { api } from "../lib/api";

jest.mock("../lib/api");

const baseStats = {
  month_gross: 1000,
  gross_total: 5000,
  commission_total: 500,
  net_total: 4500,
  direct_revenue: 3000,
  agency_revenue: 2000,
  confirmed_count: 2,
  pending_payments: 800,
  upcoming_arrivals: [],
  upcoming_departures: [],
  current_stay: null,
  next_bookings: [],
  total_nights: 40,
  nights_this_year: 20,
  occupancy_pct: 5.5,
  monthly_series: [{ month: "Jan 2027", revenue: 1000 }],
  source_breakdown: { direct: 1, tuscany_now: 1, other_agency: 0, referral: 0 },
  urgent_tasks: [],
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    api.stats.mockReset();
  });

  test("shows a loading skeleton before stats arrive", () => {
    api.stats.mockReturnValue(new Promise(() => {})); // never resolves
    renderDashboard();
    expect(screen.getByTestId("page-skeleton")).toBeInTheDocument();
  });

  test("renders KPI cards once stats load", async () => {
    api.stats.mockResolvedValue(baseStats);
    renderDashboard();

    await waitFor(() => expect(screen.getByTestId("kpi-gross")).toBeInTheDocument());
    expect(screen.getByTestId("kpi-occupancy")).toHaveTextContent("5.5%");
    expect(screen.getByTestId("kpi-confirmed")).toHaveTextContent("2");
  });

  test("shows empty state when there are no upcoming bookings", async () => {
    api.stats.mockResolvedValue(baseStats);
    renderDashboard();

    await waitFor(() => expect(screen.getByTestId("next-bookings")).toBeInTheDocument());
    expect(screen.getByText("Nothing upcoming.")).toBeInTheDocument();
  });
});
