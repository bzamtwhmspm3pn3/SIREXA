const express = require('express');
const router = express.Router();
const { Vaga, Candidatura, Entrevista, Talento } = require('../models/Recrutamento');
const { Curso, Inscricao, Certificacao } = require('../models/Formacao');
const FeriasLicenca = require('../models/FeriasLicenca');
const { Promocao, CargoHierarquia, Sucessao } = require('../models/Carreira');
const Disciplinar = require('../models/Disciplinar');
const { Competencia, CompetenciaFuncionario } = require('../models/Competencia');
const { ExameMedico, AcidenteTrabalho, EPI, EPIEntrega } = require('../models/SaudeSeguranca');
const { Workflow, Aprovacao } = require('../models/Workflow');
const { verifyToken } = require('../middlewares/auth');

router.use(verifyToken);

// ============================================
// 1. RECRUTAMENTO E SELEÇÃO
// ============================================

// Vagas
router.get('/vagas', async (req, res) => {
  try {
    const { empresaId, status, departamento } = req.query;
    const filtro = { empresaId };
    if (status) filtro.status = status;
    if (departamento) filtro.departamento = departamento;
    const vagas = await Vaga.find(filtro).sort({ dataAbertura: -1 });
    res.json({ sucesso: true, dados: vagas });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/vagas', async (req, res) => {
  try {
    const vaga = await Vaga.create({ ...req.body, vagasDisponiveis: req.body.vagasDisponiveis || req.body.vagasDisponiveis });
    res.status(201).json({ sucesso: true, dados: vaga });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.get('/vagas/:id', async (req, res) => {
  try {
    const vaga = await Vaga.findById(req.params.id);
    if (!vaga) return res.status(404).json({ sucesso: false, mensagem: 'Vaga não encontrada' });
    res.json({ sucesso: true, dados: vaga });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/vagas/:id', async (req, res) => {
  try {
    const vaga = await Vaga.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: vaga });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/vagas/:id', async (req, res) => {
  try {
    await Vaga.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Vaga removida' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Candidaturas
router.get('/candidaturas', async (req, res) => {
  try {
    const { empresaId, vagaId, status } = req.query;
    const filtro = { empresaId };
    if (vagaId) filtro.vagaId = vagaId;
    if (status) filtro.status = status;
    const candidaturas = await Candidatura.find(filtro).sort({ dataCandidatura: -1 });
    res.json({ sucesso: true, dados: candidaturas });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/candidaturas', async (req, res) => {
  try {
    const candidatura = await Candidatura.create(req.body);
    if (candidatura.vagaId) {
      await Vaga.findByIdAndUpdate(candidatura.vagaId, { $push: { candidatos: candidatura._id } });
    }
    res.status(201).json({ sucesso: true, dados: candidatura });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/candidaturas/:id', async (req, res) => {
  try {
    const candidatura = await Candidatura.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: candidatura });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/candidaturas/:id', async (req, res) => {
  try {
    await Candidatura.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Candidatura removida' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Entrevistas
router.get('/entrevistas', async (req, res) => {
  try {
    const { empresaId, candidaturaId } = req.query;
    const filtro = { empresaId };
    if (candidaturaId) filtro.candidaturaId = candidaturaId;
    const entrevistas = await Entrevista.find(filtro).sort({ data: -1 });
    res.json({ sucesso: true, dados: entrevistas });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/entrevistas', async (req, res) => {
  try {
    const entrevista = await Entrevista.create(req.body);
    res.status(201).json({ sucesso: true, dados: entrevista });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/entrevistas/:id', async (req, res) => {
  try {
    const entrevista = await Entrevista.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: entrevista });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/entrevistas/:id', async (req, res) => {
  try {
    await Entrevista.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Entrevista removida' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Banco de Talentos
router.get('/talentos', async (req, res) => {
  try {
    const { empresaId, status, cargo } = req.query;
    const filtro = { empresaId };
    if (status) filtro.status = status;
    if (cargo) filtro.cargo = { $regex: cargo, $options: 'i' };
    const talentos = await Talento.find(filtro).sort({ createdAt: -1 });
    res.json({ sucesso: true, dados: talentos });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/talentos', async (req, res) => {
  try {
    const talento = await Talento.create(req.body);
    res.status(201).json({ sucesso: true, dados: talento });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/talentos/:id', async (req, res) => {
  try {
    const talento = await Talento.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: talento });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/talentos/:id', async (req, res) => {
  try {
    await Talento.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Registo removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 2. FORMAÇÃO E DESENVOLVIMENTO
// ============================================

router.get('/cursos', async (req, res) => {
  try {
    const { empresaId, status, categoria } = req.query;
    const filtro = { empresaId };
    if (status) filtro.status = status;
    if (categoria) filtro.categoria = categoria;
    const cursos = await Curso.find(filtro).sort({ dataInicio: -1 });
    res.json({ sucesso: true, dados: cursos });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/cursos', async (req, res) => {
  try {
    const curso = await Curso.create({ ...req.body, vagasDisponiveis: req.body.vagas });
    res.status(201).json({ sucesso: true, dados: curso });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/cursos/:id', async (req, res) => {
  try {
    const curso = await Curso.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: curso });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/cursos/:id', async (req, res) => {
  try {
    await Curso.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Curso removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Inscrições em Cursos
router.get('/inscricoes', async (req, res) => {
  try {
    const { empresaId, cursoId, funcionarioId, status } = req.query;
    const filtro = { empresaId };
    if (cursoId) filtro.cursoId = cursoId;
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    if (status) filtro.status = status;
    const inscricoes = await Inscricao.find(filtro).sort({ dataInscricao: -1 });
    res.json({ sucesso: true, dados: inscricoes });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/inscricoes', async (req, res) => {
  try {
    const inscricao = await Inscricao.create(req.body);
    await Curso.findByIdAndUpdate(req.body.cursoId, { $inc: { vagasDisponiveis: -1 } });
    res.status(201).json({ sucesso: true, dados: inscricao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/inscricoes/:id', async (req, res) => {
  try {
    const inscricao = await Inscricao.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: inscricao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/inscricoes/:id', async (req, res) => {
  try {
    await Inscricao.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Inscrição removida' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Certificações
router.get('/certificacoes', async (req, res) => {
  try {
    const { empresaId, funcionarioId } = req.query;
    const filtro = { empresaId };
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    const certificacoes = await Certificacao.find(filtro).sort({ dataObtencao: -1 });
    res.json({ sucesso: true, dados: certificacoes });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/certificacoes', async (req, res) => {
  try {
    const cert = await Certificacao.create(req.body);
    res.status(201).json({ sucesso: true, dados: cert });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/certificacoes/:id', async (req, res) => {
  try {
    const cert = await Certificacao.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: cert });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/certificacoes/:id', async (req, res) => {
  try {
    await Certificacao.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Certificação removida' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 3. FÉRIAS E LICENÇAS
// ============================================

router.get('/ferias-licencas', async (req, res) => {
  try {
    const { empresaId, funcionarioId, status, tipo, ano } = req.query;
    const filtro = { empresaId };
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    if (status) filtro.status = status;
    if (tipo) filtro.tipo = tipo;
    if (ano) {
      const anoNum = parseInt(ano);
      filtro.dataInicio = { $gte: new Date(anoNum, 0, 1), $lte: new Date(anoNum, 11, 31) };
    }
    const ferias = await FeriasLicenca.find(filtro).sort({ dataInicio: -1 });
    res.json({ sucesso: true, dados: ferias });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/ferias-licencas', async (req, res) => {
  try {
    const dias = Math.ceil((new Date(req.body.dataFim) - new Date(req.body.dataInicio)) / (1000 * 60 * 60 * 24)) + 1;
    const registro = await FeriasLicenca.create({ ...req.body, diasSolicitados: req.body.diasSolicitados || dias });
    res.status(201).json({ sucesso: true, dados: registro });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/ferias-licencas/:id', async (req, res) => {
  try {
    const registro = await FeriasLicenca.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: registro });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/ferias-licencas/:id', async (req, res) => {
  try {
    await FeriasLicenca.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Registo removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.get('/ferias-licencas/saldo/:funcionarioId', async (req, res) => {
  try {
    const ferias = await FeriasLicenca.find({
      funcionarioId: req.params.funcionarioId,
      tipo: 'Ferias',
      status: { $in: ['Aprovado', 'Gozando', 'Concluido'] }
    });
    const diasGozados = ferias.reduce((acc, f) => acc + (f.diasSolicitados || 0), 0);
    const saldo = 22 - diasGozados;
    res.json({ sucesso: true, dados: { diasGozados, saldo, totalDias: 22 } });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 4. CARREIRA E PROMOÇÕES
// ============================================

router.get('/cargos', async (req, res) => {
  try {
    const { empresaId, departamento } = req.query;
    const filtro = { empresaId };
    if (departamento) filtro.departamento = departamento;
    const cargos = await CargoHierarquia.find(filtro).sort({ nivel: 1 });
    res.json({ sucesso: true, dados: cargos });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/cargos', async (req, res) => {
  try {
    const cargo = await CargoHierarquia.create(req.body);
    res.status(201).json({ sucesso: true, dados: cargo });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/cargos/:id', async (req, res) => {
  try {
    const cargo = await CargoHierarquia.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: cargo });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/cargos/:id', async (req, res) => {
  try {
    await CargoHierarquia.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Cargo removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.get('/promocoes', async (req, res) => {
  try {
    const { empresaId, funcionarioId, status } = req.query;
    const filtro = { empresaId };
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    if (status) filtro.status = status;
    const promocoes = await Promocao.find(filtro).sort({ dataPromocao: -1 });
    res.json({ sucesso: true, dados: promocoes });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/promocoes', async (req, res) => {
  try {
    const promocao = await Promocao.create(req.body);
    if (promocao.status === 'Efetivada') {
      const updates = {};
      if (req.body.cargoNovo) updates.funcao = req.body.cargoNovo;
      if (req.body.salarioNovo) updates.salarioBase = req.body.salarioNovo;
      if (req.body.departamentoNovo) updates.departamento = req.body.departamentoNovo;
      if (Object.keys(updates).length > 0) {
        await mongoose.model('Funcionario').findByIdAndUpdate(req.body.funcionarioId, updates);
      }
    }
    res.status(201).json({ sucesso: true, dados: promocao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/promocoes/:id', async (req, res) => {
  try {
    const promocao = await Promocao.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: promocao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/promocoes/:id', async (req, res) => {
  try {
    await Promocao.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Registo removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Sucessão
router.get('/sucessoes', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const sucessoes = await Sucessao.find({ empresaId }).populate('funcionarioAtual').populate('sucessores.funcionarioId');
    res.json({ sucesso: true, dados: sucessoes });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/sucessoes', async (req, res) => {
  try {
    const sucessao = await Sucessao.create(req.body);
    res.status(201).json({ sucesso: true, dados: sucessao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/sucessoes/:id', async (req, res) => {
  try {
    const sucessao = await Sucessao.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: sucessao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/sucessoes/:id', async (req, res) => {
  try {
    await Sucessao.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Registo removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 5. GESTÃO DISCIPLINAR
// ============================================

router.get('/disciplinar', async (req, res) => {
  try {
    const { empresaId, funcionarioId, status, tipo } = req.query;
    const filtro = { empresaId };
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    if (status) filtro.status = status;
    if (tipo) filtro.tipo = tipo;
    const registos = await Disciplinar.find(filtro).sort({ dataOcorrencia: -1 });
    res.json({ sucesso: true, dados: registos });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/disciplinar', async (req, res) => {
  try {
    const registro = await Disciplinar.create(req.body);
    res.status(201).json({ sucesso: true, dados: registro });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/disciplinar/:id', async (req, res) => {
  try {
    const registro = await Disciplinar.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: registro });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/disciplinar/:id', async (req, res) => {
  try {
    await Disciplinar.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Registo removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 6. COMPETÊNCIAS
// ============================================

router.get('/competencias', async (req, res) => {
  try {
    const { empresaId, categoria } = req.query;
    const filtro = { empresaId };
    if (categoria) filtro.categoria = categoria;
    const competencias = await Competencia.find(filtro).sort({ nome: 1 });
    res.json({ sucesso: true, dados: competencias });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/competencias', async (req, res) => {
  try {
    const competencia = await Competencia.create(req.body);
    res.status(201).json({ sucesso: true, dados: competencia });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/competencias/:id', async (req, res) => {
  try {
    const competencia = await Competencia.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: competencia });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/competencias/:id', async (req, res) => {
  try {
    await Competencia.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Competência removida' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// Mapeamento Competências x Funcionários
router.get('/competencias-funcionarios', async (req, res) => {
  try {
    const { empresaId, funcionarioId, competenciaId } = req.query;
    const filtro = { empresaId };
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    if (competenciaId) filtro.competenciaId = competenciaId;
    const mapas = await CompetenciaFuncionario.find(filtro).populate('competenciaId');
    res.json({ sucesso: true, dados: mapas });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/competencias-funcionarios', async (req, res) => {
  try {
    const mapa = await CompetenciaFuncionario.create(req.body);
    res.status(201).json({ sucesso: true, dados: mapa });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ sucesso: false, mensagem: 'Competência já associada a este funcionário' });
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/competencias-funcionarios/:id', async (req, res) => {
  try {
    const mapa = await CompetenciaFuncionario.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: mapa });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/competencias-funcionarios/:id', async (req, res) => {
  try {
    await CompetenciaFuncionario.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Associação removida' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 7. SAÚDE E SEGURANÇA NO TRABALHO
// ============================================

router.get('/exames-medicos', async (req, res) => {
  try {
    const { empresaId, funcionarioId } = req.query;
    const filtro = { empresaId };
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    const exames = await ExameMedico.find(filtro).sort({ dataRealizacao: -1 });
    res.json({ sucesso: true, dados: exames });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/exames-medicos', async (req, res) => {
  try {
    const exame = await ExameMedico.create(req.body);
    res.status(201).json({ sucesso: true, dados: exame });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/exames-medicos/:id', async (req, res) => {
  try {
    const exame = await ExameMedico.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: exame });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/exames-medicos/:id', async (req, res) => {
  try {
    await ExameMedico.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Exame removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.get('/acidentes-trabalho', async (req, res) => {
  try {
    const { empresaId, funcionarioId, status } = req.query;
    const filtro = { empresaId };
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    if (status) filtro.status = status;
    const acidentes = await AcidenteTrabalho.find(filtro).sort({ data: -1 });
    res.json({ sucesso: true, dados: acidentes });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/acidentes-trabalho', async (req, res) => {
  try {
    const acidente = await AcidenteTrabalho.create(req.body);
    res.status(201).json({ sucesso: true, dados: acidente });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/acidentes-trabalho/:id', async (req, res) => {
  try {
    const acidente = await AcidenteTrabalho.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: acidente });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/acidentes-trabalho/:id', async (req, res) => {
  try {
    await AcidenteTrabalho.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Registo removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.get('/epi', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const epis = await EPI.find({ empresaId }).sort({ nome: 1 });
    res.json({ sucesso: true, dados: epis });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/epi', async (req, res) => {
  try {
    const epi = await EPI.create(req.body);
    res.status(201).json({ sucesso: true, dados: epi });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/epi/:id', async (req, res) => {
  try {
    const epi = await EPI.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: epi });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/epi/:id', async (req, res) => {
  try {
    await EPI.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'EPI removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.get('/epi-entregas', async (req, res) => {
  try {
    const { empresaId, funcionarioId } = req.query;
    const filtro = { empresaId };
    if (funcionarioId) filtro.funcionarioId = funcionarioId;
    const entregas = await EPIEntrega.find(filtro).sort({ dataEntrega: -1 });
    res.json({ sucesso: true, dados: entregas });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/epi-entregas', async (req, res) => {
  try {
    const entrega = await EPIEntrega.create(req.body);
    await EPI.findByIdAndUpdate(req.body.epiId, { $inc: { quantidade: -req.body.quantidade } });
    res.status(201).json({ sucesso: true, dados: entrega });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/epi-entregas/:id', async (req, res) => {
  try {
    const entrega = await EPIEntrega.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: entrega });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/epi-entregas/:id', async (req, res) => {
  try {
    await EPIEntrega.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Entrega removida' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 8. WORKFLOW DE APROVAÇÕES
// ============================================

router.get('/workflows', async (req, res) => {
  try {
    const { empresaId, modulo } = req.query;
    const filtro = { empresaId };
    if (modulo) filtro.modulo = modulo;
    const workflows = await Workflow.find(filtro).sort({ nome: 1 });
    res.json({ sucesso: true, dados: workflows });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/workflows', async (req, res) => {
  try {
    const workflow = await Workflow.create(req.body);
    res.status(201).json({ sucesso: true, dados: workflow });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/workflows/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: workflow });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.delete('/workflows/:id', async (req, res) => {
  try {
    await Workflow.findByIdAndDelete(req.params.id);
    res.json({ sucesso: true, mensagem: 'Workflow removido' });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.get('/aprovacoes', async (req, res) => {
  try {
    const { empresaId, status, tipo, solicitanteId } = req.query;
    const filtro = { empresaId };
    if (status) filtro.status = status;
    if (tipo) filtro.tipo = tipo;
    if (solicitanteId) filtro.solicitanteId = solicitanteId;
    const aprovacoes = await Aprovacao.find(filtro).sort({ createdAt: -1 });
    res.json({ sucesso: true, dados: aprovacoes });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/aprovacoes', async (req, res) => {
  try {
    const aprovacao = await Aprovacao.create(req.body);
    res.status(201).json({ sucesso: true, dados: aprovacao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.put('/aprovacoes/:id', async (req, res) => {
  try {
    const aprovacao = await Aprovacao.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ sucesso: true, dados: aprovacao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/aprovacoes/:id/aprovar', async (req, res) => {
  try {
    const { aprovadorNome, comentario } = req.body;
    const aprovacao = await Aprovacao.findById(req.params.id);
    if (!aprovacao) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrada' });

    aprovacao.historico.push({
      passo: aprovacao.passoAtual,
      aprovadorNome,
      decisao: 'Aprovado',
      comentario,
      data: new Date()
    });

    const workflow = await Workflow.findById(aprovacao.workflowId);
    if (workflow && aprovacao.passoAtual >= workflow.passos.length) {
      aprovacao.status = 'Aprovado';
    } else {
      aprovacao.passoAtual = (aprovacao.passoAtual || 0) + 1;
      aprovacao.status = 'EmAprovacao';
    }
    await aprovacao.save();
    res.json({ sucesso: true, dados: aprovacao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

router.post('/aprovacoes/:id/rejeitar', async (req, res) => {
  try {
    const { aprovadorNome, comentario } = req.body;
    const aprovacao = await Aprovacao.findById(req.params.id);
    if (!aprovacao) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrada' });

    aprovacao.historico.push({
      passo: aprovacao.passoAtual,
      aprovadorNome,
      decisao: 'Rejeitado',
      comentario,
      data: new Date()
    });
    aprovacao.status = 'Rejeitado';
    await aprovacao.save();
    res.json({ sucesso: true, dados: aprovacao });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

// ============================================
// 9. DASHBOARD EXECUTIVO RH
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    const { empresaId } = req.query;
    const Funcionario = mongoose.model('Funcionario');
    const FolhaSalarial = mongoose.model('FolhaSalarial');

    const totalFuncionarios = await Funcionario.countDocuments({ empresaId, status: 'Ativo' });
    const totalInativos = await Funcionario.countDocuments({ empresaId, status: { $in: ['Inativo', 'Demitido'] } });
    const emFerias = await Funcionario.countDocuments({ empresaId, status: 'Ferias' });
    const emLicenca = await Funcionario.countDocuments({ empresaId, status: 'Licenca' });

    const folhaRecente = await FolhaSalarial.findOne({ empresaId }).sort({ createdAt: -1 });
    const custoSalarial = folhaRecente?.totais?.totalLiquido || 0;

    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();
    const faltasMes = await mongoose.model('Falta').countDocuments({
      empresaId,
      dataFalta: { $gte: new Date(anoAtual, mesAtual - 1, 1), $lte: new Date(anoAtual, mesAtual, 0) },
      status: 'Aprovado'
    });

    res.json({
      sucesso: true,
      dados: {
        totalFuncionarios,
        totalInativos,
        emFerias,
        emLicenca,
        custoSalarial,
        faltasMes,
        taxaAbsentismo: totalFuncionarios > 0 ? ((faltasMes / (totalFuncionarios * 22)) * 100).toFixed(2) : 0,
        turnover: totalFuncionarios > 0 ? ((totalInativos / totalFuncionarios) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
});

module.exports = router;
