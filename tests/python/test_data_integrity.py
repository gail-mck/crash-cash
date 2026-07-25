"""
tests/python/test_data_integrity.py

Pytest suite for the Crash Cash data pipeline: tools/data_loader.py and
tools/validate_data.py.

Run with:

    python3 -m pytest tests/python -q

The suite is split into three groups:

  1. Loader tests: confirm data_loader can actually parse the real
     data/*.js files into non-empty Python lists of the expected shape,
     and that it raises DataParseError with useful context when a file
     is malformed.

  2. Rule tests: confirm the real data in data/*.js currently satisfies
     every validation rule (unique ids, field types, pay bounds, and so
     on), each rule as its own test function so a failure points
     straight at the broken rule.

  3. Validator self-tests: feed the check_* functions deliberately bad
     synthetic records and assert they produce errors. This is the part
     that proves the validator itself works, not just that today's data
     happens to be clean.
"""

from __future__ import annotations

import copy

import pytest

from tools import data_loader, validate_data

# ---------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------


@pytest.fixture(scope="session")
def loaded_data() -> dict:
    """Load every dataset once per test session."""
    return data_loader.load_all()


@pytest.fixture()
def valid_job() -> dict:
    """A known-good job record to mutate in the validator self-tests."""
    return {
        "id": "test-job",
        "title": "Test Job",
        "category": "Teen Jobs",
        "type": "hourly",
        "wage": 15,
        "salary": None,
        "minAge": 16,
        "defaultHours": 10,
        "maxHours": 20,
        "benefitsEligible": False,
        "matchPct": 0,
        "matchCapPct": 0,
        "healthMonthly": 0,
        "retirementKind": None,
        "blurb": "A job used only for validator self-tests.",
    }


@pytest.fixture()
def valid_event() -> dict:
    """A known-good event record to mutate in the validator self-tests."""
    return {
        "id": "test-event",
        "title": "Test Event",
        "emoji": "🧪",
        "kind": "expense",
        "amountMin": 10,
        "amountMax": 20,
        "minAge": 12,
        "weight": 5,
        "blurb": "Something happens for testing purposes.",
        "lesson": "This is only used to exercise the validator.",
    }


@pytest.fixture()
def valid_glossary_entry() -> dict:
    """A known-good glossary record to mutate in the validator self-tests."""
    return {
        "id": "test-term",
        "term": "Test Term",
        "definition": (
            "This definition is deliberately written to be at least forty "
            "characters long so it passes the length check."
        ),
        "category": "Budgeting",
    }


# ---------------------------------------------------------------------
# 1. Loader tests
# ---------------------------------------------------------------------


class TestLoaderLoadsRealData:
    def test_load_jobs_returns_nonempty_list_of_dicts(self, loaded_data: dict) -> None:
        jobs = loaded_data["jobs"]
        assert isinstance(jobs, list)
        assert len(jobs) >= 30
        assert all(isinstance(job, dict) for job in jobs)

    def test_load_events_returns_nonempty_list_of_dicts(self, loaded_data: dict) -> None:
        events = loaded_data["events"]
        assert isinstance(events, list)
        assert len(events) >= 25
        assert all(isinstance(event, dict) for event in events)

    def test_load_glossary_returns_nonempty_list_of_dicts(self, loaded_data: dict) -> None:
        glossary = loaded_data["glossary"]
        assert isinstance(glossary, list)
        assert len(glossary) >= 40
        assert all(isinstance(entry, dict) for entry in glossary)

    def test_load_job_categories_returns_nonempty_string_list(self, loaded_data: dict) -> None:
        categories = loaded_data["job_categories"]
        assert isinstance(categories, list)
        assert len(categories) >= 1
        assert all(isinstance(c, str) and c for c in categories)

    def test_load_all_keys(self, loaded_data: dict) -> None:
        assert set(loaded_data.keys()) == {"jobs", "job_categories", "events", "glossary"}


