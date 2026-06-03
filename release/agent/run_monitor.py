#!/usr/bin/env python3
"""
Online Boutique 微服务监控 Agent 启动脚本

此脚本处理 Windows UTF-8 编码问题，确保监控信息正确显示

使用方法：
    python run_monitor.py
"""

import sys
import io

# Windows UTF-8 编码修复
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from online_boutique_monitor import main

if __name__ == "__main__":
    main()
