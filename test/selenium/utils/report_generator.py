from __future__ import annotations

import math
import statistics
from datetime import datetime
from pathlib import Path
from typing import Any


CASE_LABELS = {
    "test_tc01_home_page_loads": "TC01：首页加载",
    "test_tc02_product_detail": "TC02：商品详情",
    "test_tc03_add_to_cart": "TC03：加入购物车",
    "test_tc04_empty_cart": "TC04：清空购物车",
    "test_tc05_currency_switch": "TC05：币种切换",
    "test_tc06_complete_checkout": "TC06：完整结算流程",
    "test_tc07_cart_session_persists_after_refresh": "TC07：页面刷新和会话保持",
    "test_tc08_review_section_loads": "TC08：评论区加载",
    "test_tc09_submit_review": "TC09：提交评论",
    "test_tc10_review_persists_after_refresh": "TC10：评论刷新保持",
    "test_tc11_review_product_isolation": "TC11：评论商品隔离",
    "test_tc12_review_content_is_escaped": "TC12：评论内容转义",
}

STATUS_LABELS = {
    "passed": "通过",
    "failed": "失败",
    "skipped": "跳过",
}


def case_label(test_name: str) -> str:
    return CASE_LABELS.get(test_name, test_name)


def _round(value: float | int | None) -> str:
    if value is None:
        return ""
    return str(round(float(value), 2))


def _percent(numerator: int, denominator: int) -> str:
    if denominator == 0:
        return "0.00%"
    return f"{(numerator / denominator) * 100:.2f}%"


def _p95(values: list[float]) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    rank = math.ceil(0.95 * len(sorted_values)) - 1
    rank = max(0, min(rank, len(sorted_values) - 1))
    return sorted_values[rank]


def _duration_stats(values: list[float]) -> dict[str, float | None]:
    if not values:
        return {"avg": None, "min": None, "max": None, "p95": None}
    return {
        "avg": statistics.mean(values),
        "min": min(values),
        "max": max(values),
        "p95": _p95(values),
    }


def _possible_cause(record: dict[str, Any]) -> tuple[str, str]:
    error_type = str(record.get("error_type") or "")
    message = str(record.get("error_message") or "")
    if error_type == "FrontendUnavailable":
        return ("前端未启动、Minikube Pod 未就绪或 `kubectl port-forward` 未保持运行。", "是")
    if (
        "WebDriver" in error_type
        or "SessionNotCreated" in error_type
        or "RuntimeError" in error_type and "Selenium Manager" in message
        or "浏览器启动失败" in message
    ):
        return ("浏览器未安装、版本不兼容，或 Selenium Manager 无法获取驱动。", "是")
    if "Timeout" in error_type:
        return ("页面未在预期时间内出现目标元素，可能是服务响应慢、页面错误或定位失效。", "可能")
    if "Assertion" in error_type:
        return ("业务断言未满足，需要结合当前页面和截图确认是否为功能缺陷。", "否/待确认")
    if "Online Boutique 前端不可访问" in message:
        return ("前端地址不可达，测试未实际执行浏览器流程。", "是")
    return ("需结合异常信息和截图进一步定位。", "待确认")


