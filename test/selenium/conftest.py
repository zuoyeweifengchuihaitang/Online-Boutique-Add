from __future__ import annotations

import csv
import json
import platform
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest
import selenium
from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.remote.webdriver import WebDriver

from utils.metrics import TestMetrics, safe_filename
from utils.report_generator import case_label, generate_summary


SELENIUM_ROOT = Path(__file__).resolve().parent
REPORTS_DIR = SELENIUM_ROOT / "reports"
SCREENSHOTS_DIR = REPORTS_DIR / "screenshots"
RESULTS_CSV = REPORTS_DIR / "results.csv"
RESULTS_JSON = REPORTS_DIR / "results.json"
SUMMARY_MD = REPORTS_DIR / "summary.md"

CSV_FIELDS = [
    "timestamp",
    "browser",
    "test_case",
    "status",
    "duration_ms",
    "current_url",
    "error_type",
    "error_message",
    "screenshot",
    "operation_metrics",
]

FRONTEND_COMMANDS = (
    "请确认已执行：kubectl config use-context online-boutique; "
    "kubectl get pods; kubectl port-forward deployment/frontend 8080:8080"
)


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption("--browser", action="store", default="chrome", choices=("chrome", "edge", "firefox"))
    parser.addoption("--headless", action="store_true", default=False)
    parser.addoption("--base-url", action="store", default="http://127.0.0.1:8080")
    parser.addoption(
        "--driver-path",
        action="store",
        default="",
        help="Optional WebDriver executable path, or a directory containing the selected browser driver.",
    )


def pytest_configure(config: pytest.Config) -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    started_at = datetime.now().isoformat(timespec="seconds")
    config._selenium_run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    config._selenium_started_at = started_at
    config._selenium_records = []
    config._selenium_browser_versions = {}
    config._selenium_base_url = config.getoption("--base-url").rstrip("/")
    config._selenium_frontend_available, config._selenium_frontend_reason = _check_frontend(
        config._selenium_base_url
    )


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    if getattr(config, "_selenium_frontend_available", True):
        return
    reason = f"Online Boutique 前端不可访问：{config._selenium_frontend_reason}。{FRONTEND_COMMANDS}"
    skip_marker = pytest.mark.skip(reason=reason)
    for item in items:
        item.add_marker(skip_marker)


def pytest_runtest_setup(item: pytest.Item) -> None:
    item._selenium_test_started = time.perf_counter()


@pytest.fixture
def base_url(request: pytest.FixtureRequest) -> str:
    return request.config.getoption("--base-url").rstrip("/")


@pytest.fixture
def metrics(request: pytest.FixtureRequest) -> TestMetrics:
    browser = request.config.getoption("--browser")
    collector = TestMetrics(request.node.name, browser, SCREENSHOTS_DIR)
    request.node._selenium_metrics = collector
    return collector


@pytest.fixture
def driver(request: pytest.FixtureRequest) -> WebDriver:
    browser = request.config.getoption("--browser").lower()
    headless = bool(request.config.getoption("--headless"))
    driver_path = request.config.getoption("--driver-path") or None
    request.node._selenium_browser = browser
    driver_instance: WebDriver | None = None

    try:
        driver_instance = _create_driver(browser, headless, driver_path)
        request.node._selenium_driver = driver_instance
        capabilities = driver_instance.capabilities
        browser_name = str(capabilities.get("browserName") or browser)
        browser_version = str(capabilities.get("browserVersion") or capabilities.get("version") or "unknown")
        request.node._selenium_browser = browser_name
        request.node._selenium_browser_version = browser_version
        request.config._selenium_browser_versions[browser_name] = browser_version
        driver_instance.set_page_load_timeout(35)
        if headless:
            driver_instance.set_window_size(1440, 1000)
        else:
            driver_instance.maximize_window()
        yield driver_instance
    except (WebDriverException, OSError, ValueError) as exc:
        raise RuntimeError(
            f"浏览器启动失败：browser={browser}, headless={headless}。"
            "请确认浏览器已安装，且 Selenium Manager 或 --driver-path 可以获取匹配驱动。"
            f"原始错误：{exc}"
        ) from exc
    finally:
        if driver_instance is not None:
            try:
                driver_instance.quit()
            except WebDriverException as exc:
                print(f"浏览器关闭失败：{exc}")


