# Online Boutique 微服务智能运维 Agent

## 功能概述

VeADK (Versatile Autonomous Diagnosis & Knowledge) Agent 是一个智能运维闭环系统，具备四大能力：

| 能力 | 说明 |
|------|------|
| 🔍 **异常检测** | 7 种异常：Pod 宕机/不就绪/频繁重启、CPU/内存偏高或过高、HTTP 5xx 错误率、gRPC 错误率 |
| 🏷️ **根因分类** | 三级严重程度：HEALTHY / WARNING / CRITICAL，自动归类到具体服务和指标 |
| ⚡ **故障注入与验证** | 配合 Chaos Mesh 8 种故障场景，一键脚本自动演练并验证检测效果 |
| 🩹 **自动故障恢复** | 检测到 CRITICAL 时自动 `kubectl rollout restart`，60 秒冷却防抖动 |

---

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动 Agent（需先启动 Prometheus 端口转发）

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

**Windows（推荐）：**
```cmd
run_monitor.bat
```

**Windows / Linux 手动：**
```bash
python run_monitor.py
```

### 3. 预期输出

Agent 每 10 秒进行一次巡检：

```
[第 1 次巡检] 开始采集数据...
[数据采集] 正在从 Prometheus 查询指标...
[状态检查] 正在检查 Pod 健康状态...

[2026-06-07 01:27:53] 系统巡检报告
----------------------------------------------------------------------

📊 性能指标:
  CPU 使用率:        0.0270
  内存使用量:        151.1 MB
  HTTP 5xx 错误率:   0.0000
  gRPC 错误率:       0.0000
  运行中的 Pod 数:   12

🔍 Pod 状态检查:
  所有 Pod 运行正常

🔬 诊断结论 [严重程度: HEALTHY]:
  ✅ 系统运行正常

🩹 自动恢复
======================================================================
```

---

## 监控的微服务（12 个）

| 服务名称 | 语言 | 协议 |
|---------|------|------|
| frontend | Go | HTTP |
| productcatalogservice | Go | gRPC |
| cartservice | C# | gRPC |
| currencyservice | Node.js | gRPC |
| paymentservice | Node.js | gRPC |
| shippingservice | Go | gRPC |
| checkoutservice | Go | gRPC |
| emailservice | Python | gRPC |
| recommendationservice | Python | gRPC |
| adservice | Java | gRPC |
| reviewservice | Go | HTTP REST |
| loadgenerator | Python | HTTP |

---

## 严重程度分类

### HEALTHY（健康）
- 所有指标正常，系统运行良好
- CPU < 15%，内存 < 2GB
- HTTP/gRPC 错误率 < 0.5%
- 所有 Pod Running 且就绪

### WARNING（警告）
- 检测到轻度异常，需要关注
- CPU 15%-80%，内存 2-4GB
- HTTP/gRPC 错误率 0.5%-1%

### CRITICAL（严重）
- 系统存在严重问题，需要立即处理
- CPU > 80%，内存 > 4GB
- HTTP/gRPC 错误率 > 1%
- Pod 状态异常（Pending、不就绪、频繁重启 > 15 次）
- **触发自动故障恢复**

---

## 监控指标详解

### CPU 使用率
```
max(rate(container_cpu_usage_seconds_total{namespace="default"}[1m]))
```
取 default 命名空间中最热容器的 1 分钟 CPU 速率

### 内存使用量
```
max(container_memory_usage_bytes{namespace="default"}) / 1024 / 1024
```
取 default 命名空间中最高的容器内存占用，单位 MB

### HTTP 5xx 错误率
```
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
```
HTTP 服务器错误速率

### gRPC 错误率
```
sum(rate(grpc_server_handled_total{grpc_code!="OK"}[5m]))
```
gRPC 非 OK 状态码速率

### Pod 状态
- 检查每个 Pod 的运行阶段（Running / Pending / Failed）
- 监控容器就绪状态（Ready）
- 统计容器重启次数（阈值 > 15 次告警）

---

## 自动故障恢复

Agent 检测到 CRITICAL 且 Pod 异常时，自动执行 `kubectl rollout restart` 重建 Deployment。

```
🔬 诊断结论 [严重程度: CRITICAL]:
  ✗ currencyservice Pod 不就绪 (Ready=0/1)

🩹 自动恢复:
  [RESTART] currencyservice
```

**冷却机制：** 同一服务 60 秒内不重复重启，防止抖动导致无限循环。

---

## 故障注入演练

### 一键演练脚本（Windows）

在项目根目录执行：

```cmd
deploy\chaos-mesh\run-experiments.bat
```

菜单选择：
- `1` 快速演练（3 个故障：Pod Kill + 网络延迟 + CPU 压力）
- `2` 完整演练（8 个故障全部跑一遍）
- `3` 自定义（选择单个故障注入）

### 手动注入

```bash
# Pod Kill
kubectl apply -f deploy/chaos-mesh/01-pod-kill-currencyservice.yaml

# 网络延迟
kubectl apply -f deploy/chaos-mesh/03-network-delay-productcatalog.yaml

# CPU 压力
kubectl apply -f deploy/chaos-mesh/05-stress-cpu-adservice.yaml
```

### 观察 Agent 反应

Agent 窗口会实时显示：
- Pod Kill → CRITICAL + 自动重启
- 网络延迟 → CRITICAL（健康检查超时）
- CPU 压力 → WARNING（CPU 偏高）
- 实验结束后自动恢复 → HEALTHY

---

## 常见问题

### 无法连接到 Prometheus

```bash
kubectl get svc -n monitoring prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

### 无法连接到 Kubernetes API

```bash
kubectl config current-context
kubectl auth can-i list pods
```

### Windows 编码错误

```cmd
rem 使用 run_monitor.bat 或 run_monitor.py 启动
run_monitor.bat
```

---

## 进阶配置

### 修改巡检间隔

编辑 `online_boutique_monitor.py`，在 `main()` 函数末尾：

```python
monitor.run_monitoring_loop(interval=10)  # 默认 10 秒
```

### 调整严重程度阈值

编辑类常量：

```python
CPU_WARNING = 0.15     # CPU WARNING 阈值（默认 15%）
CPU_CRITICAL = 0.80    # CPU CRITICAL 阈值（默认 80%）
MEMORY_WARNING = 2 * 1024   # 内存 WARNING 阈值（默认 2GB）
MEMORY_CRITICAL = 4 * 1024  # 内存 CRITICAL 阈值（默认 4GB）
POD_RESTART_WARNING = 15    # Pod 重启告警阈值
RECOVERY_COOLDOWN = 60      # 故障恢复冷却时间（秒）
```

---

## 运行单元测试

```bash
python test_agent.py
```

预期输出：
```
Ran 16 tests in 0.003s

OK
```

16 个测试覆盖：
- 初始化 & 服务定义
- Prometheus 查询（成功/失败）
- 诊断：HEALTHY / WARNING / CRITICAL
- 诊断：Pod Pending / 不就绪 / 频繁重启 / 多服务异常
- 自动恢复：CRITICAL 触发 / HEALTHY 不触发 / 冷却期生效

---

## 架构设计

Agent 采用模块化设计，四大组件：

1. **数据采集层** — Prometheus PromQL 查询 + Kubernetes API Pod 状态
2. **诊断分析层** — 7 种异常检测 + 三级严重程度分类
3. **故障恢复层** — 自动 `kubectl rollout restart` + 60 秒冷却
4. **输出层** — 格式化巡检报告输出

---

## 许可证

MIT License
