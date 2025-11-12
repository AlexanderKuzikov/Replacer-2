const fs = require('fs');
const path = require('path');

class XMLReplacer {
  constructor(configPath = 'config.json') {
    this.config = this.loadConfig(configPath);
    this.replacerConfig = this.config.replacer;
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
    const required = ['inputFile', 'outputFile', 'replacementMapFile'];
    const missing = required.filter(field => !this.replacerConfig[field]);
    
    if (missing.length > 0) {
      throw new Error(`❌ В конфиге replacer отсутствуют обязательные поля: ${missing.join(', ')}`);
    }

    // Проверяем существование входных файлов
    const inputPath = path.resolve(this.replacerConfig.inputFile);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`❌ Входной XML файл не найден: ${inputPath}`);
    }

    const replacementMapPath = path.resolve(this.replacerConfig.replacementMapFile);
    if (!fs.existsSync(replacementMapPath)) {
      throw new Error(`❌ Файл с картой замен не найден: ${replacementMapPath}. Сначала запустите generator.js`);
    }
  }

  run() {
    console.log('🔄 Запуск замен в XML файле...');
    console.log(`📁 Входной файл: ${this.replacerConfig.inputFile}`);
    console.log(`🗺️  Файл замен: ${this.replacerConfig.replacementMapFile}`);
    console.log(`💾 Выходной файл: ${this.replacerConfig.outputFile}`);

    try {
      // 1. Чтение исходного XML
      const xmlContent = this.readXMLFile();
      
      // 2. Загрузка карты замен
      const replacementMap = this.loadReplacementMap();
      const replacements = replacementMap.замены;
      
      console.log(`📊 Загружено ${replacements.length} замен`);

      // 3. Применение замен
      const startTime = Date.now();
      const resultContent = this.applyReplacements(xmlContent, replacements);
      const endTime = Date.now();
      
      // 4. Сохранение результата
      this.saveResult(resultContent);
      
      console.log(`✅ Замены завершены за ${endTime - startTime}ms!`);
      console.log(`📁 Результат сохранен в: ${this.replacerConfig.outputFile}`);
      
      return resultContent;
      
    } catch (error) {
      console.error(`❌ Ошибка при заменах: ${error.message}`);
      throw error;
    }
  }

  readXMLFile() {
    const inputPath = path.resolve(this.replacerConfig.inputFile);
    return fs.readFileSync(inputPath, 'utf8');
  }

  loadReplacementMap() {
    const mapPath = path.resolve(this.replacerConfig.replacementMapFile);
    const mapContent = fs.readFileSync(mapPath, 'utf8');
    return JSON.parse(mapContent);
  }

  applyReplacements(xmlContent, replacements) {
    let result = xmlContent;
    let totalReplacements = 0;

    console.log('🔄 Применяем замены (от самых длинных к коротким)...');

    for (const replacement of replacements) {
      const originalEscaped = this.escapeRegex(replacement.оригинал);
      const replacementEscaped = replacement.замена;
      const originalBase64Escaped = this.escapeRegex(replacement.оригиналBase64);
      const replacementBase64Escaped = replacement.заменаBase64;

      // Создаем регулярные выражения для глобальной замены
      const textRegex = new RegExp(originalEscaped, 'g');
      const base64Regex = new RegExp(originalBase64Escaped, 'g');

      // Подсчитываем количество замен для каждого типа
      const textMatches = (result.match(textRegex) || []).length;
      const base64Matches = (result.match(base64Regex) || []).length;

      // Выполняем замены
      if (textMatches > 0) {
        result = result.replace(textRegex, replacementEscaped);
        console.log(`   📝 Текст: "${replacement.оригинал.substring(0, 50)}..." → ${textMatches} замен`);
      }

      if (base64Matches > 0) {
        result = result.replace(base64Regex, replacementBase64Escaped);
        console.log(`   🔐 Base64: ... → ${base64Matches} замен`);
      }

      totalReplacements += textMatches + base64Matches;
    }

    console.log(`📊 Всего выполнено замен: ${totalReplacements}`);
    return result;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  saveResult(content) {
    const outputPath = path.resolve(this.replacerConfig.outputFile);
    const outputDir = path.dirname(outputPath);
    
    // Создаем папку OUT если её нет
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, 'utf8');
  }

  // Дополнительный метод для валидации результатов
  validateReplacements(originalXML, resultXML, replacements) {
    console.log('\n🔍 Валидация результатов...');
    
    let hasErrors = false;
    
    for (const replacement of replacements) {
      const originalTextCount = (originalXML.match(new RegExp(this.escapeRegex(replacement.оригинал), 'g')) || []).length;
      const originalBase64Count = (originalXML.match(new RegExp(this.escapeRegex(replacement.оригиналBase64), 'g')) || []).length;
      
      const resultTextCount = (resultXML.match(new RegExp(this.escapeRegex(replacement.оригинал), 'g')) || []).length;
      const resultBase64Count = (resultXML.match(new RegExp(this.escapeRegex(replacement.оригиналBase64), 'g')) || []).length;
      
      if (resultTextCount > 0) {
        console.log(`   ⚠️  Обнаружено ${resultTextCount} неперезаписанных текстовых вхождений для: ${replacement.оригинал.substring(0, 30)}...`);
        hasErrors = true;
      }
      
      if (resultBase64Count > 0) {
        console.log(`   ⚠️  Обнаружено ${resultBase64Count} неперезаписанных Base64 вхождений`);
        hasErrors = true;
      }
    }
    
    if (!hasErrors) {
      console.log('   ✅ Все замены выполнены успешно!');
    }
    
    return !hasErrors;
  }
}

// Запуск утилиты
if (require.main === module) {
  try {
    const configArg = process.argv[2]; // Возможность указать другой конфиг
    const configPath = configArg || 'config.json';
    
    const replacer = new XMLReplacer(configPath);
    replacer.run();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = XMLReplacer;