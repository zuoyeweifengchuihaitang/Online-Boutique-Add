from pages.home_page import HomePage


def test_tc02_product_detail(driver, base_url, metrics) -> None:
    home = HomePage(driver, base_url)
    home.load()
    first_product = home.first_product_summary()
    home_url = driver.current_url

    with metrics.measure("product_detail_load"):
        product_summary, product_page = home.open_first_product()

    assert driver.current_url != home_url
    assert "/product/" in driver.current_url
    assert product_page.name(), "商品详情页应显示商品名称"
    assert product_page.price(), "商品详情页应显示商品价格"
    assert product_page.image_src(), "商品详情页应包含商品图片"
    assert product_page.has_quantity_control(), "商品详情页应包含数量输入控件"
    assert product_page.has_add_to_cart_button(), "商品详情页应包含加入购物车按钮"
    assert product_summary["name"] == first_product["name"]
    assert product_page.normalize_text(first_product["name"]) == product_page.normalize_text(product_page.name())
