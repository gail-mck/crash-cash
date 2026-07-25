"""
tools/validate_data.py

Standalone validation script for the Crash Cash data files.

Run it directly:

    python3 tools/validate_data.py

It loads data/jobs.js, data/events.js, and data/glossary.js through
tools.data_loader (without executing any JavaScript), checks the data
against the rules described in each data file's docstring, and also
scans the whole repository for em dash characters, which the project
style guide forbids everywhere.

Every check below is a small function that returns a list of human
readable error strings (an empty list means the check passed). Keeping
the checks as plain functions, instead of burying them inside main(),
is what lets tests/python/test_data_integrity.py import and exercise
each rule directly, including feeding it deliberately bad synthetic
records to prove the validator actually catches problems.

main() only loads the data, calls every check, prints a report, and
returns a process exit code (0 = all good, 1 = at least one problem).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# Allow running this file directly as `python3 tools/validate_data.py`
# (where the repo root is not automatically on sys.path) as well as
# importing it as `tools.validate_data` from tests or other tooling.
_REPO_ROOT_FOR_IMPORT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT_FOR_IMPORT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT_FOR_IMPORT))

from tools import data_loader  # noqa: E402  (import after sys.path setup)

REPO_ROOT = Path(__file__).resolve().parent.parent

# ---- Shared vocabularies pulled from the data file docstrings ----

VALID_MIN_AGES = {12, 14, 16, 18, 22}
VALID_JOB_TYPES = {"hourly", "salary"}
VALID_RETIREMENT_KINDS = {"401k", "403b", None}
VALID_EVENT_KINDS = {"expense", "windfall"}

# Realistic pay sanity bounds in USD.
WAGE_MIN, WAGE_MAX = 5, 150
SALARY_MIN, SALARY_MAX = 20000, 300000

GLOSSARY_CATEGORIES = {
    "Earning",
    "Taxes",
    "Banking",
    "Credit & Debt",
    "Saving & Investing",
    "Budgeting",
}

MIN_GLOSSARY_DEFINITION_LENGTH = 40

# Fields required on every record of each dataset.
JOB_REQUIRED_FIELDS = [
    "id", "title", "category", "type", "wage", "salary", "minAge",
    "defaultHours", "maxHours", "benefitsEligible", "matchPct",
    "matchCapPct", "healthMonthly", "retirementKind", "blurb",
]
EVENT_REQUIRED_FIELDS = [
    "id", "title", "emoji", "kind", "amountMin", "amountMax",
    "minAge", "weight", "blurb", "lesson",
]
GLOSSARY_REQUIRED_FIELDS = ["id", "term", "definition", "category"]

# Em dash scan configuration. Built with chr() from its Unicode code
# point (U+2014) rather than embedded as a literal character, so this
# source file itself never contains a raw em dash byte sequence, which
# is consistent with the project's own style rule against em dashes.
EM_DASH = chr(0x2014)
SCAN_EXTENSIONS = {".js", ".md", ".py", ".html", ".css"}
EXCLUDED_DIR_NAMES = {".git", "node_modules"}


def _is_number(value: Any) -> bool:
    """True for int/float values, but explicitly false for bool.

    Python's bool is a subclass of int, so isinstance(True, int) is
    True. Every numeric field in the data (wage, salary, weight, and so
    on) should reject an accidental True/False, so this helper is used
    instead of a bare isinstance(..., (int, float)) check.
    """
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _require_fields(record: dict[str, Any], fields: list[str], context: str) -> list[str]:
    """Return one error string per field missing from record."""
    return [
        f"{context}: missing required field '{field}'"
        for field in fields
        if field not in record
    ]


def check_unique_ids(records: list[dict[str, Any]], dataset_name: str) -> list[str]:
    """Every record's 'id' must be unique within its dataset."""
    errors: list[str] = []
    seen: dict[Any, int] = {}
    for idx, record in enumerate(records):
        rid = record.get("id")
        if rid is None:
            errors.append(f"{dataset_name}[{idx}]: missing 'id' field")
            continue
        if rid in seen:
            errors.append(
                f"{dataset_name}[{idx}]: duplicate id '{rid}' "
                f"(first seen at index {seen[rid]})"
            )
        else:
            seen[rid] = idx
    return errors


