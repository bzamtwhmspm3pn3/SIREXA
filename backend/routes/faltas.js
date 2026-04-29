// backend/routes/faltas.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const faltaController = require('../controllers/faltaController');
const { verifyToken } = require('../middlewares/auth');

// Verificar se as funções existem antes de usar
console.log('📋 Carregando rotas de faltas...');
console.log('📋 Funções do controller de faltas:');
console.log('  - listarFaltas:', typeof faltaController.listarFaltas);
console.log('  - criarFalta:', typeof faltaController.criarFalta);
console.log('  - atualizarFalta:', typeof faltaController.atualizarFalta);
console.log('  - excluirFalta:', typeof faltaController.excluirFalta);
console.log('  - configurarBiometrico:', typeof faltaController.configurarBiometrico);
console.log('  - getConfigBiometrico:', typeof faltaController.getConfigBiometrico);
console.log('  - testarConexaoBiometrico:', typeof faltaController.testarConexaoBiometrico);
console.log('  - sincronizarBiometrico:', typeof faltaController.sincronizarBiometrico);
console.log('  - receberRegistroBiometrico:', typeof faltaController.receberRegistroBiometrico);
console.log('  - importarCSV:', typeof faltaController.importarCSV);
console.log('  - getEstatisticas:', typeof faltaController.getEstatisticas);

// Middleware de autenticação (opcional para desenvolvimento)
// router.use(verifyToken);

// ==================== CRUD FALTAS ====================
if (faltaController.listarFaltas) {
  router.get('/', faltaController.listarFaltas);
  console.log('✅ Rota GET /faltas carregada');
} else {
  console.error('❌ função listarFaltas não encontrada');
}

if (faltaController.criarFalta) {
  router.post('/', faltaController.criarFalta);
  console.log('✅ Rota POST /faltas carregada');
} else {
  console.error('❌ função criarFalta não encontrada');
}

if (faltaController.atualizarFalta) {
  router.put('/:id', faltaController.atualizarFalta);
  console.log('✅ Rota PUT /faltas/:id carregada');
} else {
  console.error('❌ função atualizarFalta não encontrada');
}

if (faltaController.excluirFalta) {
  router.delete('/:id', faltaController.excluirFalta);
  console.log('✅ Rota DELETE /faltas/:id carregada');
} else {
  console.error('❌ função excluirFalta não encontrada');
}

// ==================== CONFIGURAÇÃO BIOMÉTRICA ====================
if (faltaController.getConfigBiometrico) {
  router.get('/biometrico/config/:empresaId', faltaController.getConfigBiometrico);
  console.log('✅ Rota GET /faltas/biometrico/config/:empresaId carregada');
} else {
  console.error('❌ função getConfigBiometrico não encontrada');
}

if (faltaController.configurarBiometrico) {
  router.post('/biometrico/config', faltaController.configurarBiometrico);
  console.log('✅ Rota POST /faltas/biometrico/config carregada');
} else {
  console.error('❌ função configurarBiometrico não encontrada');
}

if (faltaController.testarConexaoBiometrico) {
  router.post('/biometrico/testar', faltaController.testarConexaoBiometrico);
  console.log('✅ Rota POST /faltas/biometrico/testar carregada');
} else {
  console.error('❌ função testarConexaoBiometrico não encontrada');
}

if (faltaController.sincronizarBiometrico) {
  router.post('/biometrico/sincronizar', faltaController.sincronizarBiometrico);
  console.log('✅ Rota POST /faltas/biometrico/sincronizar carregada');
} else {
  console.error('❌ função sincronizarBiometrico não encontrada');
}

// ==================== WEBHOOK PARA APLICATIVOS MÓVEIS ====================
if (faltaController.receberRegistroBiometrico) {
  router.post('/biometrico/receber', faltaController.receberRegistroBiometrico);
  console.log('✅ Rota POST /faltas/biometrico/receber carregada (webhook para apps móveis)');
} else {
  console.error('❌ função receberRegistroBiometrico não encontrada');
}

// ==================== IMPORTAÇÃO CSV ====================
if (faltaController.importarCSV) {
  router.post('/importar/csv', upload.single('arquivo'), faltaController.importarCSV);
  console.log('✅ Rota POST /faltas/importar/csv carregada');
} else {
  console.error('❌ função importarCSV não encontrada');
}

// ==================== ESTATÍSTICAS ====================
if (faltaController.getEstatisticas) {
  router.get('/estatisticas', faltaController.getEstatisticas);
  console.log('✅ Rota GET /faltas/estatisticas carregada');
} else {
  console.error('❌ função getEstatisticas não encontrada');
}

console.log('✅ Todas as rotas de faltas foram carregadas!');

module.exports = router;