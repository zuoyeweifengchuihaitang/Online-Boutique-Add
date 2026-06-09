from __future__ import annotations

from datetime import datetime

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

from pages.base_page import BasePage, Locator


class CheckoutPage(BasePage):
    CHECKOUT_FORM: Locator = (By.CSS_SELECTOR, "form.cart-checkout-form")
    EMAIL: Locator = (By.ID, "email")
    STREET_ADDRESS: Locator = (By.ID, "street_address")
    ZIP_CODE: Locator = (By.ID, "zip_code")
    CITY: Locator = (By.ID, "city")
    STATE: Locator = (By.ID, "state")
    COUNTRY: Locator = (By.ID, "country")
    CREDIT_CARD_NUMBER: Locator = (By.ID, "credit_card_number")
    EXPIRATION_MONTH: Locator = (By.ID, "credit_card_expiration_month")
    EXPIRATION_YEAR: Locator = (By.ID, "credit_card_expiration_year")
    CREDIT_CARD_CVV: Locator = (By.ID, "credit_card_cvv")
    PLACE_ORDER_BUTTON: Locator = (By.CSS_SELECTOR, "form.cart-checkout-form button[type='submit']")
    ORDER_SECTION: Locator = (By.CSS_SELECTOR, ".order-complete-section")
    ORDER_HEADING: Locator = (By.CSS_SELECTOR, ".order-complete-section h3")
    ORDER_ROWS: Locator = (By.CSS_SELECTOR, ".order-complete-section .row")

    @staticmethod
    def successful_test_data() -> dict[str, str]:
        future_year = datetime.now().year + 1
        return {
            "email": "someone@example.com",
            "street_address": "1600 Amphitheatre Parkway",
            "zip_code": "94043",
            "city": "Mountain View",
            "state": "CA",
            "country": "United States",
            "credit_card_number": "4432801561520454",
            "credit_card_expiration_month": "12",
            "credit_card_expiration_year": str(future_year),
            "credit_card_cvv": "672",
        }

    def wait_checkout_form(self) -> None:
        self.wait_visible(self.CHECKOUT_FORM)
        self.wait_visible(self.EMAIL)
        self.wait_visible(self.CREDIT_CARD_NUMBER)
        self.wait_clickable(self.PLACE_ORDER_BUTTON)
        self.assert_no_error_page()

    def _set_input(self, locator: Locator, value: str) -> None:
        element = self.wait_visible(locator)
        element.clear()
        element.send_keys(value)

    def fill_form(self, data: dict[str, str]) -> None:
        self.wait_checkout_form()
        self._set_input(self.EMAIL, data["email"])
        self._set_input(self.STREET_ADDRESS, data["street_address"])
        self._set_input(self.ZIP_CODE, data["zip_code"])
        self._set_input(self.CITY, data["city"])
        self._set_input(self.STATE, data["state"])
        self._set_input(self.COUNTRY, data["country"])
        self._set_input(self.CREDIT_CARD_NUMBER, data["credit_card_number"])
        Select(self.wait_visible(self.EXPIRATION_MONTH)).select_by_value(data["credit_card_expiration_month"])
        Select(self.wait_visible(self.EXPIRATION_YEAR)).select_by_value(data["credit_card_expiration_year"])
        self._set_input(self.CREDIT_CARD_CVV, data["credit_card_cvv"])

    def place_order(self) -> None:
        button = self.wait_clickable(self.PLACE_ORDER_BUTTON)
        self.scroll_into_view(button)
        button.click()
        self.wait_order_complete()

    def wait_order_complete(self) -> None:
        self.wait_visible(self.ORDER_SECTION, timeout=30)
        self.wait_visible(self.ORDER_HEADING, timeout=30)
        self.wait_until(
            lambda driver: "/cart/checkout" in driver.current_url,
            "提交订单后 URL 未保持在订单确认路径",
            timeout=30,
        )
        self.assert_no_error_page()

    def order_heading(self) -> str:
        return self.wait_visible(self.ORDER_HEADING).text.strip()

    def confirmation_details(self) -> dict[str, str]:
        details: dict[str, str] = {}
        for row in self.driver.find_elements(*self.ORDER_ROWS):
            columns = row.find_elements(By.CSS_SELECTOR, ".col-6")
            if len(columns) != 2:
                continue
            key = columns[0].text.strip()
            value = columns[1].text.strip()
            if key:
                details[key] = value
        return details
