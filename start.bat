@echo off
chcp 65001 >nul

echo 🔄 Replacer-2: Запуск...
echo.

REM Тихое обновление в фоне (без вывода)
git pull origin main >nul 2>&1

REM Проверка зависимостей
if not exist "node_modules" (
    echo ⚙️  Установка зависимостей...
    call npm install
)

echo 🌐 Открытие браузера: http://localhost:3000
echo.

REM Открыть браузер через 2 секунды
timeout /t 2 /nobreak >nul
start http://localhost:3000

REM Запуск сервера
call npm start
