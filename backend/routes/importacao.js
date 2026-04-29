const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Empresa = require('../models/Empresa');
const ImportService = require('../services/importService');
const { verifyToken } = require('../middlewares/auth');

// Configurar multer para upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Lista de extensões permitidas
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Lista de MIME types permitidos
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/json', // .json
      'text/plain' // alguns CSVs podem vir como text/plain
    ];
    
    const isExtAllowed = allowedExtensions.includes(ext);
    const isMimeAllowed = allowedMimes.includes(file.mimetype);
    
    console.log('Arquivo recebido:', {
      nome: file.originalname,
      extensao: ext,
      mimeType: file.mimetype,
      tamanho: file.size
    });
    
    if (isExtAllowed && isMimeAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`Formato de arquivo não suportado. Use: ${allowedExtensions.join(', ')}`));
    }
  }
});

// GET - Baixar modelo de Excel
router.get('/modelo', async (req, res) => {
  try {
    const buffer = ImportService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=modelo_funcionarios.xlsx');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao gerar modelo:', error);
    res.status(500).json({ mensagem: 'Erro ao gerar modelo', error: error.message });
  }
});

// POST - Importar funcionários
router.post('/funcionarios', verifyToken, upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ mensagem: 'Nenhum arquivo enviado' });
    }
    
    console.log('Processando arquivo:', {
      nome: req.file.originalname,
      tamanho: req.file.size,
      tipo: req.file.mimetype
    });
    
    // Buscar empresas para mapeamento
    const empresas = await Empresa.find();
    const empresaMap = new Map();
    empresas.forEach(emp => {
      empresaMap.set(emp.nome, emp);
    });
    
    let resultados;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const fileName = req.file.originalname.toLowerCase();
    
    // Determinar o tipo pelo conteúdo também
    let tipoArquivo = fileExt;
    
    // Se for CSV, verificar pelo conteúdo
    if (fileExt === '.csv' || req.file.mimetype === 'text/csv' || req.file.mimetype === 'text/plain') {
      tipoArquivo = '.csv';
    }
    
    // Se for JSON, verificar pelo conteúdo
    if (fileExt === '.json' || req.file.mimetype === 'application/json') {
      tipoArquivo = '.json';
    }
    
    // Se for Excel
    if (fileExt === '.xlsx' || fileExt === '.xls' || 
        req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        req.file.mimetype === 'application/vnd.ms-excel') {
      tipoArquivo = '.xlsx';
    }
    
    console.log('Tipo de arquivo detectado:', tipoArquivo);
    
    if (tipoArquivo === '.xlsx' || tipoArquivo === '.xls') {
      resultados = await ImportService.importFromExcel(req.file.buffer, empresaMap);
    } else if (tipoArquivo === '.json') {
      const data = JSON.parse(req.file.buffer.toString('utf8'));
      resultados = await ImportService.importFromJSON(data, empresaMap);
    } else if (tipoArquivo === '.csv') {
      const csvContent = req.file.buffer.toString('utf8');
      resultados = await ImportService.importFromCSV(csvContent, empresaMap);
    } else {
      return res.status(400).json({ 
        mensagem: `Formato de arquivo não suportado: ${fileExt}. Use: .xlsx, .xls, .csv ou .json` 
      });
    }
    
    res.json({
      mensagem: `Importação concluída. ${resultados.sucessos.length} sucessos, ${resultados.erros.length} erros.`,
      resultados
    });
  } catch (error) {
    console.error('Erro na importação:', error);
    res.status(500).json({ mensagem: 'Erro ao importar arquivo', error: error.message });
  }
});

// POST - Importar via JSON (API)
router.post('/funcionarios/json', verifyToken, async (req, res) => {
  try {
    const { dados } = req.body;
    
    if (!dados || !Array.isArray(dados)) {
      return res.status(400).json({ mensagem: 'Dados inválidos. Esperado array de funcionários.' });
    }
    
    const empresas = await Empresa.find();
    const empresaMap = new Map();
    empresas.forEach(emp => {
      empresaMap.set(emp.nome, emp);
    });
    
    const resultados = await ImportService.importFromJSON(dados, empresaMap);
    
    res.json({
      mensagem: `Importação concluída. ${resultados.sucessos.length} sucessos, ${resultados.erros.length} erros.`,
      resultados
    });
  } catch (error) {
    console.error('Erro na importação JSON:', error);
    res.status(500).json({ mensagem: 'Erro ao importar dados', error: error.message });
  }
});

module.exports = router;