"""
tests/python/conftest.py

Pytest configuration shared by every test module under tests/python.

Its only job is to make sure the repo root is on sys.path before any
test module runs, so that "from tools import data_loader" and "from
tools import validate_data" resolve correctly no matter what directory
pytest was launched from. Running:

    python3 -m pytest tests/python

from the repo root already puts the repo root on sys.path via the
current working directory, but this file makes the import work in
other invocations too (for example running pytest from inside
tests/python directly).
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