def check_jobs(jobs: list[dict[str, Any]], job_categories: list[str]) -> list[str]:
    """Validate every job record against the rules in data/jobs.js.

    Checks required fields, type in {hourly, salary} with the matching
    wage/salary numeric rule, minAge, defaultHours <= maxHours, the
    benefitsEligible implication on matchPct/healthMonthly, category
    membership in JOB_CATEGORIES, and realistic pay sanity bounds.
    """
    errors: list[str] = []
    category_set = set(job_categories)

    for idx, job in enumerate(jobs):
        ctx = f"jobs[{idx}] ({job.get('id', '?')})"
        missing = _require_fields(job, JOB_REQUIRED_FIELDS, ctx)
        errors.extend(missing)
        if missing:
            # Cannot safely check types/values below when fields are
            # absent, so move on to the next record.
            continue

        if not isinstance(job["id"], str) or not job["id"]:
            errors.append(f"{ctx}: 'id' must be a non-empty string")
        if not isinstance(job["title"], str) or not job["title"]:
            errors.append(f"{ctx}: 'title' must be a non-empty string")
        if not isinstance(job["blurb"], str) or not job["blurb"]:
            errors.append(f"{ctx}: 'blurb' must be a non-empty string")

        if job["category"] not in category_set:
            errors.append(
                f"{ctx}: category '{job['category']}' is not one of "
                f"JOB_CATEGORIES {sorted(category_set)}"
            )

        if job["type"] not in VALID_JOB_TYPES:
            errors.append(
                f"{ctx}: type '{job['type']}' must be one of {sorted(VALID_JOB_TYPES)}"
            )
        elif job["type"] == "hourly":
            wage = job["wage"]
            if not _is_number(wage) or wage <= 0:
                errors.append(f"{ctx}: hourly job must have numeric wage > 0, got {wage!r}")
            elif not (WAGE_MIN <= wage <= WAGE_MAX):
                errors.append(
                    f"{ctx}: wage {wage} is outside the realistic range "
                    f"[{WAGE_MIN}, {WAGE_MAX}]"
                )
            if job["salary"] is not None:
                errors.append(
                    f"{ctx}: hourly job must have salary == null, got {job['salary']!r}"
                )
        elif job["type"] == "salary":
            salary = job["salary"]
            if not _is_number(salary) or salary <= 0:
                errors.append(
                    f"{ctx}: salaried job must have numeric salary > 0, got {salary!r}"
                )
            elif not (SALARY_MIN <= salary <= SALARY_MAX):
                errors.append(
                    f"{ctx}: salary {salary} is outside the realistic range "
                    f"[{SALARY_MIN}, {SALARY_MAX}]"
                )
            if job["wage"] is not None:
                errors.append(
                    f"{ctx}: salaried job must have wage == null, got {job['wage']!r}"
                )

        if job["minAge"] not in VALID_MIN_AGES:
            errors.append(
                f"{ctx}: minAge {job['minAge']} must be one of {sorted(VALID_MIN_AGES)}"
            )

        default_hours = job["defaultHours"]
        max_hours = job["maxHours"]
        if not _is_number(default_hours) or not _is_number(max_hours):
            errors.append(f"{ctx}: defaultHours and maxHours must be numeric")
        elif default_hours > max_hours:
            errors.append(
                f"{ctx}: defaultHours ({default_hours}) exceeds maxHours ({max_hours})"
            )

        if not isinstance(job["benefitsEligible"], bool):
            errors.append(f"{ctx}: benefitsEligible must be a boolean")
        elif job["benefitsEligible"] is False:
            if job["matchPct"] != 0:
                errors.append(
                    f"{ctx}: benefitsEligible is False but matchPct is "
                    f"{job['matchPct']} (expected 0)"
                )
            if job["healthMonthly"] != 0:
                errors.append(
                    f"{ctx}: benefitsEligible is False but healthMonthly is "
                    f"{job['healthMonthly']} (expected 0)"
                )

        if job["retirementKind"] not in VALID_RETIREMENT_KINDS:
            errors.append(
                f"{ctx}: retirementKind '{job['retirementKind']}' must be one "
                f"of {sorted(k for k in VALID_RETIREMENT_KINDS if k is not None)} or null"
            )

    return errors


