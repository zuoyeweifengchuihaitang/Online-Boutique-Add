# Online Boutique — 微服务电商实验项目

> 基于 Google 开源微服务 demo，新增评论系统 + 监控 + 故障注入 + 智能运维 Agent，适合微服务实验/演练。

## 项目组成

| 模块 | 说明 |
|------|------|
| **Online Boutique** | 12 个微服务电商应用（含新增 Review 评论服务） |
| **Prometheus + Grafana** | 监控采集与可视化 |
| **VeADK Agent** | 智能运维 Agent — 异常检测、根因分类、故障注入验证、自动故障恢复 |
| **Chaos Mesh** | 故障注入（Pod Kill / 网络 / 压力 / DNS / 组合） |

## VeADK Agent 四大能力

| 能力 | 说明 |
|------|------|
| 🔍 **异常检测** | 7 种异常：Pod 宕机/不就绪/频繁重启、CPU/内存偏高或过高、HTTP 5xx、gRPC 错误率 |
| 🏷️ **根因分类** | 三级严重程度：HEALTHY / WARNING / CRITICAL，自动归类到具体服务和指标 |
| ⚡ **故障注入与验证** | 8 种 Chaos Mesh 故障场景，`run-experiments.bat` 一键演练，10 秒内自动检测 |
| 🩹 **自动故障恢复** | CRITICAL 时自动 `kubectl rollout restart` 重建异常 Deployment，60 秒冷却防抖动 |

## 架构

```
┌──────────────────────────────────────────┐
│   Online Boutique（12 个微服务）          │
│   frontend → cart/product/currency/...   │
│   + reviewservice ⭐（新增评论系统）       │
└────────────┬─────────────────────────────┘
             │
  ┌──────────┼──────────┐
  ▼          ▼          ▼
Prometheus  Grafana   Chaos Mesh
(采集)      (可视化)   (故障注入)
             │
        VeADK Agent
     (智能运维闭环)
```

## 实验前准备

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- 至少 4GB 可用内存 + 2 CPU

---

## 实验一：部署电商应用

### Step 1 — 启动环境

```bash
# 启动 Docker Desktop（GUI），然后：
minikube start
```

验证：
```bash
kubectl get nodes   # 应看到 1 个 Ready 节点
```

### Step 2 — 部署服务

```bash
kubectl apply -f deploy-all.yaml
```

`deploy-all.yaml` 包含全部 12 个服务（含 reviewservice）。

### Step 3 — 构建本地镜像

frontend 和 reviewservice 需要本地构建：

```bash
minikube image build -t reviewservice:local src/reviewservice
minikube image build -t frontend:local src/frontend
```

### Step 4 — 切换为本地镜像

```bash
kubectl set image deployment/frontend server=frontend:local
kubectl set image deployment/reviewservice server=reviewservice:local
kubectl set env deployment/frontend REVIEW_SERVICE_ADDR=reviewservice:8080
```

### Step 5 — 等待就绪

```bash
kubectl get pods -w
```

看到所有 Pod `Running` 后 `Ctrl+C` 退出。

### Step 6 — 访问

```bash
minikube service frontend-external
```

浏览器会自动打开。进入商品详情页，下拉到底即可看到 **Customer Reviews** 评论区。

> **评论功能：**填写昵称、星级、标题、内容 → Submit → 页面自动刷新显示。

---

## 日常使用

后续每次使用时只需：

```
minikube start
kubectl apply -f deploy-all.yaml
minikube service frontend-external
```

## 实验二：部署监控系统

### Step 1 — 部署 Prometheus + Grafana

```bash
kubectl apply -f deploy/kubernetes/manifests-monitoring/
kubectl get pods -n monitoring -w   # 等 Running
```

### Step 2 — 启动端口转发

打开两个终端：

```bash
# 终端 1 — Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# 终端 2 — Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80
```

### Step 3 — 访问

| 面板 | 地址 | 凭证 |
|------|------|------|
| 商城 | http://localhost:8080 | — |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3000 | admin / admin |

### 验证

在 Prometheus 中执行：
```promql
up
```
应看到所有服务的 `up` 指标为 `1`。

---

## 实验三：启动智能运维 Agent

### 一键启动（推荐）

```cmd
cd release\agent
run_monitor.bat
```

或手动启动：

```cmd
cd release\agent
python.exe run_monitor.py
```

Agent 每 10 秒输出一份巡检报告，严重程度分三级：
- 🟢 **HEALTHY** — 正常
- 🟡 **WARNING** — 轻度异常（CPU 偏高 / 内存偏高）
- 🔴 **CRITICAL** — 严重问题（Pod 异常 / Pod 不就绪 / 频繁重启 / CPU 过高 / 内存过高）

当检测到 CRITICAL 时，Agent 会**自动执行故障恢复**：

```
🔬 诊断结论 [严重程度: CRITICAL]:
  ✗ currencyservice Pod 不就绪 (Ready=0/1)

🩹 自动恢复:
  [RESTART] currencyservice
```

同一服务 60 秒内不会重复重启，防止抖动。

---

## 实验四：故障注入

### 一键演练（推荐）

在项目根目录打开 CMD：

```cmd
deploy\chaos-mesh\run-experiments.bat
```

菜单选择：
- `1` 快速演练 — 3 个故障（Pod Kill + 网络延迟 + CPU 压力），约 2 分钟
- `2` 完整演练 — 8 个故障全部跑一遍，约 5 分钟
- `3` 自定义 — 选一个故障注入

### 手动注入

