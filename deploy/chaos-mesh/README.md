# Chaos Mesh 故障注入实验

使用 Chaos Mesh 对 Online Boutique 微服务进行受控故障注入，验证系统的容错能力和 Agent 的监控检测效果。

## 快速开始

### 1. 查看 Chaos Mesh Dashboard

```bash
# 启动端口转发
kubectl port-forward -n chaos-testing svc/chaos-dashboard 2333:2333

# 浏览器打开
http://localhost:2333
```

### 2. 运行故障注入实验

#### 方式 A: 通过 kubectl 命令行

```bash
# 注入故障 - Pod Kill (删除 currencyservice)
kubectl apply -f ./deploy/chaos-mesh/01-pod-kill-currencyservice.yaml

# 检查实验状态
kubectl get podchaos -n chaos-testing

# 查看实验详情
kubectl describe podchaos kill-currencyservice -n chaos-testing

# 删除实验
kubectl delete podchaos kill-currencyservice -n chaos-testing
```

#### 方式 B: 通过 Chaos Mesh Dashboard UI

1. 打开 http://localhost:2333
2. 点击左侧 **Experiments**
3. 点击 **New Experiment**
4. 选择实验类型和目标命名空间
5. 配置实验参数
6. 点击 **Submit** 执行

## 实验配置说明

| 文件 | 实验名称 | 故障类型 | 目标服务 | 持续时间 |
|------|---------|---------|--------|--------|
| 01-pod-kill-currencyservice.yaml | kill-currencyservice | Pod Kill | currencyservice | 30s |
| 02-pod-kill-frontend.yaml | kill-frontend | Pod Kill | frontend | 30s |
| 03-network-delay-productcatalog.yaml | delay-productcatalog | 网络延迟(500ms) | productcatalogservice | 30s |
| 04-network-loss-paymentservice.yaml | loss-paymentservice | 网络丢包(10%) | paymentservice | 30s |
| 05-stress-cpu-adservice.yaml | stress-cpu-adservice | CPU 压力(80%) | adservice | 30s |
| 06-stress-memory-emailservice.yaml | stress-memory-emailservice | 内存压力(256M) | emailservice | 30s |
| 07-dns-chaos-shippingservice.yaml | dns-failure-shippingservice | DNS 故障 | shippingservice | 30s |
| 08-combined-checkoutservice.yaml | combined-checkoutservice | 网络延迟+丢包 | checkoutservice | 30s |

## 故障类型详解

### 1. Pod Kill - 删除 Pod
模拟服务宕机，验证系统的自恢复能力。
```yaml
kind: PodChaos
spec:
  action: pod-kill          # 删除 Pod
  mode: all                 # 影响所有匹配的 Pod
  duration: 30s             # 持续 30 秒
```

### 2. Network Delay - 网络延迟
模拟网络慢，测试系统对高延迟的容忍度。
```yaml
kind: NetworkChaos
spec:
  action: delay
  delay:
    latency: "500ms"        # 添加 500ms 延迟
    jitter: "100ms"         # 抖动 ±100ms
```

### 3. Network Loss - 网络丢包
模拟网络不稳定，导致部分请求失败。
```yaml
kind: NetworkChaos
spec:
  action: loss
  loss:
    loss: "10%"             # 丢弃 10% 的包
```

### 4. Stress CPU - CPU 压力
模拟 CPU 高负载，验证系统的扩展性。
```yaml
kind: StressChaos
spec:
  action: stress
  stressors:
    cpu:
      workers: 2            # 2 个 CPU 压力线程
      load: 80              # 80% 负载
```

### 5. Stress Memory - 内存压力
模拟内存泄漏或高内存占用。
```yaml
kind: StressChaos
spec:
  action: stress
  stressors:
    memory:
      workers: 1
      size: "256M"          # 分配 256MB 内存
```

### 6. DNS Chaos - DNS 故障
模拟 DNS 解析失败，测试服务发现的容错。
```yaml
kind: DNSChaos
spec:
  action: error             # DNS 返回错误
  patterns:
    - "*.default.svc.cluster.local"  # 匹配的 DNS 模式
```

## 与 Agent 联动监控

### 同时开启 Agent 和 Chaos Mesh 实验

```bash
# 终端 1: 启动 Agent 监控
cd ./release/agent
python run_monitor.py

# 终端 2: 运行 Chaos Mesh 实验
kubectl apply -f ./deploy/chaos-mesh/01-pod-kill-currencyservice.yaml

# 观察 Agent 在故障注入时的反应
```

### 预期结果

当故障注入时，Agent 会在下一次巡检（15 秒内）检测到：

```
🔴 诊断结论 [严重程度: CRITICAL]:
  🔴 发现 1 个问题
    - ⏳ 容器 server 未就绪
    - ❌ Pod xxx 状态: Pending
```

## 高级用法

### 1. 同时运行多个实验

```bash
# 并发注入多个故障
kubectl apply -f ./deploy/chaos-mesh/03-network-delay-productcatalog.yaml
kubectl apply -f ./deploy/chaos-mesh/04-network-loss-paymentservice.yaml
kubectl apply -f ./deploy/chaos-mesh/05-stress-cpu-adservice.yaml
```

### 2. 定时运行实验（Cron 调度）

编辑 YAML，添加 `scheduler.cron` 字段：

```yaml
spec:
  scheduler:
    cron: "0 * * * *"       # 每小时执行一次
```

### 3. 自定义实验参数

复制现有 YAML 并修改：

```bash
cp ./deploy/chaos-mesh/01-pod-kill-currencyservice.yaml my-custom-experiment.yaml
# 编辑 my-custom-experiment.yaml
kubectl apply -f my-custom-experiment.yaml
```

## 常见问题

### Q: 实验创建后没有生效？

检查 Pod 选择器是否正确：

```bash
# 查看匹配的 Pod
kubectl get pods -l app=currencyservice
```

### Q: 如何停止正在运行的实验？

```bash
# 删除实验资源
kubectl delete podchaos kill-currencyservice -n chaos-testing
```

### Q: 如何查看实验执行的日志？

```bash
# 查看 Chaos Mesh Controller 日志
kubectl logs -n chaos-testing deployment/chaos-controller-manager -f
```

### Q: 能否同时测试多个故障？

可以。创建多个实验 YAML 文件并应用它们：

```bash
kubectl apply -f ./deploy/chaos-mesh/*.yaml
```

## 相关资源

- [Chaos Mesh 官方文档](https://chaos-mesh.org/docs/)
- [Online Boutique 项目](https://github.com/GoogleCloudPlatform/microservices-demo)
- [Agent 使用指南](../../release/agent/README.md)

## 下一步

1. **收集指标** — 在故障期间使用 Prometheus 采集性能数据
2. **分析影响** — 在 Grafana 中可视化故障对系统的影响
3. **优化容错** — 根据测试结果改进系统的容错设计
4. **自动化测试** — 集成到 CI/CD 流程中进行定期的混沌测试
