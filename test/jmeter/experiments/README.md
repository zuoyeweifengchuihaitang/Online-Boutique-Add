# JMeter Experiments

每次正式实验使用唯一 `RUN_ID`，由 `scripts/run-test.*` 自动创建：

```text
experiments/<RUN_ID>/
├── manifest.csv
├── events.csv
├── jmeter/
│   ├── result.jtl
│   ├── jmeter.log
│   ├── summary.csv
│   ├── summary.md
│   └── report/
├── monitoring/
│   ├── prometheus/
│   └── grafana/
└── chaos/
```

## 已完成实验

| Phase | Run ID | Config | 场景 | 结果 |
|:-----|--------|--------|------|:----:|
| ✅ 冒烟 | OB-SMOKE-R01 | `smoke.properties` | 1用户, 60s, 混合+评论 | 37/37 ✅ 0% |
| ✅ 负面 | OB-NEGATIVE-REVIEW-R01 | `negative-review.properties` | 验证评论逻辑(空字段/越界) | ✅ 通过 |
| ✅ 基线10 | OB-BASELINE-10U-R01 | `baseline-10.properties` | 10用户, 300s, 混合购物 | 494/494 ✅ 0% |
| ✅ 基线30 | OB-BASELINE-30U-R01 | `baseline-30.properties` | 30用户, 300s, 混合购物 | 1429/1429 ✅ 0% |
| ✅ 基线50 | OB-BASELINE-50U-R01 | `baseline-50.properties` | 50用户, 300s, 混合购物 | 2272/2272 ✅ 0% |
| ✅ 评论读取 | OB-REVIEW-READ-30U-R01 | `review-read-30.properties` | 30用户, 300s, 纯读评论 | 3449/3449 ✅ 0% |
| ✅ 评论读写 | OB-REVIEW-WRITE-10U-R01~R18 | `review-write-10.properties` | 10用户, 300s, 写+读评论 | **多轮迭代修复后 99.79%** |
| ❌ 验证测试 | OB-REVIEW-VERIFY-R01 | `review-verify.properties` | 1用户, 60s (测试文件) | 废弃 |

## 修复记录

| 问题 | 修复 | 影响 |
|------|------|------|
| `reviews.html` 模板缺失 | 创建 `src/frontend/templates/reviews.html` | T07 从不可用变可用 |
| SQLite 写并发锁 | WAL模式 + `SetMaxOpenConns(5)` + 优化PRAGMA | T06 2.74% → **0%** |
| JMeter 多线程变量覆盖 | 断言从 `vars.get('review_title')` 改为结构检查 | T07/T08 70% → **0.21%** |
