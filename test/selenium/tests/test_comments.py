from __future__ import annotations

from datetime import datetime

import pytest

from pages.home_page import HomePage


def _unique(prefix: str) -> str:
    return f"{prefix} {datetime.now().strftime('%Y%m%d%H%M%S%f')}"


@pytest.mark.comments
def test_tc08_review_section_loads(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    _, product_page = home.open_first_product()

    with metrics.measure("review_section_load"):
        product_page.wait_reviews_loaded()

    assert product_page.wait_visible(product_page.REVIEW_SECTION).is_displayed()
    assert product_page.wait_visible(product_page.REVIEW_FORM).is_displayed()
    assert product_page.has_no_reviews_message() or len(product_page.review_cards()) > 0


@pytest.mark.comments
def test_tc09_submit_review(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    _, product_page = home.open_first_product()
    title = _unique("Selenium review")
    content = _unique("Review content")
    user_name = _unique("Selenium User")

    with metrics.measure("review_submit"):
        product_page.submit_review(user_name=user_name, rating=5, title=title, content=content)

    assert product_page.review_exists(title=title, user_name=user_name, content=content)
    product_page.assert_no_error_page()


@pytest.mark.comments
def test_tc10_review_persists_after_refresh(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    _, product_page = home.open_first_product()
    title = _unique("Persistent review")
    content = _unique("Persistent content")
    user_name = _unique("Persistent User")
    product_page.submit_review(user_name=user_name, rating=4, title=title, content=content)

    with metrics.measure("review_refresh"):
        driver.refresh()
        product_page.wait_loaded()
        product_page.wait_reviews_loaded()

    assert product_page.review_exists(title=title, user_name=user_name, content=content)


@pytest.mark.comments
def test_tc11_review_product_isolation(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    _, first_product = home.open_product_by_index(0)
    title = _unique("Isolated review")
    content = _unique("Only first product")
    user_name = _unique("Isolation User")
    first_product.submit_review(user_name=user_name, rating=5, title=title, content=content)

    with metrics.measure("review_product_isolation"):
        home.load()
        _, second_product = home.open_product_by_index(1)
        second_product.wait_reviews_loaded()

    assert not second_product.review_exists(title=title), "评论不应出现在其他商品详情页"


@pytest.mark.comments
def test_tc12_review_content_is_escaped(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    _, product_page = home.open_first_product()
    title = _unique("Escaped review")
    content = "<b>Selenium escaped content</b>"
    user_name = _unique("Escaped User")

    with metrics.measure("review_html_escape"):
        product_page.submit_review(user_name=user_name, rating=3, title=title, content=content)

    inner_html = product_page.review_content_inner_html(title)
    assert "<b>" not in inner_html.lower(), "评论内容不应作为 HTML 标签渲染"
    assert "&lt;b&gt;" in inner_html.lower() or "selenium escaped content" in inner_html.lower()