class TestLoaderErrorHandling:
    def test_missing_export_raises_data_parse_error(self, tmp_path) -> None:
        """A file that doesn't export the requested name should fail clearly."""
        bad_file = tmp_path / "broken.js"
        bad_file.write_text("export const SOMETHING_ELSE = [1, 2, 3];\n", encoding="utf-8")

        # Point the loader at a temp "data dir" containing our broken file.
        original_data_dir = data_loader.DATA_DIR
        try:
            data_loader.DATA_DIR = tmp_path
            with pytest.raises(data_loader.DataParseError) as exc_info:
                data_loader._load_export("broken.js", "JOBS")
            assert "broken.js" in str(exc_info.value)
        finally:
            data_loader.DATA_DIR = original_data_dir

    def test_unmatched_bracket_raises_data_parse_error(self, tmp_path) -> None:
        """A file whose array literal never closes should fail clearly."""
        bad_file = tmp_path / "broken.js"
        bad_file.write_text("export const JOBS = [ { id: 'x' }\n", encoding="utf-8")

        original_data_dir = data_loader.DATA_DIR
        try:
            data_loader.DATA_DIR = tmp_path
            with pytest.raises(data_loader.DataParseError):
                data_loader._load_export("broken.js", "JOBS")
        finally:
            data_loader.DATA_DIR = original_data_dir

    def test_apostrophe_inside_single_quoted_string_is_handled(self, tmp_path) -> None:
        """Escaped apostrophes like \\' must survive the JS-to-JSON conversion.

        This mirrors real entries in data/glossary.js, for example the
        phrase "range's rate" inside a single quoted definition string.
        """
        js_text = (
            "export const GLOSSARY = [\n"
            "  { id: 'x', term: 'X', definition: 'It is today\\'s value.', "
            "category: 'Budgeting' }\n"
            "];\n"
        )
        js_file = tmp_path / "glossary.js"
        js_file.write_text(js_text, encoding="utf-8")

        original_data_dir = data_loader.DATA_DIR
        try:
            data_loader.DATA_DIR = tmp_path
            result = data_loader._load_export("glossary.js", "GLOSSARY")
        finally:
            data_loader.DATA_DIR = original_data_dir

        assert result == [
            {
                "id": "x",
                "term": "X",
                "definition": "It is today's value.",
                "category": "Budgeting",
            }
        ]


# ---------------------------------------------------------------------
# 2. Rule tests against the real data
# ---------------------------------------------------------------------


class TestUniqueIds:
    def test_job_ids_unique(self, loaded_data: dict) -> None:
        errors = validate_data.check_unique_ids(loaded_data["jobs"], "jobs")
        assert errors == []

    def test_event_ids_unique(self, loaded_data: dict) -> None:
        errors = validate_data.check_unique_ids(loaded_data["events"], "events")
        assert errors == []

    def test_glossary_ids_unique(self, loaded_data: dict) -> None:
        errors = validate_data.check_unique_ids(loaded_data["glossary"], "glossary")
        assert errors == []


class TestJobRules:
    def test_all_jobs_pass_check_jobs(self, loaded_data: dict) -> None:
        errors = validate_data.check_jobs(loaded_data["jobs"], loaded_data["job_categories"])
        assert errors == []

    def test_every_job_type_is_hourly_or_salary(self, loaded_data: dict) -> None:
        for job in loaded_data["jobs"]:
            assert job["type"] in validate_data.VALID_JOB_TYPES

    def test_hourly_jobs_have_positive_wage_and_null_salary(self, loaded_data: dict) -> None:
        for job in loaded_data["jobs"]:
            if job["type"] == "hourly":
                assert job["wage"] is not None and job["wage"] > 0
                assert job["salary"] is None

    def test_salaried_jobs_have_positive_salary_and_null_wage(self, loaded_data: dict) -> None:
        for job in loaded_data["jobs"]:
            if job["type"] == "salary":
                assert job["salary"] is not None and job["salary"] > 0
                assert job["wage"] is None

    def test_every_job_min_age_is_valid(self, loaded_data: dict) -> None:
        for job in loaded_data["jobs"]:
            assert job["minAge"] in validate_data.VALID_MIN_AGES

    def test_default_hours_never_exceeds_max_hours(self, loaded_data: dict) -> None:
        for job in loaded_data["jobs"]:
            assert job["defaultHours"] <= job["maxHours"]

    def test_non_benefits_eligible_jobs_have_zero_match_and_health(self, loaded_data: dict) -> None:
        for job in loaded_data["jobs"]:
            if job["benefitsEligible"] is False:
                assert job["matchPct"] == 0
                assert job["healthMonthly"] == 0

    def test_every_job_category_is_a_known_category(self, loaded_data: dict) -> None:
        categories = set(loaded_data["job_categories"])
        for job in loaded_data["jobs"]:
            assert job["category"] in categories

    def test_wages_within_realistic_bounds(self, loaded_data: dict) -> None:
        for job in loaded_data["jobs"]:
            if job["type"] == "hourly":
                assert validate_data.WAGE_MIN <= job["wage"] <= validate_data.WAGE_MAX

    def test_salaries_within_realistic_bounds(self, loaded_data: dict) -> None:
        for job in loaded_data["jobs"]:
            if job["type"] == "salary":
                assert validate_data.SALARY_MIN <= job["salary"] <= validate_data.SALARY_MAX


