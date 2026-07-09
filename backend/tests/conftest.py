import sys
import uuid
from pathlib import Path

import pytest
from sqlmodel import SQLModel, create_engine

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import server as server_module  # noqa: E402


@pytest.fixture
def client(tmp_path):
    """Point the already-imported server module at a fresh, isolated SQLite DB per test.

    We deliberately avoid re-importing server.py per test: SQLModel registers each
    table class on a shared global metadata object, so re-executing the class
    definitions a second time raises "Table already defined for this MetaData".
    Swapping the module-level `engine` (and re-running its table creation against
    the *same* metadata/classes) gives full isolation without that collision.
    """
    db_path = tmp_path / f"test_{uuid.uuid4().hex}.db"
    invoices_dir = tmp_path / "invoices"
    invoices_dir.mkdir(exist_ok=True)

    test_engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(test_engine)

    server_module.engine = test_engine
    server_module.DB_PATH = db_path
    server_module.INVOICES_DIR = invoices_dir

    from fastapi.testclient import TestClient
    with TestClient(server_module.app) as c:
        yield c
