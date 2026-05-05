@echo off
setlocal
cd /d "%~dp0"
echo.
echo === RADKE BI - build + serve ===
echo.
echo [1/4] Build data.js a partir de data\*.json ...
node build-data.cjs
if errorlevel 1 (
  echo.
  echo BUILD-DATA FAIL - confira os erros acima.
  pause
  exit /b 1
)
echo.
echo [1.5/4] Build data-extras.js (XLSX do Drive: ABC, Faturamento, ADS) ...
node build-radke-extras.cjs
if errorlevel 1 (
  echo (extras falhou - paginas Faturamento/ABC/Marketing podem nao ter dados. OK seguir.)
  echo.
)
echo.
echo [2/4] Build app.bundle.js (JSX) ...
node build-jsx.cjs
if errorlevel 1 (
  echo.
  echo BUILD-JSX FAIL - confira os erros acima.
  pause
  exit /b 1
)
echo.
echo [3/4] Generate report.json (analise IA) ...
node generate-report.cjs
if errorlevel 1 (
  echo.
  echo (report falhou - abrindo BI sem relatorio. Voce pode rodar manualmente: node generate-report.cjs --force)
  echo.
)
echo.
echo [4/4] Servidor em http://localhost:5181  (Ctrl+C para parar)
echo.
py -m http.server 5181
endlocal
