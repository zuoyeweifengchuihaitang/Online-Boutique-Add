#!/bin/bash
# Chaos Mesh 快速启动脚本
# 用于快速注入故障和观察 Agent 反应

set -e

CHAOS_MESH_DIR="./deploy/chaos-mesh"

echo "========== Chaos Mesh 故障注入演练 =========="
echo ""

# 函数：注入故障
inject_fault() {
  local name=$1
  local file=$2
  echo "【故障注入】$name"
  echo "执行: kubectl apply -f $file"
  kubectl apply -f "$file"
  echo ""
}

# 函数：等待并显示进度
wait_and_monitor() {
  local duration=$1
  echo "⏳ 等待 $duration 秒，Agent 正在监控..." 
  for ((i=1; i<=duration; i++)); do
    echo -n "."
    sleep 1
  done
  echo ""
  echo ""
}

# 函数：清理实验
cleanup_experiment() {
  local name=$1
  echo "🧹 清理实验: $name"
  kubectl delete podchaos "$name" -n chaos-testing --ignore-not-found=true
  kubectl delete networkchaos "$name" -n chaos-testing --ignore-not-found=true
  kubectl delete stresschaos "$name" -n chaos-testing --ignore-not-found=true
  kubectl delete dnschaos "$name" -n chaos-testing --ignore-not-found=true
}

echo "选择演练方案:"
echo "1. 快速演练 (3 个简单故障)"
echo "2. 完整演练 (8 个复杂故障)"
echo "3. 自定义演练 (输入故障编号)"
echo ""
read -p "请选择 [1-3]: " choice

case $choice in
  1)
    echo ""
    echo "【演练 1】Pod Kill - currencyservice"
    inject_fault "kill-currencyservice" "$CHAOS_MESH_DIR/01-pod-kill-currencyservice.yaml"
    wait_and_monitor 35
    cleanup_experiment "kill-currencyservice"
    
    echo "【演练 2】Network Delay - productcatalogservice"
    inject_fault "delay-productcatalog" "$CHAOS_MESH_DIR/03-network-delay-productcatalog.yaml"
    wait_and_monitor 35
    cleanup_experiment "delay-productcatalog"
    
    echo "【演练 3】Stress CPU - adservice"
    inject_fault "stress-cpu-adservice" "$CHAOS_MESH_DIR/05-stress-cpu-adservice.yaml"
    wait_and_monitor 35
    cleanup_experiment "stress-cpu-adservice"
    ;;
  2)
    echo ""
    for file in $CHAOS_MESH_DIR/0*.yaml; do
      filename=$(basename "$file")
      name=$(basename "$file" .yaml)
      inject_fault "$filename" "$file"
      wait_and_monitor 35
      cleanup_experiment "${name##*-}"
    done
    ;;
  3)
    echo ""
    echo "可用的故障注入实验:"
    echo "1. 01-pod-kill-currencyservice.yaml"
    echo "2. 02-pod-kill-frontend.yaml"
    echo "3. 03-network-delay-productcatalog.yaml"
    echo "4. 04-network-loss-paymentservice.yaml"
    echo "5. 05-stress-cpu-adservice.yaml"
    echo "6. 06-stress-memory-emailservice.yaml"
    echo "7. 07-dns-chaos-shippingservice.yaml"
    echo "8. 08-combined-checkoutservice.yaml"
    echo ""
    read -p "请输入选择 [1-8]: " exp_choice
    
    declare -a files=(
      "01-pod-kill-currencyservice.yaml"
      "02-pod-kill-frontend.yaml"
      "03-network-delay-productcatalog.yaml"
      "04-network-loss-paymentservice.yaml"
      "05-stress-cpu-adservice.yaml"
      "06-stress-memory-emailservice.yaml"
      "07-dns-chaos-shippingservice.yaml"
      "08-combined-checkoutservice.yaml"
    )
    
    if [[ $exp_choice -ge 1 && $exp_choice -le 8 ]]; then
      file="${files[$((exp_choice-1))]}"
      inject_fault "$file" "$CHAOS_MESH_DIR/$file"
      wait_and_monitor 35
    else
      echo "无效选择"
      exit 1
    fi
    ;;
  *)
    echo "无效选择"
    exit 1
    ;;
esac

echo "========== 演练完成 =========="
echo ""
echo "✅ 所有实验已执行并清理"
echo ""
echo "提示:"
echo "  • 查看 Chaos Mesh Dashboard: http://localhost:2333"
echo "  • 查看 Grafana 仪表盘: http://localhost:3000"
echo "  • 查看 Prometheus 指标: http://localhost:9090"
