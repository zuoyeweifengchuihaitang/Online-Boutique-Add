import pytest

from pages.home_page import HomePage


@pytest.mark.currency
def test_tc05_currency_switch(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    original_price = home.first_price_text()
    target_currency = home.choose_alternate_currency("JPY")

    with metrics.measure("currency_switch"):
        home.change_currency(target_currency)
        home.wait_until(
            lambda _: home.first_price_text() != original_price,
            "切换币种后商品价格文本未发生变化",
        )

    changed_price = home.first_price_text()
    assert home.selected_currency() == target_currency
    assert changed_price != original_price
    home.assert_no_error_page()

    driver.refresh()
    home.wait_loaded()
    assert home.selected_currency() == target_currency, "刷新页面后币种选择应按当前应用 Cookie 逻辑保持"
