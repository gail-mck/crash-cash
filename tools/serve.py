"""
tools/serve.py

Zero-dependency local development server for Crash Cash.

Serves the repository root over plain HTTP using only the Python
standard library (http.server), with two small tweaks that make ES
module development painless:

  1. .js files are served with the 'text/javascript' MIME type, which
     browsers require for native ES module imports (<script
     type="module"> and import/export statements) to work reliably.
  2. Every response includes no-cache headers, so editing a file and
     reloading the browser always shows the latest version instead of
     a stale cached copy from a previous run.

Usage:
    python3 tools/serve.py [port]

If no port is given, 8000 is used. This is also wired up as `npm run
serve` in package.json.
"""

from __future__ import annotations

import functools
import http.server
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PORT = 8000


class DevRequestHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler tuned for painless static-site development."""

    def end_headers(self) -> None:
        # Disable caching entirely so the browser always fetches the
        # latest version of every file while developing.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def guess_type(self, path: str) -> str:
        # Some platforms' mimetypes database maps .js to
        # application/javascript, but browsers expect text/javascript
        # for native ES module imports, so force it explicitly here.
        if str(path).endswith(".js"):
            return "text/javascript"
        return super().guess_type(path)


def _parse_port(argv: list[str]) -> int:
    """Parse an optional port argument from argv, defaulting to 8000."""
    if len(argv) > 1:
        try:
            return int(argv[1])
        except ValueError as exc:
            raise ValueError(f"Invalid port '{argv[1]}', must be an integer.") from exc
    return DEFAULT_PORT


def main() -> int:
    """Start the dev server and block until interrupted with Ctrl+C."""
    try:
        port = _parse_port(sys.argv)
    except ValueError as exc:
        print(exc)
        return 1

    handler = functools.partial(DevRequestHandler, directory=str(REPO_ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Crash Cash dev server running at http://127.0.0.1:{port}/")
        print("Serving repo root: " + str(REPO_ROOT))
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
