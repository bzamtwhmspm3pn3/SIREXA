// server.js (ATUALIZADO COM MÓDULO DE CONTABILIDADE)
// 📦 Carrega variáveis de ambiente
require('dotenv').config();

// 🔧 Core
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose'); 

// 📡 Conexão com o MongoDB
const connectDB = require('./config/database');
connectDB();

// 🛡️ Middlewares personalizados
const { verifyToken } = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');
const { integrarAutomaticamente } = require('./middlewares/contabilidadeAuto');

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

// 📁 Rotas do Módulo de Contabilidade (NOVO)
const contabilidadeRoutes = require('./routes/contabilidadeRoutes');

// 🚀 Inicialização da app
const app = express();

// Importar cron jobs
const { iniciarCronJobs } = require('./cronJobs');

const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads', 'extratos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Diretório de uploads criado:', uploadsDir);
}

// 🌐 Middlewares globais
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://sirexa.vercel.app", "https://sirexa-git-main-bzamtwhmspm3pn3s-projects.vercel.app"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// 📁 ROTAS PÚBLICAS (sem token)
// ============================================
app.use('/api/gestor', require('./routes/gestor'));
app.use('/api/tecnico', require('./routes/tecnico'));

// ============================================
// 📁 MIDDLEWARE DE AUTOMAÇÃO CONTABILÍSTICA
// Aplica-se automaticamente às rotas de Vendas e Pagamentos
// ============================================
app.use('/api/vendas', integrarAutomaticamente);
app.use('/api/pagamentos', integrarAutomaticamente);

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
app.use('/api/importacao', verifyToken, require('./routes/importacao'));
app.use('/api/configuracao-banco', verifyToken, configuracaoBancoRoutes);

// 🏭 Gestão de Fornecedores
app.use('/api/fornecedores', verifyToken, require('./routes/fornecedores'));

// 💵 Fluxo de Caixa
app.use('/api/fluxocaixa', verifyToken, require('./routes/fluxoCaixa'));

// 📈 Relatórios e Gráficos
app.use('/api/graficos', verifyToken, require('./routes/graficos'));
app.use('/api/relatorios', verifyToken, require('./routes/relatorios'));

// 🛒 Vendas (protegida após middleware de integração)
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
// Todas as rotas de contabilidade requerem autenticação
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
    versao: '2.0.0',
    modulos: [
      'Gestão de Empresas',
      'Recursos Humanos',
      'Gestão Patrimonial',
      'Financeiro',
      'Operacional',
      'Contabilidade (PGCA Angola)'
    ],
    contabilidade: {
      classes: 9,
      planoCotnas: 'PGC Angola',
      automacao: true,
      partidasDobradas: true
    }
  });
});

// 🔚 Middleware de tratamento de erro (global)
app.use(errorHandler);

// 🔊 Iniciar o servidor
const PORT = process.env.PORT || 5000;

// Função para iniciar o servidor
async function startServer() {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    console.log('✅ MongoDB conectado');
    
    iniciarCronJobs();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📁 Rotas registradas:`);
      console.log(`   - /api/empresa (protegida)`);
      console.log(`   - /api/gestor (pública: POST /, POST /login)`);
      console.log(`   - /api/gestor/me (protegida)`);
      console.log(`   - /api/bancos`);
      console.log(`   - /api/transferencias`);
      console.log(`   - /api/analisegeral`);
      console.log(`   - /api/contabilidade (NOVO - PGCA Angola)`);
      console.log(`     - GET  /plano-contas`);
      console.log(`     - POST /plano-contas`);
      console.log(`     - POST /plano-contas/auto`);
      console.log(`     - POST /plano-contas/inicializar`);
      console.log(`     - GET  /lancamentos`);
      console.log(`     - POST /lancamentos/manual`);
      console.log(`     - POST /reconciliar`);
      console.log(`     - GET  /relatorios/balancete`);
      console.log(`     - GET  /relatorios/dre`);
      console.log(`   - 🔄 Integração automática Vendas → Contabilidade`);
      console.log(`   - 🔄 Integração automática Pagamentos → Contabilidade`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();