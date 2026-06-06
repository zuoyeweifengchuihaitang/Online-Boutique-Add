# Chaos Mesh 故障注入快速开始指南

## 📌 概述

本指南介绍如何在 Online Boutique 微服务系统中使用 Chaos Mesh 进行故障注入实验，配合 VeADK Agent 进行智能监控和诊断。

**演练流程**：
1. ✅ **监控基础设施** - Prometheus + Grafana（已完成）
2. ✅ **智能 Agent** - VeADK Agent 监控（已完成）
3. ✅ **Chaos Mesh 配置** - 8 个故障场景定义（已完成）
4. 🚀 **实战演练** - 运行实验并观察 Agent 反应（现在开始）

---

## 🎯 4 步快速开始

### 第1步：在终端1启动 Prometheus 访问（可选）
```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# 访问: http://localhost:9090
```
### 第2步：在终端2启动 Grafana 访问（可选）
```bash
kubectl port-forward -n monitoring svc/grafana 3000:80
# 访问: http://localhost:3000 (admin/admin)
```
### 第3步：在终端3启动监控 Agent
```bash
cd ./release/agent
python run_monitor.py
```

输出示例：
```
[10:30:45] 系统健康检查 (第 1 轮)
===========================
✓ frontend           : HEALTHY
✓ cartservice        : HEALTHY
✓ productcatalogservice : HEALTHY
✓ adservice          : HEALTHY
```

### 第4步：在终端4注入故障

**方式 A：单个简单故障注入**
```bash
# 终止 currencyservice Pod
kubectl apply -f ./deploy/chaos-mesh/01-pod-kill-currencyservice.yaml

# 观察 Agent 输出 → 应在 15 秒内标记为 CRITICAL
# 等待 30 秒后实验结束，Pod 自动恢复

# 清理
kubectl delete podchaos kill-currencyservice -n chaos-testing
```

**方式 B：网络故障注入**
```bash
# 为 productcatalogservice 添加 500ms 延迟
kubectl apply -f ./deploy/chaos-mesh/03-network-delay-productcatalog.yaml

# 观察 Agent 输出 → 可能标记为 WARNING（高延迟）
# 检查 Prometheus 中的 HTTP 响应时间指标

# 清理
kubectl delete networkchaos delay-productcatalog -n chaos-testing
```

**方式 C：资源压力注入**
```bash
# 为 adservice 添加 CPU 负载压力
kubectl apply -f ./deploy/chaos-mesh/05-stress-cpu-adservice.yaml

# 观察 Agent 输出 → CPU 使用率应该上升
# 检查 Prometheus 中的 CPU 使用率指标

# 清理
kubectl delete stresschaos stress-cpu-adservice -n chaos-testing
```

---

## 📋 完整实验清单

| 编号 | 实验名称 | 故障类型 | 目标服务 | 配置文件 | 预期效果 |
|------|--------|--------|--------|--------|--------|
| 1 | Pod 宕机 | Pod Kill | currencyservice | `01-pod-kill-*.yaml` | Pod 被删除→自动恢复 |
| 2 | Pod 宕机 | Pod Kill | frontend | `02-pod-kill-*.yaml` | Pod 被删除→自动恢复 |
| 3 | 网络延迟 | Network Delay | productcatalog | `03-network-delay-*.yaml` | 添加 500ms 延迟 |
| 4 | 网络丢包 | Network Loss | paymentservice | `04-network-loss-*.yaml` | 模拟 10% 丢包 |
| 5 | CPU 压力 | Stress | adservice | `05-stress-cpu-*.yaml` | CPU 占用 80% |
| 6 | 内存压力 | Stress | emailservice | `06-stress-memory-*.yaml` | 内存占用 256MB |
| 7 | DNS 失败 | DNS Chaos | shippingservice | `07-dns-chaos-*.yaml` | DNS 解析失败 |
| 8 | 组合故障 | 多故障 | checkoutservice | `08-combined-*.yaml` | 延迟 + 丢包 |

---

## 🔍 Agent 检测效果验证

### 预期检测结果

当注入故障时，Agent 应在 15 秒内检测到并输出：

**Pod Kill 故障（高可信度）：**
```
[✗ CRITICAL] currencyservice
  └─ Pod 不就绪 (Ready=0/1)
  └─ 建议: 检查 Pod 事件、日志和依赖服务
```

**网络故障（中等可信度）：**
```
[⚠ WARNING] productcatalogservice
  └─ 高网络延迟 (200+ ms)
  └─ 建议: 检查网络配置、网络策略和 MTU 设置
```

**资源压力（低~中等可信度）：**
```
[⚠ WARNING] adservice
  └─ CPU 使用率高 (>50%)
  └─ 建议: 检查资源限制、优化代码或扩容
```

---

## 📊 监控面板

### Prometheus 查询示例

