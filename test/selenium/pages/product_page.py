from __future__ import annotations

from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.support.ui import Select

from pages.base_page import BasePage, Locator


class ProductPage(BasePage):
    PRODUCT_MAIN: Locator = (By.CSS_SELECTOR, ".h-product.container")
    PRODUCT_NAME: Locator = (By.CSS_SELECTOR, ".product-info h2")
    PRODUCT_PRICE: Locator = (By.CSS_SELECTOR, ".product-price")
    PRODUCT_IMAGE: Locator = (By.CSS_SELECTOR, "img.product-image")
    QUANTITY_SELECT: Locator = (By.CSS_SELECTOR, "select#quantity[name='quantity']")
    ADD_TO_CART_BUTTON: Locator = (
        By.CSS_SELECTOR,
        ".product-info form button[type='submit'].cymbal-button-primary",
    )
    REVIEW_SECTION: Locator = (By.CSS_SELECTOR, ".reviews-section")
    REVIEW_FORM: Locator = (By.ID, "reviewForm")
    REVIEW_USER_NAME: Locator = (By.ID, "user_name")
    REVIEW_RATING: Locator = (By.ID, "rating")
    REVIEW_TITLE_INPUT: Locator = (By.ID, "title")
    REVIEW_CONTENT_INPUT: Locator = (By.ID, "content")
    REVIEW_SUBMIT_BUTTON: Locator = (By.CSS_SELECTOR, "#reviewForm button[type='submit']")
    REVIEW_SUCCESS: Locator = (By.ID, "reviewSuccess")
    REVIEW_ERROR: Locator = (By.ID, "reviewError")
    REVIEW_CARDS: Locator = (By.CSS_SELECTOR, ".review-card")
    REVIEW_CARD_TITLE: Locator = (By.CSS_SELECTOR, ".review-title")
    REVIEW_CARD_AUTHOR: Locator = (By.CSS_SELECTOR, ".review-author")
    REVIEW_CARD_CONTENT: Locator = (By.CSS_SELECTOR, ".review-content")
    NO_REVIEWS: Locator = (By.CSS_SELECTOR, ".no-reviews")

    def wait_loaded(self) -> None:
        self.wait_visible(self.PRODUCT_MAIN)
        self.wait_visible(self.PRODUCT_NAME)
        self.wait_visible(self.PRODUCT_PRICE)
        self.wait_visible(self.PRODUCT_IMAGE)
        self.wait_visible(self.QUANTITY_SELECT)
        self.wait_clickable(self.ADD_TO_CART_BUTTON)
        self.wait_until(lambda driver: "/product/" in driver.current_url, "当前 URL 未进入商品详情页")
        self.assert_no_error_page()

    def name(self) -> str:
        return self.wait_visible(self.PRODUCT_NAME).text.strip()

    def price(self) -> str:
        return self.wait_visible(self.PRODUCT_PRICE).text.strip()

    def image_src(self) -> str:
        return self.wait_visible(self.PRODUCT_IMAGE).get_attribute("src") or ""

    def has_quantity_control(self) -> bool:
        return self.wait_visible(self.QUANTITY_SELECT).is_displayed()

    def has_add_to_cart_button(self) -> bool:
        return self.wait_clickable(self.ADD_TO_CART_BUTTON).is_enabled()

    def select_quantity(self, quantity: int) -> None:
        Select(self.wait_visible(self.QUANTITY_SELECT)).select_by_visible_text(str(quantity))

    def add_to_cart(self) -> "CartPage":
        button = self.wait_clickable(self.ADD_TO_CART_BUTTON)
        self.scroll_into_view(button)
        button.click()
        from pages.cart_page import CartPage

        cart_page = CartPage(self.driver, self.base_url, self.timeout)
        cart_page.wait_loaded()
        return cart_page

    def wait_reviews_loaded(self) -> None:
        self.wait_visible(self.REVIEW_SECTION)
        self.wait_visible(self.REVIEW_FORM)
        self.wait_visible(self.REVIEW_USER_NAME)
        self.wait_visible(self.REVIEW_RATING)
        self.wait_visible(self.REVIEW_TITLE_INPUT)
        self.wait_visible(self.REVIEW_CONTENT_INPUT)
        self.wait_clickable(self.REVIEW_SUBMIT_BUTTON)
        self.assert_no_error_page()

    def review_cards(self) -> list:
        return self.driver.find_elements(*self.REVIEW_CARDS)

    def has_no_reviews_message(self) -> bool:
        return len(self.driver.find_elements(*self.NO_REVIEWS)) > 0

    def review_form_is_html5_valid(self) -> bool:
        form = self.wait_present(self.REVIEW_FORM)
        return bool(self.driver.execute_script("return arguments[0].checkValidity();", form))

    def submit_review(self, user_name: str, rating: int, title: str, content: str) -> None:
        self.wait_reviews_loaded()
        self._set_review_text(self.REVIEW_USER_NAME, user_name)
        self._set_review_text(self.REVIEW_TITLE_INPUT, title)
        self._set_review_text(self.REVIEW_CONTENT_INPUT, content)
        from selenium.webdriver.support.ui import Select

        Select(self.wait_visible(self.REVIEW_RATING)).select_by_value(str(rating))
        button = self.wait_clickable(self.REVIEW_SUBMIT_BUTTON)
        self.scroll_into_view(button)
        button.click()
        self.wait_until(
            lambda _: self.review_exists(title=title, user_name=user_name, content=content),
            f"提交评论后未在评论列表中看到评论: {title}",
            timeout=20,
        )

    def review_exists(self, title: str, user_name: str | None = None, content: str | None = None) -> bool:
        expected_title = self.normalize_text(title)
        expected_user = self.normalize_text(user_name or "")
        expected_content = self.normalize_text(content or "")
        try:
            for card in self.review_cards():
                card_title = self.normalize_text(card.find_element(*self.REVIEW_CARD_TITLE).text)
                if card_title != expected_title:
                    continue
                if user_name:
                    card_user = self.normalize_text(card.find_element(*self.REVIEW_CARD_AUTHOR).text)
                    if card_user != expected_user:
                        continue
                if content:
                    card_content = self.normalize_text(card.find_element(*self.REVIEW_CARD_CONTENT).text)
                    if expected_content not in card_content:
                        continue
                return True
        except (NoSuchElementException, StaleElementReferenceException):
            return False
        return False

    def review_content_inner_html(self, title: str) -> str:
        expected_title = self.normalize_text(title)
        for card in self.review_cards():
            card_title = self.normalize_text(card.find_element(*self.REVIEW_CARD_TITLE).text)
            if card_title == expected_title:
                content = card.find_element(*self.REVIEW_CARD_CONTENT)
                return content.get_attribute("innerHTML") or ""
        raise AssertionError(f"未找到标题为 {title} 的评论")

    def _set_review_text(self, locator: Locator, value: str) -> None:
        element = self.wait_visible(locator)
        element.clear()
        element.send_keys(value)
