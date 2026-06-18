// server.js (VERSÃO COMPLETA E CORRIGIDA)
// 📦 Carrega variáveis de ambiente
require('dotenv').config();

// 🔧 Core
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');

// ============================================
// MIDDLEWARES DE SEGURANÇA
// ============================================
const { 
  apiLimiter, 
  authLimiter, 
  securityHeaders, 
  sanitizeInput, 
  protectXSS, 
  preventHpp,
  requestLogger,
  verificarLicenca
} = require('./middlewares/security');

// 📡 Conexão com o MongoDB
const connectDB = require('./config/database');
connectDB();

// 🛡️ Middlewares personalizados
const { verifyToken } = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');
const { integrarAutomaticamente } = require('./middlewares/contabilidadeAuto');
const logsRoutes = require('./routes/logs');

// 📁 Rotas Existentes
const folhaSalarialRoutes = require('./routes/folhaSalarial'); 
const stockRoutes = require('./routes/stock');
const vendasRoutes = require('./routes/vendas');
const clienteRoutes = require('./routes/clientes');
const facturasRoutes = require('./routes/facturas');
const liquidezRoutes = require('./routes/liquidez');
const reconciliacaoRoutes = require('./routes/reconciliacao');
const analiseGeralRoutes = require('./routes/analisegeral');
const inventarioRoutes = require('./routes/inventario');
const configuracaoBancoRoutes = require('./routes/configuracaoBanco');

// 📁 Rotas do Módulo de Contabilidade
const contabilidadeRoutes = require('./routes/contabilidadeRoutes');

// 🚀 Inicialização da app
const app = express();

// Importar cron jobs
const { iniciarCronJobs } = require('./cronJobs');

// Criar diretório de uploads
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads', 'extratos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Diretório de uploads criado:', uploadsDir);
}

// ============================================
// 🌐 MIDDLEWARES GLOBAIS (ORDEM IMPORTANTE!)
// ============================================

// 1. Headers de segurança
app.use(securityHeaders);

// 2. Logging de requisições
app.use(requestLogger);

// 3. CORS
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://sirexa.vercel.app", "https://sirexa-git-main-bzamtwhmspm3pn3s-projects.vercel.app"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// 4. Morgan (logging HTTP)
app.use(morgan('dev'));

// 5. Parse JSON e URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. Arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 7. Sanitização de entrada (ANTES das rotas)
app.use(sanitizeInput);
app.use(protectXSS);
app.use(preventHpp);

// 8. Rate limiting GLOBAL (para todas as rotas API)
app.use('/api/', apiLimiter);

// 9. Rate limiting específico para autenticação
app.use('/api/gestor', authLimiter);

// ============================================
// 📁 ROTAS PÚBLICAS (sem token)
// ============================================

// Rota de licença (pública para validação)
app.use('/api/licenca', require('./routes/licenca'));

// Rotas de autenticação
app.use('/api/gestor', require('./routes/gestor'));
app.use('/api/tecnico', require('./routes/tecnico'));

// ============================================
// 📁 MIDDLEWARE DE VERIFICAÇÃO DE LICENÇA
// Aplica-se a todas as rotas protegidas após autenticação
// ============================================
app.use('/api/', verificarLicenca);

// ============================================
// 📁 MIDDLEWARE DE AUTOMAÇÃO CONTABILÍSTICA
// ============================================
app.use('/api/vendas', integrarAutomaticamente);
app.use('/api/pagamentos', integrarAutomaticamente);
app.use('/api/logs', verifyToken, logsRoutes);

// ============================================
// 📁 ROTAS PROTEGIDAS (com verificação de token)
// ============================================

// 🏢 Gestão de Empresas
app.use('/api/empresa', verifyToken, require('./routes/empresa'));

// 💰 Gestão Financeira
app.use('/api/receitas', verifyToken, require('./routes/receitas'));
app.use('/api/custos', verifyToken, require('./routes/custos'));
app.use('/api/resultados-financeiros', verifyToken, require('./routes/resultadosFinanceiros'));
app.use('/api/impostos', verifyToken, require('./routes/impostos'));
app.use('/api/orcamentos', verifyToken, require('./routes/orcamentos'));
app.use('/api/indicadores', verifyToken, require('./routes/indicadores'));

// 📊 Análise Geral
app.use('/api/analisegeral', verifyToken, analiseGeralRoutes);
app.use('/api/anos-disponiveis', verifyToken, require('./routes/indicadores'));
app.use('/api/reconciliacao', reconciliacaoRoutes);

// 💳 Gestão de Pagamentos
app.use('/api/pagamentos', verifyToken, require('./routes/pagamentos'));
app.use('/api/liquidez', liquidezRoutes);

// 🏦 Gestão Bancária
app.use('/api/bancos', verifyToken, require('./routes/bancos'));
app.use('/api/transferencias', verifyToken, require('./routes/transferencias'));
app.use('/api/abastecimentos', verifyToken, require('./routes/abastecimentos'));
app.use('/api/manutencoes', verifyToken, require('./routes/manutencoes'));
app.use('/api/inventario', inventarioRoutes);
app.use('/api/viaturas', verifyToken, require('./routes/viaturas'));