def check_events(events: list[dict[str, Any]]) -> list[str]:
    """Validate every event record against the rules in data/events.js.

    Checks required fields, kind in {expense, windfall}, 0 < amountMin
    <= amountMax, weight between 1 and 10, and a valid minAge band.
    """
    errors: list[str] = []
    for idx, event in enumerate(events):
        ctx = f"events[{idx}] ({event.get('id', '?')})"
        missing = _require_fields(event, EVENT_REQUIRED_FIELDS, ctx)
        errors.extend(missing)
        if missing:
            continue

        if event["kind"] not in VALID_EVENT_KINDS:
            errors.append(
                f"{ctx}: kind '{event['kind']}' must be one of {sorted(VALID_EVENT_KINDS)}"
            )

        amount_min = event["amountMin"]
        amount_max = event["amountMax"]
        if not _is_number(amount_min) or not _is_number(amount_max):
            errors.append(f"{ctx}: amountMin and amountMax must be numeric")
        else:
            if amount_min <= 0:
                errors.append(f"{ctx}: amountMin must be > 0, got {amount_min}")
            if amount_min > amount_max:
                errors.append(
                    f"{ctx}: amountMin ({amount_min}) exceeds amountMax ({amount_max})"
                )

        weight = event["weight"]
        if not _is_number(weight) or not (1 <= weight <= 10):
            errors.append(f"{ctx}: weight {weight} must be between 1 and 10")

        if event["minAge"] not in VALID_MIN_AGES:
            errors.append(
                f"{ctx}: minAge {event['minAge']} must be one of {sorted(VALID_MIN_AGES)}"
            )

    return errors


def check_glossary(glossary: list[dict[str, Any]]) -> list[str]:
    """Validate every glossary entry against the rules in data/glossary.js.

    Checks required fields, a minimum definition length (so entries
    stay genuinely explanatory rather than a one-liner), and category
    membership in the six known glossary categories.
    """
    errors: list[str] = []
    for idx, entry in enumerate(glossary):
        ctx = f"glossary[{idx}] ({entry.get('id', '?')})"
        missing = _require_fields(entry, GLOSSARY_REQUIRED_FIELDS, ctx)
        errors.extend(missing)
        if missing:
            continue

        definition = entry["definition"]
        if not isinstance(definition, str):
            errors.append(f"{ctx}: definition must be a string")
        elif len(definition) < MIN_GLOSSARY_DEFINITION_LENGTH:
            errors.append(
                f"{ctx}: definition is only {len(definition)} characters, "
                f"must be at least {MIN_GLOSSARY_DEFINITION_LENGTH}"
            )

        if entry["category"] not in GLOSSARY_CATEGORIES:
            errors.append(
                f"{ctx}: category '{entry['category']}' must be one of "
                f"{sorted(GLOSSARY_CATEGORIES)}"
            )

    return errors


def check_ids_all(data: dict[str, Any]) -> list[str]:
    """Run the unique-id check across every dataset."""
    errors: list[str] = []
    errors.extend(check_unique_ids(data["jobs"], "jobs"))
    errors.extend(check_unique_ids(data["events"], "events"))
    errors.extend(check_unique_ids(data["glossary"], "glossary"))
    return errors


def scan_for_em_dashes(root: Path | None = None) -> list[str]:
    """Scan the repo for em dash characters in source and doc files.

    Crash Cash's style rules forbid em dashes anywhere. Returns one
    error string per offending file, naming the 1-based line numbers
    where the character appears. Skips .git and node_modules.
    """
    root = root or REPO_ROOT
    errors: list[str] = []

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix not in SCAN_EXTENSIONS:
            continue
        if any(part in EXCLUDED_DIR_NAMES for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if EM_DASH in text:
            lines = [i + 1 for i, line in enumerate(text.splitlines()) if EM_DASH in line]
            rel = path.relative_to(root)
            errors.append(f"{rel}: contains em dash character(s) on line(s) {lines}")

    return errors


def run_all_checks() -> dict[str, list[str]]:
    """Load all datasets and run every check, grouped by check name.

    Returns a dict mapping a human readable check name to the list of
    error strings it produced (empty list means that check passed).
    """
    data = data_loader.load_all()
    return {
        "unique ids": check_ids_all(data),
        "jobs": check_jobs(data["jobs"], data["job_categories"]),
        "events": check_events(data["events"]),
        "glossary": check_glossary(data["glossary"]),
        "em dash scan": scan_for_em_dashes(),
    }


def main() -> int:
    """Run all checks, print a readable report, and return an exit code."""
    try:
        results = run_all_checks()
    except data_loader.DataParseError as exc:
        print(f"FAILED to load data files: {exc}")
        return 1

    total_errors = 0
    for check_name, errors in results.items():
        if errors:
            print(f"[FAIL] {check_name}: {len(errors)} problem(s)")
            for error in errors:
                print(f"    - {error}")
        else:
            print(f"[PASS] {check_name}")
        total_errors += len(errors)

    print()
    if total_errors == 0:
        print("All checks passed.")
        return 0

    print(f"{total_errors} total problem(s) found.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
