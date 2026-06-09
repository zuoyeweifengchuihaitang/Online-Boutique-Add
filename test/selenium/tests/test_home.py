from pages.home_page import HomePage


def test_tc01_home_page_loads(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)

    with metrics.measure("home_load"):
        home.load()
    metrics.add_navigation_timing(driver, "home_navigation_timing")

    assert "Online Boutique" in driver.title or "Cymbal Shops" in driver.title
    assert home.product_count() > 0, "首页商品数量应大于 0"

    first_product = home.first_product_summary()
    assert first_product["name"], "第一个商品应包含名称"
    assert first_product["price"], "第一个商品应包含价格"
    assert "/product/" in first_product["href"], "第一个商品应包含可点击的详情入口"

    metrics.capture_screenshot(driver, "home_success")
