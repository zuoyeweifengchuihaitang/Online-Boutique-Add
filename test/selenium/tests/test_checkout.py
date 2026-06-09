import pytest

from pages.checkout_page import CheckoutPage
from pages.home_page import HomePage


@pytest.mark.checkout
def test_tc06_complete_checkout(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    checkout = CheckoutPage(driver, base_url)

    with metrics.measure("complete_shopping_flow"):
        home.load()
        _, product_page = home.open_first_product()
        product_page.select_quantity(1)

        with metrics.measure("cart_open"):
            cart = product_page.add_to_cart()
        assert cart.item_count() > 0, "结算前购物车应至少包含一个商品"

        checkout.fill_form(CheckoutPage.successful_test_data())

        with metrics.measure("submit_order"):
            checkout.place_order()

    heading = checkout.order_heading()
    details = checkout.confirmation_details()

    assert "complete" in heading.lower(), "订单确认页应显示订单完成提示"
    assert details.get("Confirmation #"), "订单确认页应显示 Confirmation #"
    assert details.get("Tracking #"), "订单确认页应显示 Tracking #"
    assert details.get("Total Paid"), "订单确认页应显示 Total Paid"
    checkout.assert_no_error_page()

    metrics.capture_screenshot(driver, "order_success")
