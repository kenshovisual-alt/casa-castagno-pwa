def make_booking(client, **overrides):
    payload = {
        "guest_name": "Test Guest",
        "source": "direct",
        "status": "enquiry",
        "checkin": "2027-01-10",
        "checkout": "2027-01-15",
        "gross_amount": 1000,
    }
    payload.update(overrides)
    return client.post("/api/bookings", json=payload)


def test_create_and_get_booking(client):
    resp = make_booking(client)
    assert resp.status_code == 200
    body = resp.json()
    assert body["guest_name"] == "Test Guest"
    assert body["status"] == "enquiry"

    got = client.get(f"/api/bookings/{body['id']}")
    assert got.status_code == 200
    assert got.json()["id"] == body["id"]


def test_get_missing_booking_404(client):
    resp = client.get("/api/bookings/does-not-exist")
    assert resp.status_code == 404


def test_invalid_source_enum_rejected(client):
    resp = make_booking(client, source="not_a_real_source")
    assert resp.status_code == 422


def test_checkout_before_checkin_rejected(client):
    resp = make_booking(client, checkin="2027-02-10", checkout="2027-02-01")
    assert resp.status_code == 422


def test_checkout_equal_checkin_rejected(client):
    resp = make_booking(client, checkin="2027-02-10", checkout="2027-02-10")
    assert resp.status_code == 422


def test_other_agency_requires_agency_id(client):
    resp = make_booking(client, source="other_agency", agency_id="")
    assert resp.status_code == 422

    agency = client.post("/api/agencies", json={"name": "Test Agency", "commission_pct": 20}).json()
    resp2 = make_booking(client, source="other_agency", agency_id=agency["id"])
    assert resp2.status_code == 200


def test_enquiry_bookings_do_not_block_each_other(client):
    r1 = make_booking(client, guest_name="Alice", status="enquiry",
                       checkin="2027-03-01", checkout="2027-03-05")
    assert r1.status_code == 200

    r2 = make_booking(client, guest_name="Bob", status="enquiry",
                       checkin="2027-03-02", checkout="2027-03-04")
    assert r2.status_code == 200


def test_confirmed_booking_blocks_overlap(client):
    r1 = make_booking(client, guest_name="Alice", status="confirmed",
                       checkin="2027-04-01", checkout="2027-04-05")
    assert r1.status_code == 200

    r2 = make_booking(client, guest_name="Bob", status="tentative",
                       checkin="2027-04-02", checkout="2027-04-04")
    assert r2.status_code == 409


def test_confirmed_booking_does_not_block_adjacent_dates(client):
    r1 = make_booking(client, guest_name="Alice", status="confirmed",
                       checkin="2027-05-01", checkout="2027-05-05")
    assert r1.status_code == 200

    # Back-to-back stay starting exactly on the checkout date should be allowed.
    r2 = make_booking(client, guest_name="Bob", status="confirmed",
                       checkin="2027-05-05", checkout="2027-05-08")
    assert r2.status_code == 200


def test_cancelled_booking_does_not_block(client):
    r1 = make_booking(client, guest_name="Alice", status="confirmed",
                       checkin="2027-06-01", checkout="2027-06-05")
    booking_id = r1.json()["id"]
    client.put(f"/api/bookings/{booking_id}", json={"status": "cancelled"})

    r2 = make_booking(client, guest_name="Bob", status="confirmed",
                       checkin="2027-06-02", checkout="2027-06-04")
    assert r2.status_code == 200


def test_update_booking_excludes_itself_from_conflict_check(client):
    r1 = make_booking(client, guest_name="Alice", status="confirmed",
                       checkin="2027-07-01", checkout="2027-07-05")
    booking_id = r1.json()["id"]

    # Updating the same booking's own dates must not conflict with itself.
    resp = client.put(f"/api/bookings/{booking_id}", json={"checkin": "2027-07-02", "checkout": "2027-07-06"})
    assert resp.status_code == 200
    assert resp.json()["checkin"] == "2027-07-02"


def test_delete_booking(client):
    r1 = make_booking(client)
    booking_id = r1.json()["id"]
    resp = client.delete(f"/api/bookings/{booking_id}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] == 1
    assert client.get(f"/api/bookings/{booking_id}").status_code == 404


def test_link_experience_to_booking(client):
    booking = make_booking(client).json()
    experience = client.post("/api/experiences", json={"name": "Cooking class"}).json()

    resp = client.put(f"/api/bookings/{booking['id']}", json={"experience_ids": [experience["id"]]})
    assert resp.status_code == 200
    assert resp.json()["experience_ids"] == [experience["id"]]
