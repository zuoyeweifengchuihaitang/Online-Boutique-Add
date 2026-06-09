from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import Select

from pages.base_page import BasePage, Locator


class HomePage(BasePage):
    SHOP_LOGO: Locator = (By.CSS_SELECTOR, "a.navbar-brand img")
    HOME_MAIN: Locator = (By.CSS_SELECTOR, "main.home")
    HOT_PRODUCTS_HEADING: Locator = (By.CSS_SELECTOR, ".hot-products-row h3")
    PRODUCT_CARDS: Locator = (By.CSS_SELECTOR, ".hot-products-row .hot-product-card")
    PRODUCT_LINK: Locator = (By.CSS_SELECTOR, "a[href*='/product/']")
    PRODUCT_NAME: Locator = (By.CSS_SELECTOR, ".hot-product-card-name")
    PRODUCT_PRICE: Locator = (By.CSS_SELECTOR, ".hot-product-card-price")
    CURRENCY_SELECT: Locator = (By.CSS_SELECTOR, "#currency_form select[name='currency_code']")
    CART_LINK: Locator = (By.CSS_SELECTOR, "a.cart-link[href$='/cart']")

    def load(self) -> None:
        self.open("/")
        self.wait_loaded()

    def wait_loaded(self) -> None:
        self.wait_visible(self.HOME_MAIN)
        self.wait_visible(self.SHOP_LOGO)
        self.wait_visible(self.HOT_PRODUCTS_HEADING)
        self.wait_until(lambda _: len(self.product_cards()) > 0, "首页商品列表未加载出任何商品")
        self.assert_no_error_page()

    def product_cards(self) -> list[WebElement]:
        return self.driver.find_elements(*self.PRODUCT_CARDS)

    def product_count(self) -> int:
        return len(self.product_cards())

    def _summary_from_card(self, card: WebElement) -> dict[str, str]:
        name = card.find_element(*self.PRODUCT_NAME).text.strip()
        price = card.find_element(*self.PRODUCT_PRICE).text.strip()
        link = card.find_element(*self.PRODUCT_LINK)
        href = link.get_attribute("href") or ""
        return {"name": name, "price": price, "href": href}

    def first_product_summary(self) -> dict[str, str]:
        for card in self.product_cards():
            summary = self._summary_from_card(card)
            if summary["name"] and summary["price"] and summary["href"]:
                return summary
        raise AssertionError("首页未找到同时包含名称、价格和链接的有效商品卡片")

    def open_first_product(self) -> tuple[dict[str, str], "ProductPage"]:
        return self.open_product_by_index(0)

    def open_product_by_index(self, index: int) -> tuple[dict[str, str], "ProductPage"]:
        cards = self.product_cards()
        if index < 0 or index >= len(cards):
            raise AssertionError(f"首页商品索引超出范围: {index}, 商品数量: {len(cards)}")

        valid_index = -1
        for card in self.product_cards():
            summary = self._summary_from_card(card)
            if not (summary["name"] and summary["price"] and summary["href"]):
                continue
            valid_index += 1
            if valid_index != index:
                continue
            link = card.find_element(*self.PRODUCT_LINK)
            self.scroll_into_view(link)
            link.click()
            from pages.product_page import ProductPage

            product_page = ProductPage(self.driver, self.base_url, self.timeout)
            product_page.wait_loaded()
            return summary, product_page
        raise AssertionError(f"首页没有索引为 {index} 的可点击有效商品入口")

    def first_price_text(self) -> str:
        summary = self.first_product_summary()
        return summary["price"]

    def currency_options(self) -> list[str]:
        select = self.wait_visible(self.CURRENCY_SELECT)
        return [option.get_attribute("value") or option.text.strip() for option in Select(select).options]

    def selected_currency(self) -> str:
        select = self.wait_visible(self.CURRENCY_SELECT)
        selected = Select(select).first_selected_option
        return selected.get_attribute("value") or selected.text.strip()

    def choose_alternate_currency(self, preferred: str = "JPY") -> str:
        options = self.currency_options()
        selected = self.selected_currency()
        if preferred in options and preferred != selected:
            return preferred
        for option in options:
            if option != selected:
                return option
        raise AssertionError("当前页面没有可用于切换的第二个币种选项")

    def change_currency(self, currency_code: str) -> None:
        select = self.wait_visible(self.CURRENCY_SELECT)
        Select(select).select_by_value(currency_code)
        self.wait_for_document_ready()
        self.wait_loaded()
        self.wait_until(
            lambda _: self.selected_currency() == currency_code,
            f"币种未成功切换为 {currency_code}",
        )
