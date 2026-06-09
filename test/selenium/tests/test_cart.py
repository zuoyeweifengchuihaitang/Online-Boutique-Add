from pages.cart_page import CartPage
from pages.home_page import HomePage


def test_tc03_add_to_cart(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    product_summary, product_page = home.open_first_product()
    product_page.select_quantity(1)

    with metrics.measure("add_to_cart"):
        cart = product_page.add_to_cart()

    assert cart.has_item(product_summary["name"], 1), "购物车中应出现刚加入的商品，数量为 1"
    assert cart.total_text(), "购物车应显示总额"
    cart.assert_no_error_page()


def test_tc04_empty_cart(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    _, product_page = home.open_first_product()
    product_page.select_quantity(1)
    cart = product_page.add_to_cart()
    assert cart.item_count() > 0, "清空前购物车应至少有一个商品"

    with metrics.measure("empty_cart"):
        cart.empty_cart_and_reopen()

    assert cart.is_empty(), "清空购物车后应显示空购物车状态"
    assert cart.item_count() == 0, "清空购物车后商品行数量应为 0"
    assert "empty" in cart.empty_message().lower()
    cart.assert_no_error_page()


def test_tc07_cart_session_persists_after_refresh(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    product_summary, product_page = home.open_first_product()
    product_page.select_quantity(1)
    cart = product_page.add_to_cart()
    assert cart.has_item(product_summary["name"], 1), "刷新前购物车应包含加入的商品"

    with metrics.measure("cart_refresh"):
        driver.refresh()
        cart.wait_loaded()

    assert cart.has_item(product_summary["name"], 1), "同一浏览器会话刷新后购物车状态应保持"
