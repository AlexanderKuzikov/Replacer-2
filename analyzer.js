const fs = require('fs');
const path = require('path');

class NameAnalyzer {
  constructor(configPath = 'config.json') {
    this.config = this.loadConfig(configPath);
    this.analyzerConfig = this.config.analyzer;
    this.validateConfig();
  }

  loadConfig(configPath) {
    const absolutePath = path.resolve(configPath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`❌ Конфиг-файл не найден: ${absolutePath}`);
    }

    try {
      const configContent = fs.readFileSync(absolutePath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      throw new Error(`❌ Ошибка чтения конфиг-файла: ${error.message}`);
    }
  }

  validateConfig() {
    const required = ['inputFile', 'outputFile', 'originalPrefix'];
    const missing = required.filter(field => !this.analyzerConfig[field]);
    
    if (missing.length > 0) {
      throw new Error(`❌ В конфиге analyzer отсутствуют обязательные поля: ${missing.join(', ')}`);
    }

    // Проверяем существование входного файла
    const inputPath = path.resolve(this.analyzerConfig.inputFile);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`❌ Входной файл не найден: ${inputPath}`);
    }
  }

  run() {
    console.log('🔍 Запуск анализа XML файла...');
    console.log(`📁 Входной файл: ${this.analyzerConfig.inputFile}`);
    console.log(`🎯 Префикс для поиска: "${this.analyzerConfig.originalPrefix}"`);

    try {
      // 1. Чтение XML
      const inputPath = path.resolve(this.analyzerConfig.inputFile);
      const xml = fs.readFileSync(inputPath, 'utf8');
      
      // 2. Извлечение содержимого фигурных скобок
      const braceContents = this.extractBraceContent(xml);
      console.log(`📊 Найдено ${braceContents.length} фрагментов в фигурных скобках`);
      
      // 3. Фильтрация по префиксу
      const filtered = braceContents.filter(content => 
        content.includes(this.analyzerConfig.originalPrefix)
      );
      console.log(`🎯 Отфильтровано ${filtered.length} фрагментов с целевым префиксом`);
      
      // 4. Очистка от логических конструкций
      const cleaned = this.analyzerConfig.cleanLogicalConstructions 
        ? filtered.map(content => this.cleanFieldName(content))
        : filtered;
      
      // 5. Удаление дубликатов
      const uniqueNames = [...new Set(cleaned)];
      console.log(`✨ Осталось ${uniqueNames.length} уникальных имен`);
      
      // 6. Сортировка
      const sortedNames = this.analyzerConfig.sortByLength
        ? uniqueNames.sort((a, b) => b.length - a.length)
        : uniqueNames;
      
      // 7. Сохранение результата
      this.saveResults(sortedNames);
      
      console.log(`✅ Анализ завершен! Результаты сохранены в: ${this.analyzerConfig.outputFile}`);
      return sortedNames;
      
    } catch (error) {
      console.error(`❌ Ошибка при анализе: ${error.message}`);
      throw error;
    }
  }

  extractBraceContent(xml) {
    const regex = /\{([^}]+)\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  cleanFieldName(content) {
    // Обработка циклов
    if (content.startsWith('цикл(') && content.includes(' из ')) {
      const match = content.match(/цикл\([^)]+ из ([^)]+)\)/);
      return match ? match[1] : content;
    }
    
    // Обработка выбор/если
    if (content.startsWith('выбор(')) {
      return content.slice(6, -1);
    }
    
    if (content.startsWith('если(')) {
      return content.slice(5, -1);
    }
    
    return content;
  }

  saveResults(uniqueNames) {
    const outputPath = path.resolve(this.analyzerConfig.outputFile);
    const outputDir = path.dirname(outputPath);
    
    // Создаем папку OUT если её нет
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = {
      metadata: {
        generatedBy: "XML Analyzer Utility",
        generatedAt: new Date().toISOString(),
        configUsed: this.analyzerConfig
      },
      originalPrefix: this.analyzerConfig.originalPrefix,
      uniqueNames: uniqueNames,
      statistics: {
        totalUniqueNames: uniqueNames.length,
        inputFile: this.analyzerConfig.inputFile,
        outputFile: this.analyzerConfig.outputFile
      }
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  }
}

// Запуск утилиты
if (require.main === module) {
  try {
    const configArg = process.argv[2]; // Возможность указать другой конфиг
    const configPath = configArg || 'config.json';
    
    const analyzer = new NameAnalyzer(configPath);
    analyzer.run();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = NameAnalyzer;