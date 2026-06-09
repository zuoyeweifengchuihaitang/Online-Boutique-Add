from __future__ import annotations

import re
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

from selenium.webdriver.remote.webdriver import WebDriver


def safe_filename(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "_", value.strip())
    return cleaned.strip("._") or "selenium_artifact"


class TestMetrics:
    """Collects browser interaction timings and screenshots for one pytest item."""

    def __init__(self, node_name: str, browser: str, screenshots_dir: Path) -> None:
        self.node_name = node_name
        self.browser = browser
        self.screenshots_dir = screenshots_dir
        self.timings_ms: dict[str, float] = {}
        self.screenshots: list[str] = []

    @contextmanager
    def measure(self, name: str) -> Iterator[None]:
        start = time.perf_counter()
        try:
            yield
        finally:
            self.timings_ms[name] = round((time.perf_counter() - start) * 1000, 2)

    def capture_screenshot(self, driver: WebDriver, label: str) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = safe_filename(f"{self.browser}_{self.node_name}_{label}_{timestamp}.png")
        path = self.screenshots_dir / filename
        driver.save_screenshot(str(path))
        relative_path = str(Path("reports") / "screenshots" / filename)
        self.screenshots.append(relative_path)
        return relative_path

    def add_navigation_timing(self, driver: WebDriver, name: str = "navigation_timing") -> None:
        script = """
        const entries = performance.getEntriesByType('navigation');
        if (entries && entries.length > 0) {
            return entries[0].duration;
        }
        const t = performance.timing;
        if (t && t.loadEventEnd && t.navigationStart) {
            return t.loadEventEnd - t.navigationStart;
        }
        return null;
        """
        value: Any = driver.execute_script(script)
        if isinstance(value, (int, float)) and value >= 0:
            self.timings_ms[name] = round(float(value), 2)
