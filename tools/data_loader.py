"""
tools/data_loader.py

Extracts the Crash Cash datasets from the browser ES modules under
data/ (jobs.js, events.js, glossary.js) WITHOUT executing any
JavaScript.

The three data files are hand written JS modules that each export one
array literal (data/jobs.js also exports a small string array,
JOB_CATEGORIES). Rather than shelling out to a JS runtime, this module:

  1. reads the raw file text
  2. strips JS comments while respecting string literals
  3. locates the exported array literal by matching brackets, again
     respecting string literals so a stray "[" or "]" inside a blurb
     never confuses the bracket count
  4. converts the JS array/object literal into valid JSON text by
     quoting bare object keys and re-encoding single quoted strings
     (including escaped apostrophes such as \\') as JSON double quoted
     strings
  5. hands the result to json.loads

This keeps the dev tooling completely dependency free (no Node.js
required to validate data) while treating data/*.js as the single
source of truth. Nothing in this module ever writes back to those
files.

Public API:
    load_jobs() -> list[dict]
    load_job_categories() -> list[str]
    load_events() -> list[dict]
    load_glossary() -> list[dict]
    load_all() -> dict
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Repo root, resolved relative to this file (tools/data_loader.py lives
# one directory below the repo root, so parent.parent is the root).
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"


class DataParseError(Exception):
    """Raised when a data/*.js file cannot be turned into Python data.

    The message always names the source file and the export it was
    trying to read, plus enough context (a snippet of the offending
    text, or the underlying exception) to track the problem down
    quickly.
    """


def _strip_js_comments(text: str) -> str:
    """Remove // line comments and /* block */ comments from JS source.

    Walks the text one character at a time, tracking whether the
    current position is inside a single quoted string, a double quoted
    string, a template literal, a line comment, or a block comment.
    This means comment-looking text that happens to appear inside a
    real string value (for example a blurb that mentions a URL) is
    never mistaken for an actual comment.
    """
    out: list[str] = []
    i = 0
    n = len(text)
    in_single = False
    in_double = False
    in_template = False
    in_line_comment = False
    in_block_comment = False

    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""

        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
                out.append(ch)
            i += 1
            continue

        if in_block_comment:
            if ch == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            if ch == "\n":
                out.append(ch)  # keep newlines so line numbers stay useful
            i += 1
            continue

        if in_single:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(nxt)
                i += 2
                continue
            if ch == "'":
                in_single = False
            i += 1
            continue

        if in_double:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(nxt)
                i += 2
                continue
            if ch == '"':
                in_double = False
            i += 1
            continue

        if in_template:
            out.append(ch)
            if ch == "\\" and i + 1 < n:
                out.append(nxt)
                i += 2
                continue
            if ch == "`":
                in_template = False
            i += 1
            continue

        # Not currently inside a string or a comment.
        if ch == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if ch == "'":
            in_single = True
            out.append(ch)
            i += 1
            continue
        if ch == '"':
            in_double = True
            out.append(ch)
            i += 1
            continue
        if ch == "`":
            in_template = True
            out.append(ch)
            i += 1
            continue

        out.append(ch)
        i += 1

    return "".join(out)


def _extract_array_literal(text: str, export_name: str, filename: str) -> str:
    """Return the raw text of the array literal assigned to export_name.

    Looks for "export const <export_name> = [" and then walks forward,
    counting "[" and "]" while respecting string literals, until the
    matching closing bracket is found. Returns the substring including
    both the opening and closing brackets.
    """
    marker = f"export const {export_name}"
    start_marker = text.find(marker)
    if start_marker == -1:
        raise DataParseError(
            f"{filename}: could not find 'export const {export_name}' in file"
        )

    bracket_start = text.find("[", start_marker)
    if bracket_start == -1:
        raise DataParseError(
            f"{filename}: found 'export const {export_name}' but no "
            "following '[' to start the array literal"
        )

    depth = 0
    i = bracket_start
    n = len(text)
    in_single = False
    in_double = False

    while i < n:
        ch = text[i]
        if in_single:
            if ch == "\\":
                i += 2
                continue
            if ch == "'":
                in_single = False
            i += 1
            continue
        if in_double:
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                in_double = False
            i += 1
            continue
        if ch == "'":
            in_single = True
        elif ch == '"':
            in_double = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return text[bracket_start : i + 1]
        i += 1

    raise DataParseError(
        f"{filename}: unmatched '[' for export const {export_name}; "
        "reached end of file while looking for the closing ']'"
    )


def _js_array_literal_to_json(literal: str, filename: str) -> str:
    """Convert a JS array-of-objects literal into JSON text.

    Handles the constructs actually used in data/*.js:
      - bare (unquoted) object keys, e.g. { id: 'x' }
      - single quoted strings, including escaped apostrophes like \\'
      - double quoted strings (re-encoded the same way, defensively)
      - trailing commas before a closing ] or }
      - null / true / false and plain numbers, which are already valid
        JSON and pass through unchanged
    """
    out: list[str] = []
    i = 0
    n = len(literal)

    def is_ident_start(c: str) -> bool:
        return c.isalpha() or c in "_$"

    def is_ident_char(c: str) -> bool:
        return c.isalnum() or c in "_$"

    while i < n:
        ch = literal[i]

        # Re-encode a single or double quoted string as a JSON string.
        # We unescape the original JS escapes down to their literal
        # characters, then let json.dumps() apply correct JSON escaping
        # on the way back out. This is what makes escaped apostrophes
        # like \\' inside single quoted strings work correctly: the
        # backslash is simply dropped and the apostrophe becomes a
        # plain character, which needs no escaping inside a JSON string
        # that is itself delimited with double quotes.
        if ch in ("'", '"'):
            quote = ch
            j = i + 1
            raw_chars: list[str] = []
            closed = False
            while j < n:
                c = literal[j]
                if c == "\\" and j + 1 < n:
                    raw_chars.append(literal[j + 1])
                    j += 2
                    continue
                if c == quote:
                    j += 1
                    closed = True
                    break
                raw_chars.append(c)
                j += 1
            if not closed:
                raise DataParseError(
                    f"{filename}: unterminated string literal starting at "
                    f"index {i} of the extracted array"
                )
            raw_value = "".join(raw_chars)
            out.append(json.dumps(raw_value))
            i = j
            continue

        # Quote bare object keys: an identifier immediately followed
        # (after optional whitespace) by a colon. Skip the JSON literal
        # keywords, which are never valid object keys anyway.
        if is_ident_start(ch):
            j = i + 1
            while j < n and is_ident_char(literal[j]):
                j += 1
            ident = literal[i:j]
            k = j
            while k < n and literal[k] in " \t\r\n":
                k += 1
            if k < n and literal[k] == ":" and ident not in ("true", "false", "null"):
                out.append(json.dumps(ident))
            else:
                out.append(ident)
            i = j
            continue

        # Drop a trailing comma that precedes a closing bracket/brace,
        # since JSON does not allow trailing commas.
        if ch == ",":
            k = i + 1
            while k < n and literal[k] in " \t\r\n":
                k += 1
            if k < n and literal[k] in "]}":
                i += 1
                continue
            out.append(ch)
            i += 1
            continue

        out.append(ch)
        i += 1

    return "".join(out)


def _load_export(js_filename: str, export_name: str) -> Any:
    """Read one data/*.js file and return the parsed value of one export."""
    path = DATA_DIR / js_filename
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise DataParseError(f"{js_filename}: could not read file ({exc})") from exc

    stripped = _strip_js_comments(text)
    literal = _extract_array_literal(stripped, export_name, js_filename)
    json_text = _js_array_literal_to_json(literal, js_filename)

    try:
        return json.loads(json_text)
    except json.JSONDecodeError as exc:
        snippet_start = max(exc.pos - 80, 0)
        snippet_end = min(exc.pos + 80, len(json_text))
        snippet = json_text[snippet_start:snippet_end]
        raise DataParseError(
            f"{js_filename}: failed to parse '{export_name}' as JSON after "
            f"conversion ({exc}). Nearby converted text:\n{snippet}"
        ) from exc


def load_jobs() -> list[dict[str, Any]]:
    """Load and return the JOBS array from data/jobs.js as a list of dicts."""
    return _load_export("jobs.js", "JOBS")


def load_job_categories() -> list[str]:
    """Load and return the JOB_CATEGORIES array from data/jobs.js."""
    return _load_export("jobs.js", "JOB_CATEGORIES")


def load_events() -> list[dict[str, Any]]:
    """Load and return the EVENTS array from data/events.js as a list of dicts."""
    return _load_export("events.js", "EVENTS")


def load_glossary() -> list[dict[str, Any]]:
    """Load and return the GLOSSARY array from data/glossary.js as a list of dicts."""
    return _load_export("glossary.js", "GLOSSARY")


def load_all() -> dict[str, Any]:
    """Load every dataset in one call.

    Returns a dict with keys: 'jobs', 'job_categories', 'events',
    'glossary'.
    """
    return {
        "jobs": load_jobs(),
        "job_categories": load_job_categories(),
        "events": load_events(),
        "glossary": load_glossary(),
    }


if __name__ == "__main__":
    # Small manual smoke test: print dataset sizes when run directly,
    # e.g. `python3 tools/data_loader.py`.
    loaded = load_all()
    print(f"jobs: {len(loaded['jobs'])}")
    print(f"job_categories: {len(loaded['job_categories'])}")
    print(f"events: {len(loaded['events'])}")
    print(f"glossary: {len(loaded['glossary'])}")
