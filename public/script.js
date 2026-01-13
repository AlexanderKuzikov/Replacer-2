// DOM elements
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileName = document.getElementById('fileName');
const oldPrefixInput = document.getElementById('oldPrefix');
const newPrefixInput = document.getElementById('newPrefix');
const executeBtn = document.getElementById('executeBtn');
const resultBlock = document.getElementById('result');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

// File selection
selectFileBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext !== 'fdt' && ext !== 'docx') {
        showNotification('❗ Поддерживаются только .fdt и .docx файлы', 'error');
        fileInput.value = '';
        return;
    }
    
    fileName.textContent = `✅ ${file.name}`;
    fileName.style.color = '#4caf50';
    showNotification(`✅ Файл загружен: ${file.name}`, 'success');
});

// Validation
function validatePrefix(prefix) {
    if (!prefix || prefix.trim() === '') {
        return 'Префикс не может быть пустым';
    }
    
    // Check for valid characters (letters, numbers, underscore)
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(prefix)) {
        return 'Только буквы, цифры и подчеркивания';
    }
    
    return null;
}

// Execute button handler
executeBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    const oldPrefix = oldPrefixInput.value.trim();
    const newPrefix = newPrefixInput.value.trim();
    
    // Validation
    if (!file) {
        showNotification('📁 Выберите файл', 'warning');
        return;
    }
    
    const oldPrefixError = validatePrefix(oldPrefix);
    if (oldPrefixError) {
        showNotification(`⚠️ Старый префикс: ${oldPrefixError}`, 'error');
        return;
    }
    
    const newPrefixError = validatePrefix(newPrefix);
    if (newPrefixError) {
        showNotification(`⚠️ Новый префикс: ${newPrefixError}`, 'error');
        return;
    }
    
    if (oldPrefix === newPrefix) {
        showNotification('⚠️ Префиксы не должны совпадать', 'warning');
        return;
    }
    
    // Disable button
    executeBtn.disabled = true;
    executeBtn.textContent = '⏳ Создание...';
    
    try {
        // Send request
        const response = await fetch('/api/generate-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: file.name,
                oldPrefix: oldPrefix,
                newPrefix: newPrefix
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            showResult(data.filePath);
        } else {
            showNotification(data.message, 'error');
        }
        
    } catch (error) {
        showNotification('❌ Ошибка соединения с сервером', 'error');
    } finally {
        executeBtn.disabled = false;
        executeBtn.textContent = '🚀 ВЫПОЛНИТЬ';
    }
});

// Show result
function showResult(filePath) {
    resultBlock.innerHTML = `
        <div style="color: #4caf50; font-size: 18px; margin-bottom: 8px;">
            ✅ Конфигурация создана!
        </div>
        <div style="color: #666;">
            📄 Файл: <strong>${filePath}</strong>
        </div>
    `;
    resultBlock.style.display = 'block';
}

// Show notification
function showNotification(message, type = 'info') {
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}
