const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));
app.use(express.json());

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