// 👥 Gestão de Recursos Humanos
app.use('/api/funcionarios', verifyToken, require('./routes/funcionarios'));
app.use('/api/folha-salarial', verifyToken, folhaSalarialRoutes); 
app.use('/api/faltas', verifyToken, require('./routes/faltas'));
app.use('/api/abonos', verifyToken, require('./routes/abonos'));
app.use('/api/avaliacoes', verifyToken, require('./routes/avaliacoes'));
app.use('/api/rh', verifyToken, require('./routes/rh'));
app.use('/api/importacao', verifyToken, require('./routes/importacao'));
app.use('/api/configuracao-banco', verifyToken, configuracaoBancoRoutes);

// 🏭 Gestão de Fornecedores
app.use('/api/fornecedores', verifyToken, require('./routes/fornecedores'));

// 💵 Fluxo de Caixa
app.use('/api/fluxocaixa', verifyToken, require('./routes/fluxoCaixa'));

// 📈 Relatórios e Gráficos
app.use('/api/graficos', verifyToken, require('./routes/graficos'));
app.use('/api/relatorios', verifyToken, require('./routes/relatorios'));

// 🛒 Vendas e Stock
app.use('/api/stock', verifyToken, stockRoutes);
app.use('/api/vendas', verifyToken, vendasRoutes);
app.use('/api/clientes', verifyToken, clienteRoutes);
app.use('/api/facturas', verifyToken, facturasRoutes);

// 📋 Rotas existentes
app.use('/api/contacorrente', verifyToken, require('./routes/contaCorrente'));
app.use('/api/folhabanco', verifyToken, require('./routes/folhaBanco'));
app.use('/api/demonstrativoderesultados', verifyToken, require('./routes/demonstrativoResultados'));
app.use('/api/estimativa', verifyToken, require('./routes/estimativa'));

// ============================================
// 📁 MÓDULO DE CONTABILIDADE - PGCA ANGOLA
// ============================================
app.use('/api/contabilidade', verifyToken, contabilidadeRoutes);

// Rota especial para inicializar plano de contas padrão
app.post('/api/contabilidade/inicializar', verifyToken, async (req, res) => {
  try {
    const PlanoContasController = require('./controllers/contabilidade/PlanoContasController');
    await PlanoContasController.inicializarPadrao(req, res);
  } catch (error) {
    console.error('Erro ao inicializar plano de contas:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 📊 ROTA DE STATUS DO SISTEMA
// ============================================
app.get('/api/status', (req, res) => {
  res.json({
    sucesso: true,
    mensagem: 'API SIREXA está funcionando',
    versao: '2.1.0',
    seguranca: {
      rateLimiting: true,
      helmet: true,
      sanitization: true,
      licenseVerification: true
    },
    modulos: [
      'Gestão de Empresas',
      'Recursos Humanos',
      'Gestão Patrimonial',
      'Financeiro',
      'Operacional',
      'Contabilidade (PGCA Angola)',
      'Licenciamento'
    ],
    contabilidade: {
      classes: 9,
      planoCotnas: 'PGC Angola',
      automacao: true,
      partidasDobradas: true
    }
  });
});

// ============================================
// 🔚 Middleware de tratamento de erro (global)
// ============================================
app.use(errorHandler);

// ============================================
// 🔊 Iniciar o servidor
// ============================================
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    console.log('✅ MongoDB conectado');
    
    iniciarCronJobs();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n📁 ROTAS REGISTRADAS:`);
      console.log(`   🔓 Públicas:`);
      console.log(`   - POST   /api/gestor (cadastro)`);
      console.log(`   - POST   /api/gestor/login (autenticação)`);
      console.log(`   - POST   /api/licenca/validar (validação de chave)`);
      console.log(`   - GET    /api/status (status do sistema)`);
      console.log(`\n   🔒 Protegidas (requer token):`);
      console.log(`   - /api/empresa`);
      console.log(`   - /api/fornecedores`);
      console.log(`   - /api/stock`);
      console.log(`   - /api/vendas`);
      console.log(`   - /api/pagamentos`);
      console.log(`   - /api/contabilidade (PGCA Angola)`);
      console.log(`   - /api/licenca/status (status da licença)`);
      console.log(`\n🛡️ Segurança ativa:`);
      console.log(`   - Rate Limiting: ✅`);
      console.log(`   - Helmet (headers): ✅`);
      console.log(`   - Sanitização: ✅`);
      console.log(`   - XSS Protection: ✅`);
      console.log(`   - License Verification: ✅`);
      console.log(`\n📧 Serviços:`);
      console.log(`   - Email: ${process.env.EMAIL_USER ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`   - SMS: ${process.env.SMS_API_KEY ? '✅ Configurado' : '❌ Não configurado'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();