def _create_driver(browser: str, headless: bool, driver_path: str | None = None) -> WebDriver:
    if browser == "chrome":
        options = ChromeOptions()
        options.page_load_strategy = "eager"
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        _apply_browser_binary(browser, options)
        if headless:
            options.add_argument("--headless=new")
            options.add_argument("--window-size=1440,1000")
        service = _build_service(ChromeService, browser, driver_path)
        return webdriver.Chrome(options=options, service=service) if service else webdriver.Chrome(options=options)

    if browser == "edge":
        options = EdgeOptions()
        options.page_load_strategy = "eager"
        options.add_argument("--disable-gpu")
        _apply_browser_binary(browser, options)
        if headless:
            options.add_argument("--headless=new")
            options.add_argument("--window-size=1440,1000")
        service = _build_service(EdgeService, browser, driver_path)
        return webdriver.Edge(options=options, service=service) if service else webdriver.Edge(options=options)

    if browser == "firefox":
        options = FirefoxOptions()
        options.page_load_strategy = "eager"
        _apply_browser_binary(browser, options)
        if headless:
            options.add_argument("-headless")
            options.add_argument("--width=1440")
            options.add_argument("--height=1000")
        service = _build_service(FirefoxService, browser, driver_path)
        return webdriver.Firefox(options=options, service=service) if service else webdriver.Firefox(options=options)

    raise ValueError(f"不支持的浏览器: {browser}")


def _build_service(service_class: type, browser: str, driver_path: str | None):
    resolved_path = _resolve_driver_path(browser, driver_path)
    if not resolved_path:
        return None
    return service_class(executable_path=resolved_path)


def _resolve_driver_path(browser: str, driver_path: str | None) -> str | None:
    if not driver_path:
        return None

    path = Path(driver_path).expanduser()
    if path.is_dir():
        executable_names = {
            "chrome": "chromedriver.exe",
            "edge": "msedgedriver.exe",
            "firefox": "geckodriver.exe",
        }
        path = path / executable_names[browser]

    if not path.exists():
        raise ValueError(f"--driver-path 指向的驱动不存在: {path}")
    if not path.is_file():
        raise ValueError(f"--driver-path 必须是驱动 exe 文件或包含驱动 exe 的目录: {path}")
    return str(path)


def _apply_browser_binary(browser: str, options: ChromeOptions | EdgeOptions | FirefoxOptions) -> None:
    candidates = {
        "chrome": [
            Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
            Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
        ],
        "edge": [
            Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
            Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
        ],
        "firefox": [
            Path(r"C:\Program Files\Mozilla Firefox\firefox.exe"),
            Path(r"C:\Program Files (x86)\Mozilla Firefox\firefox.exe"),
        ],
    }
    for path in candidates[browser]:
        if path.exists():
            options.binary_location = str(path)
            return


def _check_frontend(base_url: str) -> tuple[bool, str]:
    started = time.perf_counter()
    try:
        request = urllib.request.Request(base_url, headers={"User-Agent": "pytest-selenium-precheck"})
        with urllib.request.urlopen(request, timeout=8) as response:
            status = response.getcode()
            response.read(256)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        if 200 <= status < 500:
            return True, f"HTTP {status}, {duration_ms} ms"
        return False, f"HTTP {status}, {duration_ms} ms"
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        return False, f"{type(exc).__name__}: {exc}; {duration_ms} ms"


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo[Any]):
    outcome = yield
    report = outcome.get_result()

    should_record = report.when == "call" or (report.when == "setup" and (report.failed or report.skipped))
    if not should_record or getattr(item, "_selenium_recorded", False):
        return

    item._selenium_recorded = True
    record = _build_result_record(item, report, call)
    item.config._selenium_records.append(record)
    _append_result_files(record)


