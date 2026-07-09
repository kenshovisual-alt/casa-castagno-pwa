import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import BookingForm from "./BookingForm";
import { api } from "../lib/api";

jest.mock("../lib/api");

function renderForm() {
  return render(
    <MemoryRouter initialEntries={["/bookings/new"]}>
      <BookingForm />
    </MemoryRouter>
  );
}

describe("BookingForm", () => {
  beforeEach(() => {
    api.list.mockReset();
    api.create.mockReset();
    api.singleton.mockReset();
    api.list.mockImplementation((resource) =>
      Promise.resolve(resource === "agencies" ? [] : [])
    );
    api.singleton.mockResolvedValue({ default_commission: 25, property_capacity: 12 });
  });

  test("blocks submit when check-out is before check-in", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByTestId("f-guest-name"), "Alice Test");
    await user.type(screen.getByTestId("f-checkin"), "2027-08-05");
    await user.type(screen.getByTestId("f-checkout"), "2027-08-01");
    await user.click(screen.getByTestId("btn-save-booking"));

    await waitFor(() =>
      expect(screen.getByTestId("date-conflict-error")).toHaveTextContent(
        "Check-out date must be after check-in date"
      )
    );
    expect(api.create).not.toHaveBeenCalled();
  });

  test("submits a valid booking and creates it via the API", async () => {
    api.create.mockResolvedValue({ id: "new-booking-id" });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByTestId("f-guest-name"), "Alice Test");
    await user.type(screen.getByTestId("f-checkin"), "2027-08-01");
    await user.type(screen.getByTestId("f-checkout"), "2027-08-05");
    await user.click(screen.getByTestId("btn-save-booking"));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    const [resource, payload] = api.create.mock.calls[0];
    expect(resource).toBe("bookings");
    expect(payload.guest_name).toBe("Alice Test");
    expect(payload.checkin).toBe("2027-08-01");
    expect(payload.checkout).toBe("2027-08-05");
  });

  test("blocks submit when source is other_agency with no agency selected", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByTestId("f-guest-name"), "Alice Test");
    await user.type(screen.getByTestId("f-checkin"), "2027-08-01");
    await user.type(screen.getByTestId("f-checkout"), "2027-08-05");
    await user.selectOptions(screen.getByTestId("f-source"), "other_agency");
    await user.click(screen.getByTestId("btn-save-booking"));

    await waitFor(() => expect(api.create).not.toHaveBeenCalled());
  });
});