```promql
# Pod 重启次数
kube_pod_container_status_restarts_total{pod=~"currencyservice.*"}

# HTTP 错误率
rate(http_requests_total{status_code=~"5.."}[5m])

# 网络延迟（如果配置了）
histogram_quantile(0.95, container_network_transmit_bytes)

# CPU 使用率
rate(container_cpu_usage_seconds_total[5m])
```

### Grafana 仪表盘

访问 http://localhost:3000，查看 Prometheus 数据源配置的仪表盘。

---

## 🛠️ 高级用法

### 1. 使用 Chaos Mesh Dashboard UI

```bash
# 启动 Dashboard
kubectl port-forward -n chaos-testing svc/chaos-dashboard 2333:2333

# 浏览器访问
# http://localhost:2333
```

在 Dashboard 中可以：
- 点击 "Experiments" 查看所有实验
- 查看实验执行历史和日志
- 创建新实验（无需编写 YAML）
- 实时监控实验进度

### 2. 自定义故障实验

编辑 `./deploy/chaos-mesh/*.yaml`，修改：
- `duration`: 实验持续时间（默认 30s）
- `duration` 改为 `duration: 60s` 延长到 60 秒
- `selector.labelSelectors` 改为其他服务

### 3. 并发多个故障

同时创建多个 Chaos 资源：
```bash
kubectl apply -f ./deploy/chaos-mesh/01-pod-kill-currencyservice.yaml
kubectl apply -f ./deploy/chaos-mesh/05-stress-cpu-adservice.yaml

# 观察 Agent 如何处理多个并发故障
```

### 4. 连续演练（高级）

使用脚本 `./deploy/chaos-mesh/run-experiments.sh`：
```bash
chmod +x ./deploy/chaos-mesh/run-experiments.sh
./deploy/chaos-mesh/run-experiments.sh
# 选择 1(快速), 2(完整) 或 3(自定义)
```

---

## 🐛 故障排查

### 问题 1：Pod 被删除但没有恢复

**原因**：Deployment 的副本数可能设置为 0

**解决**：
```bash
# 检查 deployment 状态
kubectl get deployment -n default | grep currencyservice

# 调整副本数为 1
kubectl scale deployment currencyservice --replicas=1 -n default
```

### 问题 2：Chaos 资源一直处于 Pending 状态

**原因**：Chaos Mesh 控制器没有正常工作

**解决**：
```bash
# 检查控制器 Pod
kubectl get pods -n chaos-testing

# 查看日志
kubectl logs -n chaos-testing -l app.kubernetes.io/component=controller
```

### 问题 3：Agent 没有检测到故障

**原因**：检测阈值过高或 Prometheus 查询出错

**解决**：
```bash
# 1. 查看 Agent 日志中的详细信息
python -c "import logging; logging.basicConfig(level=logging.DEBUG)"

# 2. 手动查询 Prometheus
curl http://localhost:9090/api/v1/query?query=kube_pod_status_phase

# 3. 调整 Agent 中的严重程度阈值
# 编辑 ./release/agent/online_boutique_monitor.py
# 查看 analyze() 函数中的阈值常数
```

---

## 📝 演练笔记

记录你的观察结果：

```markdown
【演练日期】2024-XX-XX

【实验 1】Pod Kill - currencyservice
- 故障注入时刻：10:30:45
- Agent 检测时刻：10:31:00
- 检测延迟：15 秒
- 严重程度判定：CRITICAL ✓
- Agent 诊断准确率：100% ✓

【实验 2】Network Delay - productcatalog
- 故障注入时刻：10:35:20
- Agent 检测时刻：10:35:35
- 检测延迟：15 秒
- 严重程度判定：WARNING ✓
- Agent 诊断准确率：80% (延迟检测正确，但未识别网络故障)

【结论】
- Agent 对 Pod 级别故障的检测很敏感（100% 准确率）
- Agent 对网络级别故障的检测需要优化（可能需要额外的网络指标）
- 建议下一步：集成网络 metrics 和应用级 metrics 进行联合判断
```

---

## 📚 相关文档

- **Agent 文档**: `./release/agent/README.md`
- **Chaos Mesh 文档**: `./deploy/chaos-mesh/README.md`
- **监控文档**: `./deploy/kubernetes/manifests-monitoring/README.md`（如果有）
- **完整教程**: `./使用智能体进行智能运维-OnlineBoutique版.md`

---

## ✅ 演练检查清单

- [ ] Prometheus 已启动并可访问
- [ ] Grafana 已启动并可访问（admin/admin）
- [ ] Agent 已启动并正常输出监控日志
- [ ] Chaos Mesh 已安装（`kubectl get ns chaos-testing`）
- [ ] 第一个故障实验已成功注入
- [ ] Agent 成功检测到故障
- [ ] 故障实验已清理
- [ ] 至少尝试了 3 种不同类型的故障
- [ ] 记录了 Agent 的检测准确率
- [ ] 了解了如何使用 Chaos Mesh Dashboard

---

祝你演练顺利！🎉

有任何问题，请查阅各模块的详细文档。