class TestEventRules:
    def test_all_events_pass_check_events(self, loaded_data: dict) -> None:
        errors = validate_data.check_events(loaded_data["events"])
        assert errors == []

    def test_every_event_kind_is_expense_or_windfall(self, loaded_data: dict) -> None:
        for event in loaded_data["events"]:
            assert event["kind"] in validate_data.VALID_EVENT_KINDS

    def test_amount_min_positive_and_le_amount_max(self, loaded_data: dict) -> None:
        for event in loaded_data["events"]:
            assert event["amountMin"] > 0
            assert event["amountMin"] <= event["amountMax"]

    def test_weight_within_one_to_ten(self, loaded_data: dict) -> None:
        for event in loaded_data["events"]:
            assert 1 <= event["weight"] <= 10

    def test_every_event_min_age_is_valid(self, loaded_data: dict) -> None:
        for event in loaded_data["events"]:
            assert event["minAge"] in validate_data.VALID_MIN_AGES


class TestGlossaryRules:
    def test_all_glossary_entries_pass_check_glossary(self, loaded_data: dict) -> None:
        errors = validate_data.check_glossary(loaded_data["glossary"])
        assert errors == []

    def test_definitions_are_at_least_forty_characters(self, loaded_data: dict) -> None:
        for entry in loaded_data["glossary"]:
            assert len(entry["definition"]) >= validate_data.MIN_GLOSSARY_DEFINITION_LENGTH

    def test_every_glossary_category_is_known(self, loaded_data: dict) -> None:
        for entry in loaded_data["glossary"]:
            assert entry["category"] in validate_data.GLOSSARY_CATEGORIES


class TestEmDashScan:
    def test_repo_has_no_em_dashes(self) -> None:
        errors = validate_data.scan_for_em_dashes()
        assert errors == []


class TestRunAllChecks:
    def test_run_all_checks_reports_no_errors_on_real_data(self) -> None:
        results = validate_data.run_all_checks()
        flattened = [error for errors in results.values() for error in errors]
        assert flattened == []


# ---------------------------------------------------------------------
# 3. Validator self-tests: prove the checks actually catch problems
# ---------------------------------------------------------------------


class TestValidatorCatchesBadJobRecords:
    def test_duplicate_job_ids_are_caught(self, valid_job: dict) -> None:
        other = copy.deepcopy(valid_job)
        errors = validate_data.check_unique_ids([valid_job, other], "jobs")
        assert any("duplicate id" in e for e in errors)

    def test_missing_field_is_caught(self, valid_job: dict) -> None:
        del valid_job["wage"]
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("missing required field 'wage'" in e for e in errors)

    def test_invalid_type_is_caught(self, valid_job: dict) -> None:
        valid_job["type"] = "contract"
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("type 'contract'" in e for e in errors)

    def test_hourly_job_with_zero_wage_is_caught(self, valid_job: dict) -> None:
        valid_job["wage"] = 0
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("wage > 0" in e for e in errors)

    def test_hourly_job_with_nonnull_salary_is_caught(self, valid_job: dict) -> None:
        valid_job["salary"] = 40000
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("salary == null" in e for e in errors)

    def test_unrealistic_wage_is_caught(self, valid_job: dict) -> None:
        valid_job["wage"] = 999
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("realistic range" in e for e in errors)

    def test_invalid_min_age_is_caught(self, valid_job: dict) -> None:
        valid_job["minAge"] = 13
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("minAge 13" in e for e in errors)

    def test_default_hours_over_max_hours_is_caught(self, valid_job: dict) -> None:
        valid_job["defaultHours"] = 50
        valid_job["maxHours"] = 30
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("exceeds maxHours" in e for e in errors)

    def test_unbenefited_job_with_nonzero_match_pct_is_caught(self, valid_job: dict) -> None:
        valid_job["benefitsEligible"] = False
        valid_job["matchPct"] = 5
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("matchPct is 5" in e for e in errors)

    def test_unbenefited_job_with_nonzero_health_monthly_is_caught(self, valid_job: dict) -> None:
        valid_job["benefitsEligible"] = False
        valid_job["healthMonthly"] = 150
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("healthMonthly is 150" in e for e in errors)

    def test_unknown_category_is_caught(self, valid_job: dict) -> None:
        valid_job["category"] = "Made Up Category"
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("is not one of JOB_CATEGORIES" in e for e in errors)

    def test_invalid_retirement_kind_is_caught(self, valid_job: dict) -> None:
        valid_job["retirementKind"] = "pension"
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert any("retirementKind 'pension'" in e for e in errors)

    def test_clean_job_produces_no_errors(self, valid_job: dict) -> None:
        errors = validate_data.check_jobs([valid_job], ["Teen Jobs"])
        assert errors == []


