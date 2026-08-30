#!/usr/bin/env python3
"""End-to-end smoke test for Trick or Treat Swap (drives real Chrome via chrome-agent).

Regression coverage:
1. The hidden win/lose overlay must not intercept board input
   (`.tots-overlay[hidden] { display: none }` — it used to eat every tap).
2. Reaching the level goal must surface the visible "Door opened!" panel
   (panels mount into that overlay; it used to stay invisible once the
   element had been detached, freezing the game at goal-met).

The level-1 board is seeded (20261), so the playthrough is deterministic:
(0,1)→(0,2) collects 6 pumpkins, (4,4)→(4,5) collects 6 more and wins.
Both moves were verified against the engine from pristine state.

Usage:
  pnpm build                      # dist/ must exist
  python3 scripts/e2e_tots_smoke.py [--url URL] [--keep-open]

Without --url the script serves the repo's dist/ under a /gamiq/ prefix
(mirroring the GitHub Pages base) on an ephemeral local port.

Exit code 0 = all assertions passed; 1 = failure (evidence printed + screenshot).
"""

from __future__ import annotations

import argparse
import base64
import functools
import http.server
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# Engine-verified winning line for level 1 (seed 20261), see module docstring.
WIN_LINE = [((0, 1), (0, 2)), ((4, 4), (4, 5))]
EXPECTED_CHIPS = ["6/12", "12/12"]

FAILURES: list[str] = []


def fail(message: str) -> None:
    FAILURES.append(message)
    print(f"FAIL: {message}")


def ok(message: str) -> None:
    print(f"ok: {message}")


class Chrome:
    """Minimal chrome-agent CLI wrapper."""

    def __init__(self, instance: str) -> None:
        self.instance = instance

    def run(self, *args: str) -> str:
        result = subprocess.run(
            ["chrome-agent", self.instance, *args], capture_output=True, text=True
        )
        if result.returncode != 0 and not result.stdout.strip():
            raise RuntimeError(f"chrome-agent {' '.join(args[:2])}: {result.stderr.strip()}")
        return result.stdout

    def ev(self, expression: str) -> object:
        out = self.run(
            "Runtime.evaluate", json.dumps({"expression": expression, "returnByValue": True})
        )
        try:
            return json.loads(out)["result"].get("value")
        except (json.JSONDecodeError, KeyError):
            return None

    def click(self, x: float, y: float) -> None:
        for event in ("mousePressed", "mouseReleased"):
            self.run(
                "Input.dispatchMouseEvent",
                json.dumps(
                    {"type": event, "x": round(x), "y": round(y), "button": "left", "clickCount": 1}
                ),
            )


def serve_dist() -> tuple[str, tempfile.TemporaryDirectory]:
    """Serve dist/ under a /gamiq/ prefix, mirroring the Pages base path."""
    dist = REPO / "dist"
    if not (dist / "trick-or-treat-swap").is_dir():
        sys.exit("dist/trick-or-treat-swap missing — run `pnpm build` first")
    tmp = tempfile.TemporaryDirectory()
    os.symlink(dist, Path(tmp.name) / "gamiq")
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=tmp.name)
    handler.log_message = lambda *a, **k: None  # silence request log
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/gamiq/trick-or-treat-swap/", tmp


