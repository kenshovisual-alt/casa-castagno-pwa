def test_seed_populates_expected_counts(client):
    resp = client.post("/api/seed")
    assert resp.status_code == 200
    body = resp.json()
    assert body["seeded"] is True
    assert body["bookings"] == 5
    assert body["experiences"] == 10
    assert body["providers"] == 10
    assert body["documents"] == 4
    assert body["tasks"] == 5
    assert body["agencies"] == 1

    assert len(client.get("/api/bookings").json()) == 5
    assert len(client.get("/api/experiences").json()) == 10
    assert len(client.get("/api/providers").json()) == 10


def test_reseed_clears_previous_data(client):
    client.post("/api/bookings", json={
        "guest_name": "Manual Booking", "checkin": "2027-09-01", "checkout": "2027-09-05",
    })
    assert len(client.get("/api/bookings").json()) == 1

    client.post("/api/seed")
    bookings = client.get("/api/bookings").json()
    assert len(bookings) == 5
    assert all(b["guest_name"] != "Manual Booking" for b in bookings)


def test_seed_upserts_property_and_settings_not_wipe(client):
    client.put("/api/settings", json={"owner_name": "Custom Owner"})
    client.post("/api/seed")
    settings = client.get("/api/settings").json()
    # seed resets Settings fields to defaults (per its documented upsert behavior),
    # but the row itself must still exist as a singleton, not be deleted.
    assert settings["id"] == "singleton"


def test_get_settings_default(client):
    resp = client.get("/api/settings")
    assert resp.status_code == 200
    body = resp.json()
    assert body["default_commission"] == 25
    assert body["invoice_prefix"] == "CC"


def test_update_settings_persists(client):
    resp = client.put("/api/settings", json={"default_commission": 30, "owner_name": "Jane"})
    assert resp.status_code == 200
    assert resp.json()["default_commission"] == 30

    got = client.get("/api/settings").json()
    assert got["default_commission"] == 30
    assert got["owner_name"] == "Jane"


def test_get_property_default(client):
    resp = client.get("/api/property")
    assert resp.status_code == 200
    assert resp.json()["id"] == "singleton"


def test_update_property_persists(client):
    resp = client.put("/api/property", json={"house_notes": "Renovated in 2026"})
    assert resp.status_code == 200
    assert resp.json()["house_notes"] == "Renovated in 2026"

    got = client.get("/api/property").json()
    assert got["house_notes"] == "Renovated in 2026"


def test_export_all_data(client):
    client.post("/api/seed")
    resp = client.get("/api/export")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["bookings"]) == 5
    assert "settings" in body
    assert "property" in body
    assert "exported_at" in body
