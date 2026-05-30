# Online Boutique — 微服务电商演示项目

Open sourced by Google. 这是一个基于微服务架构的电商演示应用，用户可以在其中浏览商品、添加购物车并购买。

本项目在原版 12 个微服务基础上，额外新增了 **评价/评论系统（Review Service）**，允许用户对商品进行打分和评论。

## 架构

**Online Boutique** 由 12 个微服务组成，通过 gRPC 和 HTTP 相互通信。

![架构图](/docs/img/architecture-diagram.png)

| 服务 | 语言 | 描述 |
|------|------|------|
| [frontend](/src/frontend) | Go | Web 前端，无需注册/登录 |
| [cartservice](/src/cartservice) | C# | 购物车服务（Redis） |
| [productcatalogservice](/src/productcatalogservice) | Go | 商品目录 |
| [currencyservice](/src/currencyservice) | Node.js | 货币转换 |
| [paymentservice](/src/paymentservice) | Node.js | 支付（模拟） |
| [shippingservice](/src/shippingservice) | Go | 运费估算（模拟） |
| [emailservice](/src/emailservice) | Python | 邮件通知（模拟） |
| [checkoutservice](/src/checkoutservice) | Go | 结账服务 |
| [recommendationservice](/src/recommendationservice) | Python | 商品推荐 |
| [adservice](/src/adservice) | Java | 广告服务 |
| [loadgenerator](/src/loadgenerator) | Python | 压力测试 |
| **[reviewservice](/src/reviewservice)** ⭐新增 | **Go** | **商品评价/评论系统** |

### 新增：Review Service（评价系统）

- **技术栈**：Go + Gorilla Mux + SQLite（纯 Go 驱动，无需 CGO）
- **通信方式**：HTTP REST，前端直接调用
- **提供功能**：
  - 创建评论（含星级评分 1-5★）
  - 按商品查看评论列表
  - 评论统计（平均分 + 评论数）

## 截图

| 首页 | 商品详情 + 评论区 |
|---|---|
| ![首页](/docs/img/online-boutique-frontend-1.png) | 进入商品详情页，下拉即可看到评论区 |

---

## 快速部署（本地 Minikube，推荐）

适合中国大陆用户，不需要访问 Google Cloud 或其他境外镜像仓库。

### 环境要求

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### 部署步骤

#### 1. 启动 Docker Desktop

打开 Docker Desktop 并确保右下角图标显示为运行状态。

#### 2. 启动 Minikube

```bash
minikube start
```

#### 3. 构建自定义镜像

由于 `frontend` 和 `reviewservice` 是我们新增/修改的服务，需要本地构建：

```bash
# 构建评论服务
minikube image build -t reviewservice:local src/reviewservice

# 构建前端
minikube image build -t frontend:local src/frontend
```

#### 4. 部署所有服务

```bash
kubectl apply -f deploy-all.yaml
```

#### 5. 更新镜像为本地版本

```bash
kubectl set image deployment/frontend server=frontend:local
kubectl set image deployment/reviewservice server=reviewservice:local
kubectl set env deployment/frontend REVIEW_SERVICE_ADDR=reviewservice:8080
```

#### 6. 等待所有 Pod 启动

```bash
kubectl get pods -w
```

等待所有 Pod 的 `STATUS` 显示为 `Running`（按 `Ctrl+C` 退出监控）。

#### 7. 打开浏览器访问

```bash
minikube service frontend-external
```

---

## 日常使用

后续每次使用时只需：

```bash
minikube start
kubectl apply -f deploy-all.yaml
minikube service frontend-external
```

---

## 常见问题

### 镜像拉取失败（ImagePullBackOff）

如果某些服务镜像拉取失败（特别是 `us-central1-docker.pkg.dev` 的镜像），可按以下步骤手动构建：

```bash
# 查看哪些服务失败
kubectl get pods

# 对失败的服务，逐个手动构建
# Go 服务
minikube image build -t productcatalogservice src/productcatalogservice
minikube image build -t shippingservice src/shippingservice
minikube image build -t checkoutservice src/checkoutservice

# 然后更新 deployment 使用本地镜像
kubectl set image deployment/productcatalogservice server=productcatalogservice
```

### Node.js 服务镜像拉取失败

Node.js 服务（currencyservice、paymentservice）如果拉取失败，尝试配置 Docker 代理后再拉取：

```bash
docker pull --platform linux us-central1-docker.pkg.dev/google-samples/microservices-demo/currencyservice:v0.10.2
docker pull --platform linux us-central1-docker.pkg.dev/google-samples/microservices-demo/paymentservice:v0.10.2
minikube image load us-central1-docker.pkg.dev/google-samples/microservices-demo/currencyservice:v0.10.2
minikube image load us-central1-docker.pkg.dev/google-samples/microservices-demo/paymentservice:v0.10.2
```

### 前端页面报 500 Internal Server Error

原因是某些后端服务还未完全启动，等 `kubectl get pods` 中所有服务都变为 `Running` 后再刷新页面。

---

## 使用评论功能

1. 在首页点击任意商品
2. 下拉到页面底部的 **Customer Reviews** 区域
3. 填写昵称、评分、标题和内容
4. 点击 **Submit Review** 提交
5. 提交成功后页面自动刷新，显示新评论和评分统计

---

## API 参考（Review Service）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/_healthz` | 健康检查 |
| `POST` | `/reviews` | 创建评论 |
| `GET` | `/reviews?product_id={id}` | 查询商品评论 |
| `GET` | `/reviews/{id}` | 查询单条评论 |
| `DELETE` | `/reviews/{id}` | 删除评论 |
| `GET` | `/reviews/stats?product_id={id}` | 获取评论统计 |
