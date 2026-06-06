@echo off
setlocal

cd /d "%~dp0..\.."
set CHAOS_DIR=deploy\chaos-mesh

echo ========== Chaos Mesh Experiment Runner ==========
echo.
echo Select mode:
echo   1. Quick (3 experiments: Pod Kill + Network Delay + CPU Stress)
echo   2. Full  (8 experiments, one after another)
echo   3. Pick  (choose one experiment)
echo.
choice /c 123 /m "Your choice [1-3]"

if errorlevel 3 goto custom
if errorlevel 2 goto full
if errorlevel 1 goto quick

:quick
echo.
echo [1/3] Pod Kill - currencyservice
kubectl apply -f %CHAOS_DIR%\01-pod-kill-currencyservice.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete podchaos kill-currencyservice -n chaos-testing --ignore-not-found
echo.

echo [2/3] Network Delay - productcatalogservice
kubectl apply -f %CHAOS_DIR%\03-network-delay-productcatalog.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete networkchaos delay-productcatalog -n chaos-testing --ignore-not-found
echo.

echo [3/3] Stress CPU - adservice
kubectl apply -f %CHAOS_DIR%\05-stress-cpu-adservice.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete stresschaos stress-cpu-adservice -n chaos-testing --ignore-not-found
echo.
goto done

:full
echo.
echo [1/8] Pod Kill - currencyservice
kubectl apply -f %CHAOS_DIR%\01-pod-kill-currencyservice.yaml
echo Waiting 35s...
timeout /t 35 /nobreak
kubectl delete podchaos kill-currencyservice -n chaos-testing --ignore-not-found
echo.

echo [2/8] Pod Kill - frontend
kubectl apply -f %CHAOS_DIR%\02-pod-kill-frontend.yaml
echo Waiting 35s...
timeout /t 35 /nobreak
kubectl delete podchaos kill-frontend -n chaos-testing --ignore-not-found
echo.

echo [3/8] Network Delay - productcatalogservice
kubectl apply -f %CHAOS_DIR%\03-network-delay-productcatalog.yaml
echo Waiting 35s...
timeout /t 35 /nobreak
kubectl delete networkchaos delay-productcatalog -n chaos-testing --ignore-not-found
echo.

echo [4/8] Network Loss - paymentservice
kubectl apply -f %CHAOS_DIR%\04-network-loss-paymentservice.yaml
echo Waiting 35s...
timeout /t 35 /nobreak
kubectl delete networkchaos loss-paymentservice -n chaos-testing --ignore-not-found
echo.

echo [5/8] Stress CPU - adservice
kubectl apply -f %CHAOS_DIR%\05-stress-cpu-adservice.yaml
echo Waiting 35s...
timeout /t 35 /nobreak
kubectl delete stresschaos stress-cpu-adservice -n chaos-testing --ignore-not-found
echo.

echo [6/8] Stress Memory - emailservice
kubectl apply -f %CHAOS_DIR%\06-stress-memory-emailservice.yaml
echo Waiting 35s...
timeout /t 35 /nobreak
kubectl delete stresschaos stress-memory-emailservice -n chaos-testing --ignore-not-found
echo.

echo [7/8] DNS Chaos - shippingservice
kubectl apply -f %CHAOS_DIR%\07-dns-chaos-shippingservice.yaml
echo Waiting 35s...
timeout /t 35 /nobreak
kubectl delete dnschaos dns-failure-shippingservice -n chaos-testing --ignore-not-found
echo.

echo [8/8] Combined - checkoutservice
kubectl apply -f %CHAOS_DIR%\08-combined-checkoutservice.yaml
echo Waiting 35s...
timeout /t 35 /nobreak
kubectl delete networkchaos combined-checkoutservice -n chaos-testing --ignore-not-found
echo.
goto done

:custom
echo.
echo Available experiments:
echo   1. Pod Kill - currencyservice
echo   2. Pod Kill - frontend
echo   3. Network Delay - productcatalogservice
echo   4. Network Loss - paymentservice
echo   5. Stress CPU - adservice
echo   6. Stress Memory - emailservice
echo   7. DNS Chaos - shippingservice
echo   8. Combined - checkoutservice
echo.
choice /c 12345678 /m "Your choice [1-8]"

if errorlevel 8 goto custom_8
if errorlevel 7 goto custom_7
if errorlevel 6 goto custom_6
if errorlevel 5 goto custom_5
if errorlevel 4 goto custom_4
if errorlevel 3 goto custom_3
if errorlevel 2 goto custom_2
if errorlevel 1 goto custom_1
goto done

:custom_1
kubectl apply -f %CHAOS_DIR%\01-pod-kill-currencyservice.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete podchaos kill-currencyservice -n chaos-testing --ignore-not-found
goto done

:custom_2
kubectl apply -f %CHAOS_DIR%\02-pod-kill-frontend.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete podchaos kill-frontend -n chaos-testing --ignore-not-found
goto done

:custom_3
kubectl apply -f %CHAOS_DIR%\03-network-delay-productcatalog.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete networkchaos delay-productcatalog -n chaos-testing --ignore-not-found
goto done

:custom_4
kubectl apply -f %CHAOS_DIR%\04-network-loss-paymentservice.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete networkchaos loss-paymentservice -n chaos-testing --ignore-not-found
goto done

:custom_5
kubectl apply -f %CHAOS_DIR%\05-stress-cpu-adservice.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete stresschaos stress-cpu-adservice -n chaos-testing --ignore-not-found
goto done

:custom_6
kubectl apply -f %CHAOS_DIR%\06-stress-memory-emailservice.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete stresschaos stress-memory-emailservice -n chaos-testing --ignore-not-found
goto done

:custom_7
kubectl apply -f %CHAOS_DIR%\07-dns-chaos-shippingservice.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete dnschaos dns-failure-shippingservice -n chaos-testing --ignore-not-found
goto done

:custom_8
kubectl apply -f %CHAOS_DIR%\08-combined-checkoutservice.yaml
echo Waiting 35s for Agent to detect...
timeout /t 35 /nobreak
kubectl delete networkchaos combined-checkoutservice -n chaos-testing --ignore-not-found
goto done

:done
echo.
echo ========== All done ==========
echo.
echo Tips:
echo   Watch the Agent window for detection results
echo   Grafana : http://localhost:3000
echo   Prometheus: http://localhost:9090
echo.
pause