def generate_summary(
    summary_path: Path,
    environment: dict[str, Any],
    records: list[dict[str, Any]],
) -> None:
    started = environment.get("started_at") or ""
    ended = environment.get("ended_at") or datetime.now().isoformat(timespec="seconds")
    total = len(records)
    passed = sum(1 for r in records if r.get("status") == "passed")
    failed = sum(1 for r in records if r.get("status") == "failed")
    skipped = sum(1 for r in records if r.get("status") == "skipped")
    durations = [float(r.get("duration_ms") or 0) for r in records]
    stats = _duration_stats(durations)

    operation_values: list[tuple[str, str, float]] = []
    for record in records:
        metrics = record.get("operation_metrics") or {}
        if isinstance(metrics, dict):
            for name, value in metrics.items():
                if isinstance(value, (int, float)):
                    operation_values.append((record.get("test_case", ""), name, float(value)))
    operation_stats = _duration_stats([item[2] for item in operation_values])
    longest_operation = max(operation_values, key=lambda item: item[2], default=None)

    lines: list[str] = []
    lines.append("# Online Boutique Selenium 自动化测试总结")
    lines.append("")
    lines.append("## 1. 测试环境")
    lines.append("")
    lines.append(f"- 操作系统：{environment.get('os', '')}")
    lines.append(f"- Python 版本：{environment.get('python_version', '')}")
    lines.append(f"- Selenium 版本：{environment.get('selenium_version', '')}")
    lines.append(f"- 浏览器和版本：{environment.get('browser_versions', '未获取')}")
    lines.append(f"- Base URL：{environment.get('base_url', '')}")
    lines.append(f"- 测试开始时间：{started}")
    lines.append(f"- 测试结束时间：{ended}")
    lines.append(f"- Headless 模式：{environment.get('headless', False)}")
    lines.append(f"- 前端可访问性：{environment.get('frontend_status', '')}")
    lines.append("")
    lines.append("## 2. 总体结果")
    lines.append("")
    lines.append(f"- 测试用例总数：{total}")
    lines.append(f"- 通过数：{passed}")
    lines.append(f"- 失败数：{failed}")
    lines.append(f"- 跳过数：{skipped}")
    lines.append(f"- 通过率：{_percent(passed, total)}")
    lines.append(f"- 总耗时/ms：{_round(sum(durations))}")
    lines.append("")
    lines.append("## 3. 用例结果表")
    lines.append("")
    lines.append("| 用例 | 浏览器 | 状态 | 耗时/ms | 说明 |")
    lines.append("| --- | --- | --- | ---: | --- |")
    for record in records:
        status = STATUS_LABELS.get(str(record.get("status")), str(record.get("status", "")))
        note = str(record.get("error_message") or "执行完成")
        note = note.replace("\n", " ")[:180]
        lines.append(
            f"| {record.get('test_case', '')} | {record.get('browser', '')} | {status} | "
            f"{_round(record.get('duration_ms'))} | {note} |"
        )
    lines.append("")
    lines.append("## 4. 时间统计")
    lines.append("")
    lines.append("说明：以下耗时为端到端浏览器交互耗时，包含 Selenium 操作、浏览器渲染和前端/后端响应等待，不代表服务端纯响应时间。")
    lines.append("")
    lines.append(f"- 用例平均耗时/ms：{_round(stats['avg'])}")
    lines.append(f"- 用例最小耗时/ms：{_round(stats['min'])}")
    lines.append(f"- 用例最大耗时/ms：{_round(stats['max'])}")
    lines.append(f"- 用例 P95 耗时/ms：{_round(stats['p95'])}")
    if total < 20:
        lines.append("- 样本量少于 20，P95 仅作本次执行的粗略参考，不具备稳定统计意义。")
    lines.append(f"- 操作平均耗时/ms：{_round(operation_stats['avg'])}")
    lines.append(f"- 操作最小耗时/ms：{_round(operation_stats['min'])}")
    lines.append(f"- 操作最大耗时/ms：{_round(operation_stats['max'])}")
    lines.append(f"- 操作 P95 耗时/ms：{_round(operation_stats['p95'])}")
    if longest_operation:
        lines.append(
            f"- 本次最长操作：{longest_operation[0]} / {longest_operation[1]}，"
            f"{_round(longest_operation[2])} ms"
        )
    lines.append("")
    lines.append("## 5. 失败分析")
    lines.append("")
    failed_records = [r for r in records if r.get("status") == "failed"]
    if not failed_records:
        lines.append("本次没有失败用例。")
    else:
        for record in failed_records:
            cause, env_related = _possible_cause(record)
            lines.append(f"### {record.get('test_case', '')}")
            lines.append("")
            lines.append(f"- 失败步骤：{record.get('failed_step') or 'pytest 执行阶段'}")
            lines.append(f"- 异常信息：{record.get('error_type', '')} {record.get('error_message', '')}")
            lines.append(f"- 当前 URL：{record.get('current_url', '')}")
            lines.append(f"- 截图路径：{record.get('screenshot', '')}")
            lines.append(f"- 可能原因：{cause}")
            lines.append(f"- 是否可能属于环境问题：{env_related}")
            lines.append("")
    skipped_records = [r for r in records if r.get("status") == "skipped"]
    if skipped_records:
        lines.append("### 跳过说明")
        lines.append("")
        for record in skipped_records:
            lines.append(f"- {record.get('test_case', '')}：{record.get('error_message', '')}")
        lines.append("")
    lines.append("## 6. 测试结论")
    lines.append("")
    passed_cases = [r.get("test_case", "") for r in records if r.get("status") == "passed"]
    failed_cases = [r.get("test_case", "") for r in records if r.get("status") == "failed"]
    if passed_cases:
        lines.append(f"- 验证通过的功能：{', '.join(passed_cases)}")
    else:
        lines.append("- 验证通过的功能：无")
    if failed_cases:
        lines.append(f"- 失败的功能：{', '.join(failed_cases)}")
    else:
        lines.append("- 失败的功能：无")
    if longest_operation:
        lines.append(f"- 耗时最长步骤：{longest_operation[0]} / {longest_operation[1]}。")
    else:
        lines.append("- 耗时最长步骤：无可用操作耗时数据。")
    lines.append("- 是否发现明显功能缺陷：失败用例需要结合截图和异常信息判定；通过用例未暴露明显功能缺陷。")
    lines.append("- 页面定位稳定性：主要使用 id、name、稳定 CSS class 和语义化 CSS 选择器；未修改 Online Boutique 业务代码。")
    lines.append("- 测试结果局限性：本报告只覆盖本次运行的浏览器、环境和数据，耗时不是服务端纯响应时间。")
    lines.append("- 后续适合增加的测试：多商品购物车、不同数量边界、无效结算表单、更多币种组合和跨浏览器回归。")
    lines.append("")

    summary_path.write_text("\n".join(lines), encoding="utf-8-sig")
