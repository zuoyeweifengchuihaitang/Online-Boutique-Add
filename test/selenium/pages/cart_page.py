from __future__ import annotations

import re

from selenium.webdriver.common.by import By

from pages.base_page import BasePage, Locator


class CartPage(BasePage):
    CART_MAIN: Locator = (By.CSS_SELECTOR, "main.cart-sections")
    EMPTY_SECTION: Locator = (By.CSS_SELECTOR, ".empty-cart-section")
    EMPTY_MESSAGE: Locator = (By.CSS_SELECTOR, ".empty-cart-section h3")
    ITEM_ROWS: Locator = (By.CSS_SELECTOR, ".cart-summary-item-row")
    ITEM_NAME: Locator = (By.CSS_SELECTOR, "h4")
    ITEM_PRICE: Locator = (By.CSS_SELECTOR, "strong")
    TOTAL_ROW: Locator = (By.CSS_SELECTOR, ".cart-summary-total-row")
    EMPTY_CART_BUTTON: Locator = (By.CSS_SELECTOR, "button.cart-summary-empty-cart-button[type='submit']")
    CHECKOUT_FORM: Locator = (By.CSS_SELECTOR, "form.cart-checkout-form")

    def load(self) -> None:
        self.open("/cart")
        self.wait_loaded()

    def wait_loaded(self) -> None:
        self.wait_visible(self.CART_MAIN)
        self.wait_until(
            lambda _: self.is_empty() or len(self.item_rows()) > 0,
            "购物车页面既没有空购物车提示，也没有商品行",
        )
        self.assert_no_error_page()

    def item_rows(self) -> list:
        return self.driver.find_elements(*self.ITEM_ROWS)

    def is_empty(self) -> bool:
        return len(self.driver.find_elements(*self.EMPTY_SECTION)) > 0

    def empty_message(self) -> str:
        return self.wait_visible(self.EMPTY_MESSAGE).text.strip()

    def item_count(self) -> int:
        return len(self.item_rows())

    def items(self) -> list[dict[str, str | int | None]]:
        parsed_items: list[dict[str, str | int | None]] = []
        for row in self.item_rows():
            name = row.find_element(*self.ITEM_NAME).text.strip()
            price = row.find_element(*self.ITEM_PRICE).text.strip()
            quantity_match = re.search(r"Quantity:\s*(\d+)", row.text)
            quantity = int(quantity_match.group(1)) if quantity_match else None
            parsed_items.append({"name": name, "quantity": quantity, "price": price})
        return parsed_items

    def has_item(self, expected_name: str, expected_quantity: int) -> bool:
        normalized_expected = self.normalize_text(expected_name)
        for item in self.items():
            item_name = self.normalize_text(str(item["name"]))
            if item_name == normalized_expected and item["quantity"] == expected_quantity and item["price"]:
                return True
        return False

    def total_text(self) -> str:
        return self.wait_visible(self.TOTAL_ROW).text.strip()

    def empty_cart_and_reopen(self) -> None:
        button = self.wait_clickable(self.EMPTY_CART_BUTTON)
        self.scroll_into_view(button)
        previous_url = self.driver.current_url
        button.click()
        self.wait_until(
            lambda driver: driver.current_url != previous_url,
            "清空购物车后页面未完成跳转",
        )
        self.wait_for_document_ready()
        self.load()
