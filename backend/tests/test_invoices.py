def make_booking(client, **overrides):
    payload = {
        "guest_name": "Invoice Guest",
        "source": "direct",
        "status": "confirmed",
        "checkin": "2027-08-01",
        "checkout": "2027-08-05",
        "gross_amount": 2000,
        "cleaning_fee": 100,
        "deposit_amount": 500,
    }
    payload.update(overrides)
    return client.post("/api/bookings", json=payload).json()


def test_generate_invoice_creates_document(client):
    booking = make_booking(client)
    resp = client.post(f"/api/bookings/{booking['id']}/invoice")
    assert resp.status_code == 200
    doc = resp.json()
    assert doc["category"] == "invoices"
    assert doc["booking_id"] == booking["id"]
    assert doc["invoice_number"] == "CC-00001"


def test_invoice_number_stable_across_regeneration(client):
    booking = make_booking(client)
    first = client.post(f"/api/bookings/{booking['id']}/invoice").json()
    second = client.post(f"/api/bookings/{booking['id']}/invoice").json()
    assert first["invoice_number"] == second["invoice_number"]
    assert first["id"] == second["id"]


def test_invoice_number_increments_across_bookings(client):
    booking1 = make_booking(client, guest_name="Guest One")
    booking2 = make_booking(client, guest_name="Guest Two",
                             checkin="2027-09-01", checkout="2027-09-05")

    doc1 = client.post(f"/api/bookings/{booking1['id']}/invoice").json()
    doc2 = client.post(f"/api/bookings/{booking2['id']}/invoice").json()

    assert doc1["invoice_number"] == "CC-00001"
    assert doc2["invoice_number"] == "CC-00002"


def test_invoice_for_missing_booking_404(client):
    resp = client.post("/api/bookings/does-not-exist/invoice")
    assert resp.status_code == 404


def test_get_invoice_before_generation_404(client):
    booking = make_booking(client)
    resp = client.get(f"/api/bookings/{booking['id']}/invoice")
    assert resp.status_code == 404


def test_get_invoice_after_generation(client):
    booking = make_booking(client)
    client.post(f"/api/bookings/{booking['id']}/invoice")
    resp = client.get(f"/api/bookings/{booking['id']}/invoice")
    assert resp.status_code == 200
    assert resp.json()["booking_id"] == booking["id"]


def test_invoice_file_downloadable(client):
    booking = make_booking(client)
    doc = client.post(f"/api/bookings/{booking['id']}/invoice").json()
    resp = client.get(f"/api/documents/{doc['id']}/file")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
