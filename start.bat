@echo off
chcp 65001 >nul

echo 🔄 Replacer-2: Запуск...
echo.

REM Проверка обновлений (тихо)
echo 📡 Проверка обновлений...
git fetch origin main >nul 2>&1

REM Сравнение локальной и удаленной версии
for /f %%i in ('git rev-parse HEAD') do set LOCAL=%%i
for /f %%i in ('git rev-parse origin/main') do set REMOTE=%%i

if not "%LOCAL%"=="%REMOTE%" (
    echo ✨ Найдены обновления, загрузка...
    git pull origin main >nul 2>&1
    if errorlevel 1 (
        echo ⚠️ Ошибка обновления, продолжаем со старой версией
    ) else (
        echo ✅ Обновлено успешно
    )
) else (
    echo ✅ У вас последняя версия
)

echo.

REM Создание необходимых директорий
if not exist "uploads" mkdir uploads
if not exist "IN" mkdir IN
if not exist "OUT" mkdir OUT

REM Проверка зависимостей
if not exist "node_modules" (
    echo 📦 Установка зависимостей...
    npm install    echo.
)

echo 🌐 Открытие браузера: http://localhost:3000
echo.

REM Открыть браузер через 2 секунды
start /B timeout /t 2 /nobreak >nul && start http://localhost:3000

REM Запуск сервера
echo 🚀 Запуск сервера...
echo.
npm start
