#!/usr/bin/env python3
"""
Online Boutique 微服务监控 Agent 的单元测试

测试内容：
- Prometheus 查询能力
- Pod 状态检查能力
- 诊断分析能力
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from online_boutique_monitor import OnlineBoutiqueMonitor, ServiceInfo


class TestOnlineBoutiqueMonitor(unittest.TestCase):
    """测试 OnlineBoutiqueMonitor 类"""
    
    def setUp(self):
        """测试初始化"""
        self.monitor = OnlineBoutiqueMonitor()
    
    def test_initialization(self):
        """测试初始化"""
        self.assertEqual(self.monitor.prometheus_url, "http://localhost:9090")
        self.assertEqual(self.monitor.iteration, 0)
        self.assertEqual(len(self.monitor.SERVICES), 12)
    
    def test_services_definition(self):
        """测试微服务定义"""
        expected_services = [
            'frontend', 'productcatalogservice', 'cartservice',
            'currencyservice', 'paymentservice', 'shippingservice',
            'checkoutservice', 'emailservice', 'recommendationservice',
            'adservice', 'reviewservice', 'loadgenerator'
        ]
        
        for service in expected_services:
            self.assertIn(service, self.monitor.SERVICES)
    
    def test_service_info_dataclass(self):
        """测试 ServiceInfo 数据类"""
        info = ServiceInfo('test', 'Python', 'gRPC')
        self.assertEqual(info.name, 'test')
        self.assertEqual(info.language, 'Python')
        self.assertEqual(info.protocol, 'gRPC')
    
    def test_severity_thresholds(self):
        """测试严重程度阈值"""
        self.assertEqual(self.monitor.CPU_WARNING, 0.15)
        self.assertEqual(self.monitor.CPU_CRITICAL, 0.80)
        self.assertEqual(self.monitor.MEMORY_WARNING, 2 * 1024)
        self.assertEqual(self.monitor.MEMORY_CRITICAL, 4 * 1024)
        self.assertEqual(self.monitor.ERROR_RATE_WARNING, 0.005)
        self.assertEqual(self.monitor.ERROR_RATE_CRITICAL, 0.01)
        self.assertEqual(self.monitor.POD_RESTART_WARNING, 15)
    
    @patch('requests.get')
    def test_query_prometheus_success(self, mock_get):
        """测试 Prometheus 查询成功"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'status': 'success',
            'data': {
                'result': [
                    {'value': ['timestamp', '0.5']}
                ]
            }
        }
        mock_get.return_value = mock_response
        
        status, results = self.monitor.query_prometheus('test_query')
        
        self.assertEqual(status, 'success')
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['value'][1], '0.5')
    
    @patch('requests.get')
    def test_query_prometheus_error(self, mock_get):
        """测试 Prometheus 查询失败"""
        mock_response = Mock()
        mock_response.json.return_value = {
            'status': 'error',
            'error': 'some error'
        }
        mock_get.return_value = mock_response
        
        status, results = self.monitor.query_prometheus('test_query')
        
        self.assertEqual(status, 'error')
        self.assertEqual(results, [])
    
    def test_generate_diagnosis_healthy(self):
        """测试诊断 - 健康状态"""
        metrics = {
            'cpu': 0.05,
            'memory': 1000,
            'http_error_rate': 0.0001,
            'grpc_error_rate': 0.0
        }
        
        severity, diagnosis = self.monitor._generate_diagnosis('service', metrics, {})
        
        self.assertEqual(severity, 'HEALTHY')
        self.assertIn('正常', diagnosis)
    
    def test_generate_diagnosis_cpu_warning(self):
        """测试诊断 - CPU 警告"""
        metrics = {
            'cpu': 0.6,
            'memory': 1000,
            'http_error_rate': 0.0,
            'grpc_error_rate': 0.0
        }
        
        severity, diagnosis = self.monitor._generate_diagnosis('service', metrics, {})
        
        self.assertEqual(severity, 'WARNING')
        self.assertIn('CPU', diagnosis)
    
    def test_generate_diagnosis_critical(self):
        """测试诊断 - 严重状态"""
        metrics = {
            'cpu': 0.9,
            'memory': 5000,
            'http_error_rate': 0.02,
            'grpc_error_rate': 0.02
        }
        
        severity, diagnosis = self.monitor._generate_diagnosis('service', metrics, {})
        
        self.assertEqual(severity, 'CRITICAL')
        self.assertIn('✗', diagnosis)
    
    def test_generate_diagnosis_pod_pending(self):
        """测试诊断 - Pod Pending 应判为 CRITICAL"""
        metrics = {'cpu': 0.3, 'memory': 1000, 'http_error_rate': 0.0, 'grpc_error_rate': 0.0}
        pod_status = {
            'currencyservice': {
                'pod_name': 'currencyservice-xxx',
                'phase': 'Pending',
                'ready': '0/1',
                'restarts': 0,
                'containers': []
            }
        }
        
        severity, diagnosis = self.monitor._generate_diagnosis('system', metrics, pod_status)
        
        self.assertEqual(severity, 'CRITICAL')
        self.assertIn('currencyservice', diagnosis)
        self.assertIn('Pending', diagnosis)
    
    def test_generate_diagnosis_pod_not_ready(self):
        """测试诊断 - Pod 不就绪应判为 CRITICAL"""
        metrics = {'cpu': 0.3, 'memory': 1000, 'http_error_rate': 0.0, 'grpc_error_rate': 0.0}
        pod_status = {
            'frontend': {
                'pod_name': 'frontend-xxx',
                'phase': 'Running',
                'ready': '0/1',
                'restarts': 0,
                'containers': []
            }
        }
        
        severity, diagnosis = self.monitor._generate_diagnosis('system', metrics, pod_status)
        
        self.assertEqual(severity, 'CRITICAL')
        self.assertIn('不就绪', diagnosis)
    
    def test_generate_diagnosis_pod_restarts(self):
        """测试诊断 - Pod 频繁重启应判为 CRITICAL"""
        metrics = {'cpu': 0.3, 'memory': 1000, 'http_error_rate': 0.0, 'grpc_error_rate': 0.0}
        pod_status = {
            'adservice': {
                'pod_name': 'adservice-xxx',
                'phase': 'Running',
                'ready': '1/1',
                'restarts': 20,
                'containers': []
            }
        }
        
        severity, diagnosis = self.monitor._generate_diagnosis('system', metrics, pod_status)
        
        self.assertEqual(severity, 'CRITICAL')
        self.assertIn('重启', diagnosis)
    
    def test_generate_diagnosis_multiple_pod_issues(self):
        """测试诊断 - 多个 Pod 异常合并报告"""
        metrics = {'cpu': 0.3, 'memory': 1000, 'http_error_rate': 0.0, 'grpc_error_rate': 0.0}
        pod_status = {
            'currencyservice': {
                'pod_name': 'currencyservice-xxx',
                'phase': 'Pending',
                'ready': '0/1',
                'restarts': 0,
                'containers': []
            },
            'frontend': {
                'pod_name': 'frontend-xxx',
                'phase': 'Running',
                'ready': '0/1',
                'restarts': 5,
                'containers': []
            }
        }
        
        severity, diagnosis = self.monitor._generate_diagnosis('system', metrics, pod_status)
        
        self.assertEqual(severity, 'CRITICAL')
        self.assertIn('currencyservice', diagnosis)
        self.assertIn('frontend', diagnosis)
    
    @patch.object(OnlineBoutiqueMonitor, '_restart_deployment', return_value=True)
    def test_auto_recover_critical(self, mock_restart):
        """测试自动恢复 - CRITICAL 触发重启"""
        pod_status = {
            'currencyservice': {
                'pod_name': 'currencyservice-xxx',
                'phase': 'Pending',
                'ready': '0/1',
                'restarts': 0,
                'containers': []
            }
        }
        metrics = {'cpu': 0.05, 'memory': 1000, 'http_error_rate': 0.0, 'grpc_error_rate': 0.0}
        
        recoveries = self.monitor._auto_recover('CRITICAL', pod_status, metrics)
        
        self.assertEqual(recoveries, ['currencyservice'])
        mock_restart.assert_called_once_with('currencyservice')
        self.assertIn('currencyservice', self.monitor._last_recovery)
    
    def test_auto_recover_healthy(self):
        """测试自动恢复 - HEALTHY 不触发恢复"""
        pod_status = {
            'currencyservice': {
                'pod_name': 'currencyservice-xxx',
                'phase': 'Running',
                'ready': '1/1',
                'restarts': 0,
                'containers': []
            }
        }
        metrics = {'cpu': 0.05, 'memory': 1000, 'http_error_rate': 0.0, 'grpc_error_rate': 0.0}
        
        recoveries = self.monitor._auto_recover('HEALTHY', pod_status, metrics)
        
        self.assertEqual(recoveries, [])
    
    @patch.object(OnlineBoutiqueMonitor, '_restart_deployment', return_value=True)
    def test_auto_recover_cooldown(self, mock_restart):
        """测试自动恢复 - 冷却期内不重复重启"""
        pod_status = {
            'currencyservice': {
                'pod_name': 'currencyservice-xxx',
                'phase': 'Pending',
                'ready': '0/1',
                'restarts': 0,
                'containers': []
            }
        }
        metrics = {'cpu': 0.05, 'memory': 1000, 'http_error_rate': 0.0, 'grpc_error_rate': 0.0}
        
        # 第一次恢复
        self.monitor._auto_recover('CRITICAL', pod_status, metrics)
        self.assertEqual(mock_restart.call_count, 1)
        
        # 立即再次触发，应在冷却期内被跳过
        self.monitor._auto_recover('CRITICAL', pod_status, metrics)
        self.assertEqual(mock_restart.call_count, 1)  # 没有增加


if __name__ == '__main__':
    unittest.main()