def _build_result_record(item: pytest.Item, report: pytest.TestReport, call: pytest.CallInfo[Any]) -> dict[str, Any]:
    timestamp = datetime.now().isoformat(timespec="seconds")
    browser = getattr(item, "_selenium_browser", None) or item.config.getoption("--browser")
    metrics: TestMetrics | None = getattr(item, "_selenium_metrics", None)
    driver_instance: WebDriver | None = getattr(item, "_selenium_driver", None)
    elapsed_ms = round((time.perf_counter() - getattr(item, "_selenium_test_started", time.perf_counter())) * 1000, 2)

    error_type = ""
    error_message = ""
    failed_step = ""
    if call.excinfo is not None:
        error_type = call.excinfo.type.__name__
        error_message = str(call.excinfo.value)
        failed_step = report.when

    if report.skipped and not error_message:
        error_type = "Skipped"
        error_message = str(report.longrepr)
        failed_step = report.when

    if not getattr(item.config, "_selenium_frontend_available", True):
        error_type = "FrontendUnavailable"
        error_message = f"Online Boutique 前端不可访问：{item.config._selenium_frontend_reason}。{FRONTEND_COMMANDS}"
        failed_step = "precheck"

    screenshot = ""
    if report.failed and driver_instance is not None:
        screenshot = _capture_failure_screenshot(item, driver_instance, browser)
    elif metrics and metrics.screenshots:
        screenshot = ";".join(metrics.screenshots)

    current_url = ""
    if driver_instance is not None:
        try:
            current_url = driver_instance.current_url
        except WebDriverException:
            current_url = ""

    return {
        "run_id": item.config._selenium_run_id,
        "timestamp": timestamp,
        "browser": browser,
        "browser_version": getattr(item, "_selenium_browser_version", ""),
        "test_name": item.name,
        "test_case": case_label(item.name),
        "nodeid": item.nodeid,
        "status": report.outcome,
        "duration_ms": elapsed_ms,
        "current_url": current_url,
        "error_type": error_type,
        "error_message": error_message,
        "failed_step": failed_step,
        "screenshot": screenshot,
        "operation_metrics": metrics.timings_ms if metrics else {},
    }


def _capture_failure_screenshot(item: pytest.Item, driver_instance: WebDriver, browser: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = safe_filename(f"{browser}_{item.name}_{timestamp}.png")
    path = SCREENSHOTS_DIR / filename
    try:
        driver_instance.save_screenshot(str(path))
        return str(Path("reports") / "screenshots" / filename)
    except WebDriverException as exc:
        return f"截图保存失败: {exc}"


def _append_result_files(record: dict[str, Any]) -> None:
    csv_exists = RESULTS_CSV.exists()
    with RESULTS_CSV.open("a", newline="", encoding="utf-8-sig") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS, extrasaction="ignore")
        if not csv_exists or RESULTS_CSV.stat().st_size == 0:
            writer.writeheader()
        csv_record = dict(record)
        csv_record["operation_metrics"] = json.dumps(record.get("operation_metrics", {}), ensure_ascii=False)
        writer.writerow(csv_record)

    history: list[dict[str, Any]]
    if RESULTS_JSON.exists() and RESULTS_JSON.stat().st_size > 0:
        try:
            history = json.loads(RESULTS_JSON.read_text(encoding="utf-8"))
            if not isinstance(history, list):
                history = []
        except json.JSONDecodeError:
            history = []
    else:
        history = []
    history.append(record)
    RESULTS_JSON.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    config = session.config
    versions = getattr(config, "_selenium_browser_versions", {})
    browser_versions = ", ".join(f"{name} {version}" for name, version in versions.items()) or "未获取（未启动浏览器）"
    frontend_status = (
        f"可访问（{config._selenium_frontend_reason}）"
        if getattr(config, "_selenium_frontend_available", False)
        else f"不可访问（{config._selenium_frontend_reason}）"
    )
    environment = {
        "os": f"{platform.system()} {platform.release()} ({platform.version()})",
        "python_version": sys.version.split()[0],
        "selenium_version": selenium.__version__,
        "browser_versions": browser_versions,
        "base_url": getattr(config, "_selenium_base_url", config.getoption("--base-url")),
        "started_at": getattr(config, "_selenium_started_at", ""),
        "ended_at": datetime.now().isoformat(timespec="seconds"),
        "headless": bool(config.getoption("--headless")),
        "frontend_status": frontend_status,
    }
    generate_summary(SUMMARY_MD, environment, getattr(config, "_selenium_records", []))


def pytest_html_report_title(report: Any) -> None:
    report.title = "Online Boutique Selenium Functional Test Report"
