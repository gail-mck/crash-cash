# tools/__init__.py
#
# Marks tools/ as a regular Python package so "from tools import
# data_loader" and "from tools import validate_data" work both when
# running scripts directly (python3 tools/validate_data.py) and when
# importing from tests (python3 -m pytest tests/python).
