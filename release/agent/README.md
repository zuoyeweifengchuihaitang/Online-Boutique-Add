# Online Boutique 微服务智能运维 Agent

## 功能概述

VeADK (Versatile Autonomous Diagnosis & Knowledge) Agent 是一个自主诊断与运维系统，能够：

- **实时监控** 12 个微服务的健康状态和性能指标
- **自动诊断** 故障根因，分类告警严重程度
- **性能分析** CPU、内存、错误率、Pod 重启次数等关键指标
- **零接触干预** 无需人工干预即可持续巡检和分析

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动 Agent

确保 Kubernetes 集群和 Prometheus 已正常运行，然后：

```bash
python run_monitor.py
```

或直接运行：

```bash
python online_boutique_monitor.py
```

### 3. 预期输出

Agent 会每 15 秒进行一次巡检，输出示例：

```
[第 1 次巡检] 开始采集数据...
[数据采集] 正在从 Prometheus 查询指标...
[状态检查] 正在检查 Pod 健康状态...

[2024-01-15 10:30:45] 系统巡检报告
----------------------------------------------------------------------

📊 性能指标:
  CPU 使用率:        0.2450
  内存使用量:        1250.5 MB
  HTTP 5xx 错误率:   0.0001
  gRPC 错误率:       0.0000
  运行中的 Pod 数:   12

🔍 Pod 状态检查:
  所有 Pod 运行正常

🔬 诊断结论 [严重程度: HEALTHY]:
  ✅ 系统运行正常

======================================================================
```

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

## 严重程度分类

### HEALTHY（健康）
- 所有指标正常，系统运行良好
- CPU 使用率 < 50%，内存占用 < 2GB
- HTTP/gRPC 错误率 < 0.5%

### WARNING（警告）
- 检测到轻度异常，需要关注
- CPU 使用率 50-80%，内存占用 2-4GB
- HTTP/gRPC 错误率 0.5%-1%

### CRITICAL（严重）
- 系统存在严重问题，需要立即处理
- CPU 使用率 > 80%，内存占用 > 4GB
- HTTP/gRPC 错误率 > 1%
- Pod 状态异常（重启过频、不就绪等）

## 监控指标详解

### CPU 使用率
```
avg(rate(container_cpu_usage_seconds_total[5m]))
```
计算 5 分钟内平均 CPU 使用率

### 内存使用量
```
avg(container_memory_usage_bytes) / 1024 / 1024
```
当前内存占用，单位 MB

### HTTP 5xx 错误率
```
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
```
HTTP 服务器错误速率

### gRPC 错误率
```
sum(rate(grpc_server_handled_total{grpc_code!="OK"}[5m]))
```
gRPC 非正常状态码速率

### Pod 状态
- 检查每个 Pod 的运行阶段（Running/Pending/Failed 等）
- 监控容器就绪状态
- 统计容器重启次数

## 故障注入演练

### 1. 手动删除 Pod
```bash
# 模拟 currencyservice 宕机
kubectl delete pod -l app=currencyservice

# 监控 Agent 反应：
# - 首次巡检：检测到 Pod 不在
# - 持续监控：观察 Pod 恢复过程
# - 恢复后：验证指标恢复正常
```

### 2. 模拟 CPU 压力
```bash
# 使用 stress 工具模拟 CPU 压力
kubectl exec deployment/productcatalogservice -- stress --cpu 2 --timeout 60s

# Agent 会检测到 CPU 使用率飙升，输出 CRITICAL
```

### 3. 使用 Chaos Mesh 注入故障
详见 `CHAOS_MESH_QUICK_START.md`

## 修复常见问题

### 问题：无法连接到 Prometheus
```
[查询失败] Prometheus 查询错误: Connection error
```

**解决方案：**
```bash
# 检查 Prometheus 服务是否运行
kubectl get svc -n monitoring | grep prometheus

# 端口转发（如果需要）
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

### 问题：无法连接到 Kubernetes API
```
[Pod 检查] 获取 Pod 状态失败: Connection error
```

**解决方案：**
```bash
# 验证 kubectl 配置
kubectl config current-context

# 确认凭证有效
kubectl auth can-i list pods
```

### 问题：Python 编码错误（Windows）
```
UnicodeEncodeError: 'gbk' codec can't encode character
```

**解决方案：** 使用 `run_monitor.py` 而不是直接运行 Python 脚本

## 进阶配置

### 修改巡检间隔

编辑 `online_boutique_monitor.py`，在 `main()` 函数中修改：

```python
monitor.run_monitoring_loop(interval=30)  # 改为 30 秒
```

### 调整严重程度阈值

编辑类常量：

```python
CPU_WARNING = 0.60    # 改为 60%
CPU_CRITICAL = 0.90   # 改为 90%
MEMORY_WARNING = 3 * 1024  # 改为 3GB
```

### 运行限定次数的巡检

```python
monitor.run_monitoring_loop(interval=15, max_iterations=10)  # 只巡检 10 次
```

## 运行单元测试

```bash
python test_agent.py
```

预期输出：
```
test_generation_cpu_warning ... ok
test_generation_healthy ... ok
test_initialization ... ok
test_query_prometheus_error ... ok
test_query_prometheus_success ... ok
test_services_definition ... ok
test_severity_thresholds ... ok

Ran 12 tests in 0.234s
OK
```

## 架构设计

Agent 采用模块化设计，主要组件包括：

1. **数据采集层** - 从 Prometheus 和 Kubernetes API 采集数据
2. **分析层** - 诊断故障并分类严重程度
3. **输出层** - 格式化报告输出

## 贡献指南

提交改进建议或新功能时，请：

1. 确保所有单元测试通过
2. 遵循 PEP 8 代码风格
3. 添加必要的文档注释

## 许可证

MIT License
