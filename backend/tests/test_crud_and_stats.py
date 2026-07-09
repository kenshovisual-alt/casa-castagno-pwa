def test_provider_crud_roundtrip(client):
    created = client.post("/api/providers", json={"name": "Marco Rossi", "type": "chef"}).json()
    assert created["name"] == "Marco Rossi"

    updated = client.put(f"/api/providers/{created['id']}", json={"reliability": 3}).json()
    assert updated["reliability"] == 3
    assert updated["name"] == "Marco Rossi"  # untouched fields preserved

    deleted = client.delete(f"/api/providers/{created['id']}").json()
    assert deleted["deleted"] == 1


def test_invalid_provider_type_rejected(client):
    resp = client.post("/api/providers", json={"name": "X", "type": "not_a_real_type"})
    assert resp.status_code == 422


def test_delete_missing_item_returns_zero(client):
    resp = client.delete("/api/providers/does-not-exist")
    assert resp.status_code == 200
    assert resp.json()["deleted"] == 0


def test_list_pagination(client):
    for i in range(5):
        client.post("/api/providers", json={"name": f"Provider {i}"})

    all_items = client.get("/api/providers").json()
    assert len(all_items) == 5

    first_page = client.get("/api/providers?limit=2&offset=0").json()
    second_page = client.get("/api/providers?limit=2&offset=2").json()
    assert len(first_page) == 2
    assert len(second_page) == 2
    assert {i["id"] for i in first_page}.isdisjoint({i["id"] for i in second_page})


def test_dashboard_stats_shape(client):
    client.post("/api/seed")
    resp = client.get("/api/stats/dashboard")
    assert resp.status_code == 200
    body = resp.json()
    for key in ("gross_total", "commission_total", "net_total", "occupancy_pct",
                "nights_this_year", "pending_payments", "urgent_tasks", "monthly_series"):
        assert key in body


def test_dashboard_occupancy_is_bounded(client):
    client.post("/api/seed")
    body = client.get("/api/stats/dashboard").json()
    assert 0 <= body["occupancy_pct"] <= 100


def test_agency_crud(client):
    created = client.post("/api/agencies", json={"name": "Tuscany Now", "commission_pct": 30}).json()
    assert created["commission_pct"] == 30

    listed = client.get("/api/agencies").json()
    assert any(a["id"] == created["id"] for a in listed)
