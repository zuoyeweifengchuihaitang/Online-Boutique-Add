# Online Boutique Selenium 功能测试

本目录包含基于 Python、pytest 和 Selenium 4 的 Online Boutique 功能自动化测试。测试覆盖首页、商品详情、币种切换、购物车、结算流程、会话保持，以及新增的商品评论系统。测试默认使用 Selenium Manager 自动管理浏览器驱动；如果本机网络或浏览器版本导致 Selenium Manager 不可用，可以通过 `--driver-path` 指定项目目录外的本地驱动。

## 环境安装

Windows PowerShell：

```powershell
cd test\selenium
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Git Bash：

```bash
cd test/selenium
python -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 运行前准备

```bash
kubectl config use-context online-boutique
kubectl get pods
kubectl port-forward deployment/frontend 8080:8080
```

端口转发需要在另一个终端保持运行。默认测试地址为 `http://127.0.0.1:8080`。如果该地址不可访问，测试会统一跳过并在报告中说明“Online Boutique 前端不可访问”。

## Chrome 普通模式

```bash
pytest -v --browser=chrome --base-url=http://127.0.0.1:8080
```

## Chrome 无头模式

```bash
pytest -v --browser=chrome --headless --base-url=http://127.0.0.1:8080
```

## Chrome 使用本地驱动

如果 Selenium Manager 无法联网获取 ChromeDriver，可以通过 `--driver-path` 指定外部驱动目录或 exe 文件。不要把驱动放进项目目录，也不要在代码里硬编码路径。

Windows PowerShell：

```powershell
pytest -v --browser=chrome --headless --base-url=http://127.0.0.1:8080 --driver-path=E:\daima\chromedriver-win64
```

## Edge

```bash
pytest -v --browser=edge --base-url=http://127.0.0.1:8080
```

## Firefox

```bash
pytest -v --browser=firefox --base-url=http://127.0.0.1:8080
```

如果使用本地 geckodriver：

```bash
pytest -v --browser=firefox --headless --base-url=http://127.0.0.1:8080 --driver-path=E:\daima\geckodriver-win64
```

## 仅运行评论系统用例

```bash
pytest -v tests/test_comments.py --browser=chrome --headless --base-url=http://127.0.0.1:8080
```

## 生成报告

以下命令会同时生成 pytest HTML 报告、pytest JSON 报告、测试历史结果和中文 Markdown 总结：

```bash
pytest -v --browser=chrome --headless --base-url=http://127.0.0.1:8080 --html=reports/report.html --self-contained-html --json-report --json-report-file=reports/pytest-report.json
```

报告文件：

- `reports/report.html`
- `reports/pytest-report.json`
- `reports/results.csv`
- `reports/results.json`
- `reports/summary.md`
- `reports/screenshots/`

如果连续运行多个浏览器，`reports/report.html` 会被最后一次运行覆盖。需要保留独立报告时，可将其复制为：

- `reports/report_chrome_comments.html`
- `reports/report_edge_comments.html`
- `reports/report_firefox_comments.html`

可选参数：

- `--browser=chrome|edge|firefox`
- `--headless`
- `--base-url=http://127.0.0.1:8080`
- `--driver-path=<driver exe 或包含驱动的目录>`
