#!/usr/bin/env python3
"""
Online Boutique 微服务智能运维 Agent
VeADK (Versatile Autonomous Diagnosis & Knowledge) 框架实现

功能：
- 实时监控 12 个微服务的健康状态
- 从 Prometheus 采集性能指标
- 自动诊断故障根因
- 分类告警严重程度 (HEALTHY/WARNING/CRITICAL)
- 提供修复建议

使用方法：
    python online_boutique_monitor.py

或通过 run_monitor.py 启动。
"""

import requests
import json
import subprocess
import sys
import time
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from dataclasses import dataclass


@dataclass
class ServiceInfo:
    """微服务信息数据类"""
    name: str
    language: str
    protocol: str
    
    
class OnlineBoutiqueMonitor:
    """Online Boutique 微服务监控和诊断 Agent"""
    
    # 定义监控的 12 个微服务
    SERVICES = {
        'frontend': ServiceInfo('frontend', 'Go', 'HTTP'),
        'productcatalogservice': ServiceInfo('productcatalogservice', 'Go', 'gRPC'),
        'cartservice': ServiceInfo('cartservice', 'C#', 'gRPC'),
        'currencyservice': ServiceInfo('currencyservice', 'Node.js', 'gRPC'),
        'paymentservice': ServiceInfo('paymentservice', 'Node.js', 'gRPC'),
        'shippingservice': ServiceInfo('shippingservice', 'Go', 'gRPC'),
        'checkoutservice': ServiceInfo('checkoutservice', 'Go', 'gRPC'),
        'emailservice': ServiceInfo('emailservice', 'Python', 'gRPC'),
        'recommendationservice': ServiceInfo('recommendationservice', 'Python', 'gRPC'),
        'adservice': ServiceInfo('adservice', 'Java', 'gRPC'),
        'reviewservice': ServiceInfo('reviewservice', 'Go (新增)', 'HTTP REST'),
        'loadgenerator': ServiceInfo('loadgenerator', 'Python', 'HTTP'),
    }
    
    # 严重程度阈值
    CPU_WARNING = 0.15
    CPU_CRITICAL = 0.80
    MEMORY_WARNING = 2 * 1024  # 2GB in MB
    MEMORY_CRITICAL = 4 * 1024  # 4GB in MB
    ERROR_RATE_WARNING = 0.005  # 0.5%
    ERROR_RATE_CRITICAL = 0.01  # 1%
    POD_RESTART_WARNING = 15
    RECOVERY_COOLDOWN = 60  # 同一服务最短恢复间隔（秒）
    
    def __init__(self, prometheus_url: str = "http://localhost:9090"):
        """
        初始化 Agent
        
        Args:
            prometheus_url: Prometheus 服务器地址
        """
        self.prometheus_url = prometheus_url
        self.iteration = 0
        self._last_recovery = {}  # {service_name: timestamp}
        
    def query_prometheus(self, query: str) -> Tuple[str, List[Dict[str, str]]]:
        """
        查询 Prometheus 指标
        
        Args:
            query: PromQL 查询语句
            
        Returns:
            (status, results) - 状态和查询结果
        """
        try:
            url = f"{self.prometheus_url}/api/v1/query"
            params = {'query': query}
            response = requests.get(url, params=params, timeout=5)
            data = response.json()
            
            if data['status'] == 'success':
                return 'success', data['data']['result']
            else:
                return 'error', []
        except Exception as e:
            print(f"[查询失败] Prometheus 查询错误: {str(e)}")
            return 'error', []
    
    def check_pod_status(self) -> Dict[str, Dict]:
        """
        检查所有 Pod 的运行状态
        
        Returns:
            Pod 状态字典 {service_name: {status_info}}
        """
        pod_status = {}
        
        try:
            # 获取所有 Pod 信息
            cmd = [
                'kubectl', 'get', 'pods',
                '-o', 'json',
                '--namespace', 'default'
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            pods_data = json.loads(result.stdout)
            
            # 按服务分类 Pod
            for pod in pods_data.get('items', []):
                pod_name = pod['metadata']['name']
                labels = pod['metadata'].get('labels', {})
                app = labels.get('app', 'unknown')
                
                if app in self.SERVICES:
                    phase = pod['status'].get('phase', 'Unknown')
                    containers = pod['status'].get('containerStatuses', [])
                    
                    # 检查容器状态
                    ready_count = sum(1 for c in containers if c.get('ready', False))
                    total_containers = len(containers)
                    restarts = sum(c['restartCount'] for c in containers)
                    
                    pod_status[app] = {
                        'pod_name': pod_name,
                        'phase': phase,
                        'ready': f"{ready_count}/{total_containers}",
                        'restarts': restarts,
                        'containers': containers
                    }
        except Exception as e:
            print(f"[Pod 检查] 获取 Pod 状态失败: {str(e)}")
        
        return pod_status
    
    def _generate_diagnosis(self, service: str, metrics: Dict, pod_status: Dict[str, Dict]) -> Tuple[str, str]:
        """
        生成诊断结论和建议
        
        Args:
            service: 服务名称
            metrics: 指标数据
            pod_status: 所有 Pod 状态字典 {service_name: {status_info}}
            
        Returns:
            (severity, diagnosis) - 严重程度和诊断信息
        """
        issues = []
        has_pod_issue = False
        
        # 检查所有 Pod 状态
        for svc, info in pod_status.items():
            if info['phase'] != 'Running':
                issues.append(f"{svc} Pod 状态异常: {info['phase']}")
                has_pod_issue = True
            
            ready_parts = info['ready'].split('/')
            if ready_parts[0] != ready_parts[1]:
                issues.append(f"{svc} Pod 不就绪 (Ready={info['ready']})")
                has_pod_issue = True
            
            if info['restarts'] > self.POD_RESTART_WARNING:
                issues.append(f"{svc} 容器频繁重启 (重启次数={info['restarts']})")
                has_pod_issue = True
        
        # 检查 CPU
        cpu = metrics.get('cpu', 0)
        if cpu > self.CPU_CRITICAL:
            issues.append(f"CPU 使用率过高 ({cpu*100:.1f}%)")
        elif cpu > self.CPU_WARNING:
            issues.append(f"CPU 使用率偏高 ({cpu*100:.1f}%)")
        
        # 检查内存
        memory = metrics.get('memory', 0)
        if memory > self.MEMORY_CRITICAL:
            issues.append(f"内存占用过高 ({memory:.0f}MB)")
        elif memory > self.MEMORY_WARNING:
            issues.append(f"内存占用偏高 ({memory:.0f}MB)")
        
        # 检查 HTTP 错误率
        http_error_rate = metrics.get('http_error_rate', 0)
        if http_error_rate > self.ERROR_RATE_CRITICAL:
            issues.append(f"HTTP 错误率高 ({http_error_rate*100:.2f}%)")
        elif http_error_rate > self.ERROR_RATE_WARNING:
            issues.append(f"HTTP 错误率偏高 ({http_error_rate*100:.2f}%)")
        
        # 检查 gRPC 错误率
        grpc_error_rate = metrics.get('grpc_error_rate', 0)
        if grpc_error_rate > self.ERROR_RATE_CRITICAL:
            issues.append(f"gRPC 错误率高 ({grpc_error_rate*100:.2f}%)")
        elif grpc_error_rate > self.ERROR_RATE_WARNING:
            issues.append(f"gRPC 错误率偏高 ({grpc_error_rate*100:.2f}%)")
        
        # 判断严重程度
        if not issues:
            return 'HEALTHY', "✅ 系统运行正常"
        
        # Pod 级别问题直接判为 CRITICAL
        if has_pod_issue:
            return 'CRITICAL', "✗ " + " | ".join(issues)
        
        # 纯指标问题：单个轻度指标（未达 CRITICAL 阈值）-> WARNING，否则 CRITICAL
        if len(issues) == 1 and (cpu < self.CPU_CRITICAL and memory < self.MEMORY_CRITICAL):
            return 'WARNING', "⚠ " + " | ".join(issues)
        else:
            return 'CRITICAL', "✗ " + " | ".join(issues)
    
    def analyze(self) -> str:
        """
        执行一次完整的系统分析
        
        Returns:
            总体严重程度 (HEALTHY/WARNING/CRITICAL)
        """
        self.iteration += 1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"\n[第 {self.iteration} 次巡检] 开始采集数据...")
        print("[数据采集] 正在从 Prometheus 查询指标...")
        
        # 采集指标
        print("[状态检查] 正在检查 Pod 健康状态...")
        
        # 查询指标
        cpu_status, cpu_results = self.query_prometheus(
            'max(rate(container_cpu_usage_seconds_total{namespace="default"}[1m]))'
        )
        cpu_usage = float(cpu_results[0]['value'][1]) if cpu_results else 0.0
        
        memory_status, memory_results = self.query_prometheus(
            'max(container_memory_usage_bytes{namespace="default"}) / 1024 / 1024'
        )
        memory_usage = float(memory_results[0]['value'][1]) if memory_results else 0.0
        
        http_error_status, http_error_results = self.query_prometheus(
            'sum(rate(http_requests_total{status_code=~"5.."}[5m]))'
        )
        http_error_rate = float(http_error_results[0]['value'][1]) if http_error_results else 0.0
        
        grpc_error_status, grpc_error_results = self.query_prometheus(
            'sum(rate(grpc_server_handled_total{grpc_code!="OK"}[5m]))'
        )
        grpc_error_rate = float(grpc_error_results[0]['value'][1]) if grpc_error_results else 0.0
        
        # 检查 Pod 状态
        pod_status = self.check_pod_status()
        
        # 统计 Pod 状态（Running + Ready 才算健康）
        running_pods = sum(1 for s in pod_status.values() if s['phase'] == 'Running')
        healthy_pods = sum(1 for s in pod_status.values()
                          if s['phase'] == 'Running'
                          and s['ready'].split('/')[0] == s['ready'].split('/')[1])
        
        # 输出报告
        print(f"\n[{timestamp}] 系统巡检报告")
        print("-" * 70)
        print()
        print("📊 性能指标:")
        print(f"  CPU 使用率:        {cpu_usage:.4f}")
        print(f"  内存使用量:        {memory_usage:.1f} MB")
        print(f"  HTTP 5xx 错误率:   {http_error_rate:.4f}")
        print(f"  gRPC 错误率:       {grpc_error_rate:.4f}")
        print(f"  运行中的 Pod 数:   {running_pods}")
        print()
        
        # Pod 状态检查
        print("🔍 Pod 状态检查:")
        if healthy_pods == len(pod_status):
            print("  所有 Pod 运行正常")
        else:
            anomaly_count = len(pod_status) - healthy_pods
            print(f"  异常 Pod 数: {anomaly_count}")
            for service, status in pod_status.items():
                phase = status['phase']
                ready = status['ready']
                if phase != 'Running':
                    print(f"    - {service}: {phase} (Ready={ready})")
                elif ready.split('/')[0] != ready.split('/')[1]:
                    print(f"    - {service}: Running (未就绪 Ready={ready})")
        
        print()
        
        # 诊断分析
        print("🔬 诊断结论", end="")
        
        metrics = {
            'cpu': cpu_usage,
            'memory': memory_usage,
            'http_error_rate': http_error_rate,
            'grpc_error_rate': grpc_error_rate
        }
        
        severity, diagnosis = self._generate_diagnosis(
            'system',
            metrics,
            pod_status
        )
        
        print(f" [严重程度: {severity}]:")
        print(f"  {diagnosis}")
        print()
        
        # 自动故障恢复
        print("🩹 自动恢复", end="")
        recoveries = self._auto_recover(severity, pod_status, metrics)
        print()
        
        print("=" * 70)
        
        return severity
    
    def _restart_deployment(self, service: str) -> bool:
        """
        重启指定服务的 Deployment
        
        Args:
            service: 服务名称
            
        Returns:
            True 表示重启成功
        """
        try:
            cmd = [
                'kubectl', 'rollout', 'restart',
                f'deployment/{service}',
                '--namespace', 'default'
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.returncode == 0:
                return True
            else:
                print(f" [失败: {service}]")
                return False
        except Exception as e:
            print(f" [错误: {service} - {str(e)}]")
            return False
    
    def _auto_recover(self, severity: str, pod_status: Dict[str, Dict], metrics: Dict) -> List[str]:
        """
        根据诊断结果自动执行故障恢复
        
        仅当 CRITICAL 且有明确的 Pod 异常时触发，
        同一服务 60 秒内不重复重启。
        
        Args:
            severity: 严重程度
            pod_status: Pod 状态字典
            metrics: 性能指标
            
        Returns:
            已执行的恢复动作列表
        """
        if severity != 'CRITICAL':
            return []
        
        now = time.time()
        recoveries = []
        
        for svc, info in pod_status.items():
            # 检查是否需要恢复：Pod 异常 或 不就绪
            needs_recovery = False
            if info['phase'] != 'Running':
                needs_recovery = True
            else:
                parts = info['ready'].split('/')
                if parts[0] != parts[1]:
                    needs_recovery = True
            
            if not needs_recovery:
                continue
            
            # 冷却检查：同一服务 60 秒内不重复
            last_time = self._last_recovery.get(svc, 0)
            if now - last_time < self.RECOVERY_COOLDOWN:
                continue
            
            # 执行重启
            success = self._restart_deployment(svc)
            if success:
                self._last_recovery[svc] = now
                recoveries.append(svc)
        
        if recoveries:
            print(":")
            for svc in recoveries:
                print(f"  [RESTART] {svc}")
        else:
            print(" (无需操作)")
        
        return recoveries
    
    def run_monitoring_loop(self, interval: int = 15, max_iterations: Optional[int] = None):
        """
        运行持续监控循环
        
        Args:
            interval: 巡检间隔（秒）
            max_iterations: 最大巡检次数（None = 无限循环）
        """
        try:
            while max_iterations is None or self.iteration < max_iterations:
                self.analyze()
                
                if max_iterations is None or self.iteration < max_iterations:
                    print(f"下次巡检时间: {interval} 秒后")
                    time.sleep(interval)
        except KeyboardInterrupt:
            print("\n\n[Agent 已停止]")
            sys.exit(0)


def main():
    """主函数"""
    monitor = OnlineBoutiqueMonitor(prometheus_url="http://localhost:9090")
    
    print("=" * 70)
    print("Online Boutique 微服务智能运维 Agent 已启动")
    print("=" * 70)
    print("监控的微服务（共 12 个）:")
    
    for service, info in monitor.SERVICES.items():
        print(f"  ✓ {service:25s} ({info.language:10s} {info.protocol:10s})")
    
    print()
    print("-" * 70)
    
    monitor.run_monitoring_loop(interval=10)


if __name__ == "__main__":
    main()