class TestValidatorCatchesBadEventRecords:
    def test_invalid_kind_is_caught(self, valid_event: dict) -> None:
        valid_event["kind"] = "lottery"
        errors = validate_data.check_events([valid_event])
        assert any("kind 'lottery'" in e for e in errors)

    def test_zero_amount_min_is_caught(self, valid_event: dict) -> None:
        valid_event["amountMin"] = 0
        errors = validate_data.check_events([valid_event])
        assert any("amountMin must be > 0" in e for e in errors)

    def test_amount_min_over_max_is_caught(self, valid_event: dict) -> None:
        valid_event["amountMin"] = 100
        valid_event["amountMax"] = 50
        errors = validate_data.check_events([valid_event])
        assert any("exceeds amountMax" in e for e in errors)

    def test_weight_out_of_range_is_caught(self, valid_event: dict) -> None:
        valid_event["weight"] = 15
        errors = validate_data.check_events([valid_event])
        assert any("weight 15" in e for e in errors)

    def test_invalid_min_age_is_caught(self, valid_event: dict) -> None:
        valid_event["minAge"] = 99
        errors = validate_data.check_events([valid_event])
        assert any("minAge 99" in e for e in errors)

    def test_clean_event_produces_no_errors(self, valid_event: dict) -> None:
        errors = validate_data.check_events([valid_event])
        assert errors == []


class TestValidatorCatchesBadGlossaryRecords:
    def test_short_definition_is_caught(self, valid_glossary_entry: dict) -> None:
        valid_glossary_entry["definition"] = "Too short."
        errors = validate_data.check_glossary([valid_glossary_entry])
        assert any("must be at least 40" in e for e in errors)

    def test_unknown_category_is_caught(self, valid_glossary_entry: dict) -> None:
        valid_glossary_entry["category"] = "Investing 101"
        errors = validate_data.check_glossary([valid_glossary_entry])
        assert any("category 'Investing 101'" in e for e in errors)

    def test_clean_entry_produces_no_errors(self, valid_glossary_entry: dict) -> None:
        errors = validate_data.check_glossary([valid_glossary_entry])
        assert errors == []


class TestValidatorCatchesEmDashes:
    def test_em_dash_in_a_scanned_file_is_caught(self, tmp_path) -> None:
        # Built with chr() rather than a literal character in this
        # source file, same reasoning as tools/validate_data.py's
        # EM_DASH constant: keep the em dash out of the raw file bytes.
        em_dash = chr(0x2014)
        offending_file = tmp_path / "notes.md"
        offending_file.write_text(f"This sentence has an em dash {em_dash} right here.\n", encoding="utf-8")
        errors = validate_data.scan_for_em_dashes(root=tmp_path)
        assert len(errors) == 1
        assert "notes.md" in errors[0]

    def test_clean_directory_produces_no_errors(self, tmp_path) -> None:
        clean_file = tmp_path / "notes.md"
        clean_file.write_text("This sentence has a hyphen - right here.\n", encoding="utf-8")
        errors = validate_data.scan_for_em_dashes(root=tmp_path)
        assert errors == []
