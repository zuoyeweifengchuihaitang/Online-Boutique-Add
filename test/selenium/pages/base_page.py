from __future__ import annotations

from typing import Callable

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

Locator = tuple[str, str]


class BasePage:
    def __init__(self, driver: WebDriver, base_url: str, timeout: int = 15) -> None:
        self.driver = driver
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def open(self, path: str = "/") -> None:
        normalized_path = path if path.startswith("/") else f"/{path}"
        self.driver.get(f"{self.base_url}{normalized_path}")
        self.wait_for_document_ready()

    def wait(self, timeout: int | None = None) -> WebDriverWait:
        return WebDriverWait(self.driver, timeout or self.timeout)

    def wait_visible(self, locator: Locator, timeout: int | None = None) -> WebElement:
        try:
            return self.wait(timeout).until(EC.visibility_of_element_located(locator))
        except TimeoutException as exc:
            raise TimeoutException(f"元素未在预期时间内可见: {locator}") from exc

    def wait_present(self, locator: Locator, timeout: int | None = None) -> WebElement:
        try:
            return self.wait(timeout).until(EC.presence_of_element_located(locator))
        except TimeoutException as exc:
            raise TimeoutException(f"元素未在预期时间内出现在 DOM 中: {locator}") from exc

    def wait_clickable(self, locator: Locator, timeout: int | None = None) -> WebElement:
        try:
            return self.wait(timeout).until(EC.element_to_be_clickable(locator))
        except TimeoutException as exc:
            raise TimeoutException(f"元素未在预期时间内可点击: {locator}") from exc

    def wait_until(self, condition: Callable[[WebDriver], bool], message: str, timeout: int | None = None) -> None:
        try:
            self.wait(timeout).until(condition)
        except TimeoutException as exc:
            raise TimeoutException(message) from exc

    def wait_for_document_ready(self, timeout: int | None = None) -> None:
        self.wait_until(
            lambda driver: driver.execute_script("return document.readyState") in ("interactive", "complete"),
            "页面 document.readyState 未在预期时间内进入可交互状态",
            timeout,
        )

    def assert_no_error_page(self) -> None:
        body_text = self.driver.find_element("tag name", "body").text
        error_markers = ("Uh, oh!", "Something has failed", "HTTP Status:", "failed to complete the order")
        if any(marker in body_text for marker in error_markers):
            excerpt = body_text.replace("\n", " ")[:500]
            raise AssertionError(f"应用返回错误页或明显错误信息: {excerpt}")

    def scroll_into_view(self, element: WebElement) -> None:
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)

    @staticmethod
    def normalize_text(value: str) -> str:
        return " ".join(value.split()).strip().lower()