def wait_ready(chrome: Chrome, timeout: float = 15.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if chrome.ev("document.readyState") == "complete" and chrome.ev(
            "!!document.querySelector('.tots-moves-count')"
        ):
            return
        time.sleep(0.3)
    fail("play screen never mounted")
    sys.exit(1)


def dismiss_tutorial(chrome: Chrome) -> None:
    """Wait for the tutorial (it mounts a tick after the play screen), dismiss
    it, and confirm it is gone; tolerates already-seen tutorials."""
    finder = '[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Skip tutorial"))'
    deadline = time.monotonic() + 12
    seen = False
    while time.monotonic() < deadline:
        if chrome.ev(f"!!({finder})"):
            seen = True
            chrome.ev(f"{finder}?.click()")
            time.sleep(0.5)
            if not chrome.ev("!!document.querySelector('.tots-panel')"):
                return
        time.sleep(0.3)
    if seen:
        fail("tutorial panel could not be dismissed")


def assert_overlay_fix(chrome: Chrome) -> None:
    """Bug 1 regression: the parked overlay must be display:none and untouchable."""
    hidden_displays = chrome.ev(
        "[...document.querySelectorAll('.tots-overlay')]"
        ".filter(e=>e.hidden).map(e=>getComputedStyle(e).display)"
    )
    if hidden_displays:
        bad = [d for d in hidden_displays if d != "none"]
        if bad:
            fail(f"hidden overlay computes display:{bad[0]!r} — it will intercept board input")
        else:
            ok("hidden overlay is display:none")
    center = chrome.ev(
        "(()=>{const e=document.elementFromPoint(innerWidth/2, innerHeight/2);"
        "return e?e.tagName+':'+e.id:null;})()"
    )
    if center == "CANVAS:game":
        ok("board center hit-tests to the canvas (no overlay wall)")
    else:
        fail(f"board center hit-tests to {center!r}, input would be swallowed")


def save_screenshot(chrome: Chrome, path: str) -> None:
    shot = chrome.run("Page.captureScreenshot", '{"format":"png"}')
    Path(path).write_bytes(base64.b64decode(json.loads(shot)["data"]))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="game URL (default: serve dist/ locally)")
    parser.add_argument("--keep-open", action="store_true", help="keep the browser for inspection")
    args = parser.parse_args()

    url, tmp = (args.url, None) if args.url else serve_dist()
    url = f"{url}{'&' if '?' in url else '?'}level=1"

    launch = subprocess.run(["chrome-agent", "launch", "--headless"], capture_output=True, text=True)
    instance = None
    try:
        try:
            instance = json.loads(launch.stdout)["name"]
        except (json.JSONDecodeError, KeyError):
            fail(f"chrome-agent launch failed: {launch.stdout.strip()} {launch.stderr.strip()}")
            return 1
        chrome = Chrome(instance)
        chrome.run("Page.navigate", json.dumps({"url": url}))
        wait_ready(chrome)
        time.sleep(1.5)  # give the tutorial its first render tick
        dismiss_tutorial(chrome)

        assert_overlay_fix(chrome)

        geometry = chrome.ev(
            "(()=>{const hud=document.querySelector('.tots-hud').getBoundingClientRect();"
            "const area={x:8,y:hud.bottom+8,w:innerWidth-16,h:innerHeight-hud.bottom-8};"
            "const cell=Math.max(20,Math.min(Math.floor(area.w/7),Math.floor(area.h/8),96));"
            "const o={originX:area.x+(area.w-cell*7)/2,originY:area.y+(area.h-cell*8)/2,cell};"
            "window.__board=o;return o;})()"
        )
        if not geometry:
            fail("could not compute board geometry")
            return 1

        def cellpos(cx: int, cy: int) -> tuple[float, float]:
            return (
                geometry["originX"] + (cx + 0.5) * geometry["cell"],
                geometry["originY"] + (cy + 0.5) * geometry["cell"],
            )

        def moves_text() -> str | None:
            return chrome.ev('document.querySelector(".tots-moves-count")?.textContent')

        def chip() -> str | None:
            value = chrome.ev('[...document.querySelectorAll(".tots-chip")].map(c=>c.textContent)')
            return value[0] if value else None

        def panels() -> list[str] | None:
            return chrome.ev(
                '[...document.querySelectorAll(".tots-panel")].map(e=>e.textContent.slice(0,60))'
            )

        def wait_settled(timeout: float = 12.0) -> None:
            """The HUD only updates as the animation replay drains, and clicks
            are swallowed while it is busy — wait for it to change, then freeze."""
            before = (moves_text(), chip())
            deadline = time.monotonic() + timeout
            previous, stable = None, 0
            changed = False
            while time.monotonic() < deadline:
                current = (moves_text(), chip())
                if current != before:
                    changed = True
                stable = stable + 1 if current == previous else 0
                previous = current
                if changed and stable >= 4:
                    return
                time.sleep(0.4)

        # Bug 2 regression: the deterministic winning line must collect all 12
        # pumpkins and surface the visible win panel.
        chips_ok = True
        for i, (a, b) in enumerate(WIN_LINE):
            chrome.click(*cellpos(*a))
            time.sleep(0.5)
            chrome.click(*cellpos(*b))
            wait_settled()
            time.sleep(0.5)
            chip_now, moves_now = chip(), moves_text()
            expected = EXPECTED_CHIPS[i]
            if chip_now == expected:
                ok(f"after move {i + 1}: chip={chip_now} moves={moves_now}")
            else:
                chips_ok = False
                fail(f"after move {i + 1}: chip={chip_now!r} (expected {expected!r}) moves={moves_now!r}")

        panel = panels()
        if panel and any("Door opened" in p for p in panel):
            ok(f"win panel visible: {panel[0]!r}")
        else:
            fail(f"win panel not visible after the winning line (panel={panel!r})")

        if FAILURES:
            save_screenshot(chrome, "/tmp/tots-e2e-failure.png")
            print("failure screenshot: /tmp/tots-e2e-failure.png")
        else:
            print("SMOKE PASS")
        return 1 if FAILURES else 0
    finally:
        if not args.keep_open and instance:
            subprocess.run(["chrome-agent", "stop", instance], capture_output=True)
            status = subprocess.run(["chrome-agent", "status"], capture_output=True, text=True).stdout
            if f'"{instance}"' in status:
                print(f"WARN: {instance} still listed after stop")
        if tmp:
            tmp.cleanup()


if __name__ == "__main__":
    sys.exit(main())