| 故障 | 命令 | Agent 预期反应 |
|------|------|--------------|
| 杀死 currencyservice | `kubectl apply -f deploy/chaos-mesh/01-pod-kill-currencyservice.yaml` | 🔴 CRITICAL + 自动重启 |
| 前端不可用 | `kubectl apply -f deploy/chaos-mesh/02-pod-kill-frontend.yaml` | 🔴 CRITICAL + 自动重启 |
| productcatalog 网络延迟 | `kubectl apply -f deploy/chaos-mesh/03-network-delay-productcatalog.yaml` | 🔴 CRITICAL（健康检查超时） |
| paymentservice 丢包 | `kubectl apply -f deploy/chaos-mesh/04-network-loss-paymentservice.yaml` | 🔴 CRITICAL |
| adservice CPU 压力 | `kubectl apply -f deploy/chaos-mesh/05-stress-cpu-adservice.yaml` | 🟡 WARNING（CPU 偏高） |
| emailservice 内存压力 | `kubectl apply -f deploy/chaos-mesh/06-stress-memory-emailservice.yaml` | 内存升高告警 |
| shippingservice DNS 故障 | `kubectl apply -f deploy/chaos-mesh/07-dns-chaos-shippingservice.yaml` | 🔴 CRITICAL |
| checkoutservice 组合故障 | `kubectl apply -f deploy/chaos-mesh/08-combined-checkoutservice.yaml` | 🔴 CRITICAL |

### 清理

```bash
kubectl delete podchaos,networkchaos,stresschaos,dnschaos -n chaos-testing --all
```

---

## 实验五：运行单元测试

```bash
cd release\agent
python.exe test_agent.py
```

预期输出：16 tests OK。

---

## 实验六：JMeter 压力测试

JMeter 测试脚本位于 `test/jmeter/`，支持多种场景的自动化压测。

### 环境要求

- Apache JMeter 5.6.3+（需配置到 PATH）
- Java 运行环境
- Python 3.10+
- 已部署 Online Boutique，frontend 和 reviewservice 使用本地镜像

### 启动端口转发或隧道

```powershell
# 方式 A：minikube tunnel（推荐，更稳定）
minikube tunnel
```

或

```powershell
# 方式 B：kubectl port-forward
kubectl port-forward deployment/frontend 8080:8080
```

### 运行测试

```powershell
cd test\jmeter
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\run-test.ps1 -Config ./config/smoke.properties -RunId OB-SMOKE-R01 -host 127.0.0.1 -port 80 -SkipEnvironmentCheck
```

### 测试配置说明

| 配置文件 | 场景 | 并发 | 时长 |
|---------|------|:---:|:----:|
| `smoke.properties` | 冒烟测试（基本功能验证） | 1用户 | 60s |
| `negative-review.properties` | 负面测试（评论验证逻辑） | 1用户 | 1s |
| `baseline-10.properties` | 混合购物基准 | 10用户 | 300s |
| `baseline-30.properties` | 混合购物基准 | 30用户 | 300s |
| `baseline-50.properties` | 混合购物基准 | 50用户 | 300s |
| `review-read-30.properties` | 纯读评论压力 | 30用户 | 300s |
| `review-write-10.properties` | 评论写入+验证 | 10用户 | 300s |

### 测试结果

每次运行结果保存在 `test/jmeter/experiments/<RUN_ID>/`，包含：
- `summary.md` / `summary.csv` — 结果摘要
- `jmeter/report/` — HTML 报告
- `events.csv` — 事件时间线

```bash
cd release\agent
python.exe test_agent.py
```

预期输出：16 tests OK。

---

## 常用命令速查

```bash
# 查看所有服务状态
kubectl get pods

# 查看监控组件
kubectl get pods -n monitoring

# 查看 Chaos Mesh 组件
kubectl get pods -n chaos-testing

# 重启某个服务
kubectl rollout restart deployment/frontend

# 查看某服务日志
kubectl logs -f deployment/currencyservice

# 日常重新启动（后续每次使用）
minikube start
kubectl apply -f deploy-all.yaml
minikube service frontend-external
```

---

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `ImagePullBackOff` | 境外镜像拉取失败 | `minikube image build -t <service> src/<service>` 手动构建 |
| 前端 500 错误 | 后端未就绪 | 等待所有 Pod `Running` 后刷新 |
| Grafana 连不上 Prometheus | 端口转发未开 | 确保两个 `port-forward` 都在运行 |
| Chaos 实验未生效 | Chaos Mesh 未安装 | `kubectl get ns chaos-testing` 确认命名空间存在 |
| Agent 打印乱码 | Windows GBK 编码 | 用 `run_monitor.bat` 或 `run_monitor.py` 启动 |
| Agent 始终 HEALTHY | Prometheus 端口转发未开 | 确保 `kubectl port-forward -n monitoring svc/prometheus 9090:9090` 在运行 |

---

## 清理

```bash
minikube stop      # 停止集群
minikube delete     # 完全删除（释放资源）
```

---

## API（Review Service）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/_healthz` | 健康检查 |
| `POST` | `/reviews` | 创建评论 |
| `GET` | `/reviews?product_id={id}` | 按商品查询 |
| `GET` | `/reviews/stats?product_id={id}` | 评分统计 |

---

## 项目结构

```
├── src/                                     # 12 个微服务源码（含 reviewservice）
├── deploy-all.yaml                          # 一键部署所有服务
├── deploy/
│   ├── kubernetes/manifests-monitoring/     # Prometheus + Grafana
│   └── chaos-mesh/                          # 8 个故障场景 + run-experiments.bat
├── release/
│   └── agent/                               # VeADK 智能运维 Agent + run_monitor.bat
├── test/
│   └── jmeter/                               # JMeter 压力测试脚本 + 实验报告
└── README.md
```

---

**版本**: 2.0.0 &nbsp;|&nbsp; **许可证**: Apache 2.0 &nbsp;|&nbsp; **基于** [Google microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo)
