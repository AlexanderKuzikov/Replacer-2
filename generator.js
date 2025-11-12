const fs = require('fs');
const path = require('path');

class ReplacementGenerator {
  constructor(configPath = 'config.json') {
    this.config = this.loadConfig(configPath);
    this.generatorConfig = this.config.generator;
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
    const required = ['inputFile', 'outputFile', 'newPrefix'];
    const missing = required.filter(field => !this.generatorConfig[field]);
    
    if (missing.length > 0) {
      throw new Error(`❌ В конфиге generator отсутствуют обязательные поля: ${missing.join(', ')}`);
    }

    // Проверяем существование входного файла (результатов анализа)
    const inputPath = path.resolve(this.generatorConfig.inputFile);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`❌ Входной файл не найден: ${inputPath}. Сначала запустите analyzer.js`);
    }
  }

  run() {
    console.log('🛠️  Запуск генерации замен...');
    console.log(`📁 Входной файл: ${this.generatorConfig.inputFile}`);
    console.log(`🔄 Новый префикс: "${this.generatorConfig.newPrefix}"`);

    try {
      // 1. Чтение результатов анализа
      const analysisResults = this.loadAnalysisResults();
      const originalPrefix = analysisResults.originalPrefix;
      const uniqueNames = analysisResults.uniqueNames;
      
      console.log(`📊 Обрабатывается ${uniqueNames.length} уникальных имен`);
      console.log(`🎯 Исходный префикс: "${originalPrefix}"`);

      // 2. Генерация замен
      const replacements = this.generateReplacements(uniqueNames, originalPrefix, this.generatorConfig.newPrefix);
      
      // 3. Сохранение результата
      this.saveResults(replacements, originalPrefix);
      
      console.log(`✅ Генерация завершена! Карта замен сохранена в: ${this.generatorConfig.outputFile}`);
      return replacements;
      
    } catch (error) {
      console.error(`❌ Ошибка при генерации: ${error.message}`);
      throw error;
    }
  }

  loadAnalysisResults() {
    const inputPath = path.resolve(this.generatorConfig.inputFile);
    const analysisData = fs.readFileSync(inputPath, 'utf8');
    return JSON.parse(analysisData);
  }

  generateReplacements(uniqueNames, originalPrefix, newPrefix) {
    const replacements = [];

    for (const originalName of uniqueNames) {
      // Генерация строки замены
      const replacementName = originalName.replace(
        new RegExp(this.escapeRegex(originalPrefix), 'g'),
        newPrefix
      );

      // Генерация Base64 (UTF-8)
      const originalBase64 = Buffer.from(originalName, 'utf8').toString('base64');
      const replacementBase64 = Buffer.from(replacementName, 'utf8').toString('base64');

      replacements.push({
        оригинал: originalName,
        оригиналBase64: originalBase64,
        замена: replacementName,
        заменаBase64: replacementBase64,
        длина: originalName.length
      });
    }

    // Сортируем по убыванию длины для приоритетной замены
    return replacements.sort((a, b) => b.длина - a.длина);
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  saveResults(replacements, originalPrefix) {
    const outputPath = path.resolve(this.generatorConfig.outputFile);
    const outputDir = path.dirname(outputPath);
    
    // Создаем папку OUT если её нет
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = {
      metadata: {
        generatedBy: "Replacement Generator Utility",
        generatedAt: new Date().toISOString(),
        configUsed: this.generatorConfig
      },
      заменаПрефиксов: {
        из: originalPrefix,
        в: this.generatorConfig.newPrefix
      },
      замены: replacements,
      статистика: {
        всегоЗамен: replacements.length,
        файлАнализа: this.generatorConfig.inputFile,
        файлРезультата: this.generatorConfig.outputFile
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
    
    const generator = new ReplacementGenerator(configPath);
    generator.run();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = ReplacementGenerator;