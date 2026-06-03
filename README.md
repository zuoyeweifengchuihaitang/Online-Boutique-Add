# Online Boutique — 微服务电商实验项目

> 基于 Google 开源微服务 demo，新增评论系统 + 监控 + 故障注入，适合微服务实验/演练。

## 项目组成

| 模块 | 说明 |
|------|------|
| **Online Boutique** | 12 个微服务电商应用（含新增 Review 评论服务） |
| **Prometheus + Grafana** | 监控采集与可视化 |
| **VeADK Agent** | 智能运维巡检（自动诊断） |
| **Chaos Mesh** | 故障注入（Pod Kill / 网络 / 压力） |

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
# 终端 1
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# 终端 2
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

```bash
cd release/agent
pip install -r requirements.txt
python run_monitor.py
```

Agent 每 15 秒输出一份巡检报告，严重程度分三级：
- 🟢 **HEALTHY** — 正常
- 🟡 **WARNING** — 轻度异常
- 🔴 **CRITICAL** — 严重问题

---

## 实验四：故障注入

### 场景速查

| 故障 | 命令 | 观察点 |
|------|------|--------|
| 杀死 currencyservice Pod | `kubectl apply -f deploy/chaos-mesh/01-pod-kill-currencyservice.yaml` | Pod 自动重建、Agent 告警、Grafana 指标波动 |
| 前端不可用 | `kubectl apply -f deploy/chaos-mesh/02-pod-kill-frontend.yaml` | 页面 503、kubectl get pods 看重启 |
| productcatalog 网络延迟 | `kubectl apply -f deploy/chaos-mesh/03-network-delay-productcatalog.yaml` | 商品加载变慢、Prometheus 延迟上升 |
| paymentservice 丢包 | `kubectl apply -f deploy/chaos-mesh/04-network-loss-paymentservice.yaml` | 支付超时 |

### 查看实验中

```bash
kubectl get podchaos,networkchaos,stresschaos -n chaos-testing
```

### 清理

```bash
kubectl delete podchaos kill-currencyservice -n chaos-testing
# 或一键清空所有实验：
kubectl delete all -n chaos-testing --all
```

---

## 常用命令速查

```bash
# 查看所有服务状态
kubectl get pods

# 查看监控组件
kubectl get pods -n monitoring

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
├── src/                           # 12 个微服务源码（含 reviewservice）
├── deploy-all.yaml                # 一键部署所有服务
├── deploy/
│   ├── kubernetes/manifests-monitoring/   # Prometheus + Grafana
│   └── chaos-mesh/                        # 8 个故障场景
├── release/
│   └── agent/                     # VeADK 智能运维 Agent
└── README.md
```

---

**版本**: 1.1.0 &nbsp;|&nbsp; **许可证**: Apache 2.0 &nbsp;|&nbsp; **基于** [Google microservices-demo](https://github.com/GoogleCloudPlatform/microservices-demo)
