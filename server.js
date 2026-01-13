const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');

const app = express();
const PORT = 3000;

// Multer configuration
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Extract fields from document.xml
function extractFields(xmlContent) {
  const fieldPattern = /\{([^}]+)\}/g;
  const fields = new Set();
  let match;
  
  while ((match = fieldPattern.exec(xmlContent)) !== null) {
    let field = match[1].trim();
    
    // Clean logical constructions like analyzer.js does
    // Remove цикл(x из список) -> список
    field = field.replace(/цикл\([^)]+из\s+([^)]+)\)/gi, '$1');
    // Remove выбор(...) wrapper
    field = field.replace(/выбор\((.+)\)/gi, '$1');
    // Remove если(...) wrapper  
    field = field.replace(/если\((.+)\)/gi, '$1');
    
    // Extract content from parentheses: функция(содержимое) -> содержимое
    const lastParen = field.lastIndexOf('(');
    if (lastParen > 0) {
      const closeParen = field.lastIndexOf(')');
      if (closeParen > lastParen) {
        field = field.substring(lastParen + 1, closeParen);
      } else {
        // No closing paren, take everything after opening
        field = field.substring(lastParen + 1);
          }
    field = field.trim();}
    if (field) { fields.add(field);
    }
  }
  
  return Array.from(fields).sort();
}

// Extract prefixes from fields
function extractPrefixes(fields) {
  const prefixes = new Set();
  
  fields.forEach(field => {
    // Extract prefix before first dot
    const dotIndex = field.indexOf('.');
    if (dotIndex > 0) {
      const prefix = field.substring(0, dotIndex);
      prefixes.add(prefix);
    }
  });
  
  return Array.from(prefixes).sort();
}

// Upload and analyze file
app.post('/api/upload-and-analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ Файл не загружен' 
      });
    }

    const filePath = req.file.path;
    let documentXml = null;

    try {
      // Open ZIP archive (.docx or .fdt)
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      
      // Check if this is a .fdt file (contains template.docx)
      const isFdt = zipEntries.some(entry => entry.entryName === 'template.docx');
      
      let xmlEntry = null;
      
      if (isFdt) {
        // For .fdt: extract template.docx and then get word/document.xml from it
        const templateEntry = zipEntries.find(entry => entry.entryName === 'template.docx');
        if (templateEntry) {
          const templateZip = new AdmZip(templateEntry.getData());
          xmlEntry = templateZip.getEntries().find(entry => entry.entryName === 'word/document.xml');
          if (xmlEntry) {
            documentXml = xmlEntry.getData().toString('utf8');
          }
        }
      } else {
        // For .docx: directly get word/document.xml
        xmlEntry = zipEntries.find(entry => entry.entryName === 'word/document.xml');
        if (xmlEntry) {
          documentXml = xmlEntry.getData().toString('utf8');
        }
      }
      
      if (!documentXml) {
        return res.status(400).json({
          success: false,
          message: '❌ document.xml не найден в архиве'
        });
      }    } finally {
      // Clean up uploaded file
      await fs.unlink(filePath).catch(() => {});
    }
    
    // Extract fields
    const fields = extractFields(documentXml);
    const prefixes = extractPrefixes(fields);
    
    res.json({
      success: true,
      fields: fields,
      prefixes: prefixes,
      totalFields: fields.length,
      totalPrefixes: prefixes.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ Ошибка при обработке файла' 
    });
  }
});

// Generate config.json
app.post('/api/generate-config', async (req, res) => {
  try {
    const { fileName, oldPrefix, newPrefix } = req.body;
    
    // Validation
    if (!fileName || !oldPrefix || !newPrefix) {
      return res.status(400).json({ 
        success: false, 
        message: '❌ Не все поля заполнены' 
      });
    }
    
    if (oldPrefix === newPrefix) {
      return res.status(400).json({ 
        success: false, 
        message: '⚠️ Префиксы не должны совпадать' 
      });
    }
    
    // Generate config
    const config = {
      "analyzer": {
        "inputFile": "IN/document.xml",
        "outputFile": "OUT/unique_names.json",
        "originalPrefix": oldPrefix + ".",
        "cleanLogicalConstructions": true,
        "sortByLength": true
      },
      "generator": {
        "inputFile": "OUT/unique_names.json",
        "outputFile": "OUT/replacement_map.json",
        "newPrefix": newPrefix + ".",
        "encoding": "utf8"
      },
      "replacer": {
        "inputFile": "IN/document.xml",
        "outputFile": "OUT/document.xml",
        "replacementMapFile": "OUT/replacement_map.json"
      }
    };
    
    // Save config.json
    const configPath = path.join(__dirname, 'config.json');
    await fs.writeFile(
      configPath, 
      JSON.stringify(config, null, 2), 
      'utf8'
    );
    
    res.json({ 
      success: true, 
      message: '✅ Конфигурация создана',
      filePath: 'config.json'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ Ошибка при создании конфигурации' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🔄 Replacer-2 запущен на http://localhost:${PORT}`);
});
