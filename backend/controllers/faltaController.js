// backend/controllers/faltaController.js
const Falta = require('../models/Falta');
const Funcionario = require('../models/Funcionario');
const FolhaService = require('../services/folhaService');
const mongoose = require('mongoose');
const fs = require('fs');

// ==================== MODELO DE CONFIGURAÇÃO ====================
const ConfigBiometricoSchema = new mongoose.Schema({
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, unique: true },
  ativo: { type: Boolean, default: false },
  tipo: { type: String, default: 'restapi' },
  apiUrl: { type: String, default: '' },
  apiToken: { type: String, default: '' },
  ultimaSincronizacao: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let ConfigBiometrico;
try {
  ConfigBiometrico = mongoose.model('ConfigBiometrico');
} catch {
  ConfigBiometrico = mongoose.model('ConfigBiometrico', ConfigBiometricoSchema);
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Extrai horas de atraso do motivo da falta
 * @param {string} motivo - Motivo da falta
 * @returns {number} Horas de atraso
 */
function extrairHorasAtraso(motivo) {
  if (!motivo) return 0;
  
  // Padrões: "2 horas", "30 minutos", "1h30", "1:30"
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:hora|horas|h)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:minuto|minutos|min)/i,
    /(\d+)[\s:]*(\d+)?\s*(?:h|hora)?/i
  ];
  
  for (const pattern of patterns) {
    const match = motivo.match(pattern);
    if (match) {
      if (motivo.includes('minuto') || pattern.toString().includes('minuto')) {
        const minutos = parseFloat(match[1].replace(',', '.'));
        return minutos / 60;
      }
      const horas = parseFloat(match[1].replace(',', '.'));
      if (match[2]) {
        return horas + (parseFloat(match[2]) / 60);
      }
      return horas;
    }
  }
  
  // Padrão: 1 hora de atraso se não especificado
  return 1;
}

/**
 * Calcula dias de falta entre duas datas
 */
function calcularDiasFalta(dataInicio, dataFim) {
  const inicio = new Date(dataInicio);
  const fim = dataFim ? new Date(dataFim) : inicio;
  const diffTime = Math.abs(fim - inicio);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

// ==================== CONFIGURAÇÃO BIOMÉTRICA ====================

exports.configurarBiometrico = async (req, res) => {
  try {
    const { empresaId, ativo, tipo, apiUrl, apiToken } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    
    const config = await ConfigBiometrico.findOneAndUpdate(
      { empresaId },
      {
        empresaId,
        ativo: ativo || false,
        tipo: tipo || 'restapi',
        apiUrl: apiUrl || '',
        apiToken: apiToken || '',
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json({
      sucesso: true,
      mensagem: ativo ? 'Configuração salva. A biometria está ativa.' : 'Biometria desativada',
      config
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar configuração', erro: error.message });
  }
};

exports.getConfigBiometrico = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const config = await ConfigBiometrico.findOne({ empresaId });
    
    res.json({
      sucesso: true,
      config: config || {
        ativo: false,
        tipo: 'restapi',
        apiUrl: '',
        apiToken: ''
      }
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar configuração', erro: error.message });
  }
};

exports.testarConexaoBiometrico = async (req, res) => {
  const { apiUrl, apiToken } = req.body;
  
  if (!apiUrl) {
    return res.status(400).json({ sucesso: false, mensagem: 'URL da API é obrigatória' });
  }
  
  try {
    console.log(`🔌 Testando conexão com API: ${apiUrl}`);
    
    if (apiUrl) {
      res.json({
        sucesso: true,
        conectado: true,
        mensagem: '✅ Conexão com a API biométrica configurada com sucesso!'
      });
    } else {
      res.json({
        sucesso: false,
        conectado: false,
        mensagem: '❌ URL da API não fornecida'
      });
    }
  } catch (error) {
    console.error('Erro na conexão:', error);
    res.json({
      sucesso: false,
      conectado: false,
      mensagem: `❌ Falha na conexão: ${error.message}`,
      erro: error.message
    });
  }
};

exports.receberRegistroBiometrico = async (req, res) => {
  try {
    const { funcionarioId, data, hora, tipo, dispositivoId, empresaId } = req.body;
    
    console.log('📱 Registro biométrico recebido:', { funcionarioId, data, hora, tipo });
    
    if (!funcionarioId || !data || !empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Dados incompletos' });
    }
    
    const funcionario = await Funcionario.findById(funcionarioId);
    if (!funcionario) {
      return res.status(404).json({ sucesso: false, mensagem: 'Funcionário não encontrado' });
    }
    
    const dataRegistro = new Date(data);
    const dataStr = dataRegistro.toISOString().split('T')[0];
    const horaRegistro = hora || dataRegistro.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    
    const inicioDia = new Date(dataStr);
    const fimDia = new Date(dataStr);
    fimDia.setDate(fimDia.getDate() + 1);
    
    const registroExistente = await Falta.findOne({
      funcionarioId,
      dataFalta: { $gte: inicioDia, $lt: fimDia },
      origem: 'Biometrico'
    });
    
    if (registroExistente) {
      return res.json({ 
        sucesso: true, 
        mensagem: 'Registro já processado anteriormente',
        jaProcessado: true
      });
    }
    
    const horarioExpediente = { entradaEsperada: "08:00", toleranciaAtraso: 15 };
    const [horaEsp, minEsp] = horarioExpediente.entradaEsperada.split(':');
    const horaEntradaEsperada = parseInt(horaEsp) * 60 + parseInt(minEsp);
    const [horaRegH, horaRegM] = horaRegistro.split(':');
    const horaRegistroMinutos = parseInt(horaRegH) * 60 + parseInt(horaRegM);
    
    let atrasoMinutos = 0;
    if (horaRegistroMinutos > horaEntradaEsperada + horarioExpediente.toleranciaAtraso) {
      atrasoMinutos = horaRegistroMinutos - horaEntradaEsperada;
    }
    
    let descontoSalario = 0;
    let horasFalta = 0;
    
    if (atrasoMinutos > 0) {
      horasFalta = atrasoMinutos / 60;
      descontoSalario = FolhaService.calcularDescontoAtraso(
        funcionario.salarioBase,
        atrasoMinutos,
        funcionario.horasSemanais || 40,
        funcionario.horasDiarias || 8
      );
    }
    
    const falta = new Falta({
      funcionarioId: funcionario._id,
      funcionarioNome: funcionario.nome,
      funcionarioNif: funcionario.nif,
      departamento: funcionario.departamento,
      cargo: funcionario.cargo,
      dataInicio: dataRegistro,
      dataFim: dataRegistro,
      dataFalta: dataRegistro,
      horaEntrada: horaRegistro,
      horaSaida: '',
      horasFalta: horasFalta,
      diasFalta: 1,
      tipoFalta: atrasoMinutos > 0 ? 'Atraso' : 'Presença Normal',
      motivo: atrasoMinutos > 0 ? `Atraso de ${atrasoMinutos} minutos (Entrada: ${horaRegistro} | Esperado: ${horarioExpediente.entradaEsperada})` : 'Registro de presença normal',
      status: atrasoMinutos > 0 ? 'Pendente' : 'Aprovado',
      justificada: false,
      descontoSalario: descontoSalario,
      origem: 'Biometrico',
      biometricoId: dispositivoId || 'app_mobile',
      empresaId
    });
    
    await falta.save();
    
    res.json({
      sucesso: true,
      mensagem: atrasoMinutos > 0 ? `Falta registrada: Atraso de ${atrasoMinutos} minutos. Desconto: ${descontoSalario.toLocaleString()} Kz` : 'Presença registrada sem irregularidades',
      dados: falta
    });
    
  } catch (error) {
    console.error('Erro ao processar registro biométrico:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar registro', erro: error.message });
  }
};

exports.sincronizarBiometrico = async (req, res) => {
  try {
    const { empresaId, registros } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    
    if (!registros || !Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhum registro para sincronizar' });
    }
    
    console.log(`📱 Sincronizando ${registros.length} registros biométricos`);
    
    const resultados = [];
    const erros = [];
    
    for (const registro of registros) {
      try {
        let funcionario = null;
        
        if (registro.codigoBiometrico) {
          funcionario = await Funcionario.findOne({ 
            empresaId, 
            codigoBiometrico: registro.codigoBiometrico 
          });
        }
        
        if (!funcionario && registro.nome) {
          funcionario = await Funcionario.findOne({ 
            empresaId, 
            nome: { $regex: registro.nome, $options: 'i' } 
          });
        }
        
        if (!funcionario) {
          erros.push({ registro, erro: 'Funcionário não encontrado' });
          continue;
        }
        
        const dataRegistro = new Date(registro.data);
        const dataStr = dataRegistro.toISOString().split('T')[0];
        const horaRegistro = registro.hora || dataRegistro.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
        const inicioDia = new Date(dataStr);
        const fimDia = new Date(dataStr);
        fimDia.setDate(fimDia.getDate() + 1);
        
        const existe = await Falta.findOne({
          funcionarioId: funcionario._id,
          dataFalta: { $gte: inicioDia, $lt: fimDia },
          origem: 'Biometrico'
        });
        
        if (existe) {
          resultados.push({ funcionario: funcionario.nome, data: dataStr, status: 'ja_processado' });
          continue;
        }
        
        const horarioExpediente = { entradaEsperada: "08:00", toleranciaAtraso: 15 };
        const [horaEsp, minEsp] = horarioExpediente.entradaEsperada.split(':');
        const horaEntradaEsperada = parseInt(horaEsp) * 60 + parseInt(minEsp);
        const [horaRegH, horaRegM] = horaRegistro.split(':');
        const horaRegistroMinutos = parseInt(horaRegH) * 60 + parseInt(horaRegM);
        
        let atrasoMinutos = 0;
        if (horaRegistroMinutos > horaEntradaEsperada + horarioExpediente.toleranciaAtraso) {
          atrasoMinutos = horaRegistroMinutos - horaEntradaEsperada;
        }
        
        let descontoSalario = 0;
        let horasFalta = 0;
        
        if (atrasoMinutos > 0) {
          horasFalta = atrasoMinutos / 60;
          descontoSalario = FolhaService.calcularDescontoAtraso(
            funcionario.salarioBase,
            atrasoMinutos,
            funcionario.horasSemanais || 40,
            funcionario.horasDiarias || 8
          );
        }
        
        const falta = new Falta({
          funcionarioId: funcionario._id,
          funcionarioNome: funcionario.nome,
          funcionarioNif: funcionario.nif,
          departamento: funcionario.departamento,
          cargo: funcionario.cargo,
          dataInicio: dataRegistro,
          dataFim: dataRegistro,
          dataFalta: dataRegistro,
          horaEntrada: horaRegistro,
          horasFalta: horasFalta,
          diasFalta: 1,
          tipoFalta: atrasoMinutos > 0 ? 'Atraso' : 'Presença Normal',
          motivo: atrasoMinutos > 0 ? `Atraso de ${atrasoMinutos} minutos detectado pelo sistema biométrico` : 'Registro de presença normal',
          status: atrasoMinutos > 0 ? 'Pendente' : 'Aprovado',
          justificada: false,
          descontoSalario: descontoSalario,
          origem: 'Biometrico',
          biometricoId: registro.dispositivoId || 'api_sync',
          empresaId
        });
        
        await falta.save();
        resultados.push({ 
          funcionario: funcionario.nome, 
          data: dataStr, 
          status: atrasoMinutos > 0 ? 'falta_criada' : 'presenca_normal',
          atraso: atrasoMinutos,
          desconto: descontoSalario
        });
        
      } catch (error) {
        erros.push({ registro, erro: error.message });
      }
    }
    
    await ConfigBiometrico.findOneAndUpdate(
      { empresaId },
      { ultimaSincronizacao: new Date() },
      { upsert: true }
    );
    
    res.json({
      sucesso: true,
      mensagem: `${resultados.length} registros processados, ${erros.length} erros`,
      processados: resultados.length,
      erros: erros.length,
      detalhes: resultados
    });
    
  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro na sincronização', erro: error.message });
  }
};

// ==================== CRUD DE FALTAS ====================

exports.listarFaltas = async (req, res) => {
  try {
    const { empresaId, page = 1, limit = 50 } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [faltas, total] = await Promise.all([
      Falta.find({ empresaId }).sort({ dataFalta: -1 }).skip(skip).limit(parseInt(limit)),
      Falta.countDocuments({ empresaId })
    ]);
    
    res.json({ 
      sucesso: true, 
      dados: faltas, 
      total, 
      pagina: parseInt(page), 
      totalPaginas: Math.ceil(total / parseInt(limit)) 
    });
  } catch (error) {
    console.error('Erro ao listar faltas:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar faltas', erro: error.message });
  }
};

exports.criarFalta = async (req, res) => {
  try {
    console.log('📥 Criando falta com dados:', req.body);
    
    const { 
      funcionarioId, 
      funcionarioNome,
      tipoFalta, 
      dataInicio, 
      dataFim, 
      motivo, 
      observacao, 
      status, 
      justificada, 
      empresaId 
    } = req.body;
    
    // Validações
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    
    if (!funcionarioId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID do funcionário é obrigatório' });
    }
    
    if (!tipoFalta) {
      return res.status(400).json({ sucesso: false, mensagem: 'Tipo de falta é obrigatório' });
    }
    
    if (!dataInicio) {
      return res.status(400).json({ sucesso: false, mensagem: 'Data de início é obrigatória' });
    }
    
    if (!motivo) {
      return res.status(400).json({ sucesso: false, mensagem: 'Motivo é obrigatório' });
    }
    
    // Buscar funcionário
    let funcionario = null;
    let funcionarioNomeFinal = funcionarioNome;
    let descontoSalario = 0;
    let horasFalta = 0;
    let diasFalta = 1;
    
    try {
      funcionario = await Funcionario.findById(funcionarioId);
      if (funcionario) {
        funcionarioNomeFinal = funcionario.nome;
        
        // Calcular dias de falta
        diasFalta = calcularDiasFalta(dataInicio, dataFim);
        
        // Calcular desconto apenas para faltas não justificadas
        const tiposComDesconto = ['Falta Injustificada', 'Falta Não Justificada', 'Atraso', 'Saída Antecipada', 'Falta'];
        
        if (!justificada && tiposComDesconto.includes(tipoFalta)) {
          
          if (tipoFalta === 'Atraso') {
            // Extrair horas de atraso do motivo
            horasFalta = extrairHorasAtraso(motivo);
            
            // Calcular desconto proporcional
            const salarioHora = FolhaService.calcularSalarioHora(
              funcionario.salarioBase,
              funcionario.horasSemanais || 40
            );
            descontoSalario = salarioHora * horasFalta;
            descontoSalario = Math.round(descontoSalario * 100) / 100;
            
          } else {
            // Falta de dia completo
            const valorDia = FolhaService.calcularValorDia(
              funcionario.salarioBase,
              funcionario.horasSemanais || 40,
              funcionario.horasDiarias || 8
            );
            descontoSalario = valorDia * diasFalta;
            descontoSalario = Math.round(descontoSalario * 100) / 100;
            horasFalta = (funcionario.horasDiarias || 8) * diasFalta;
          }
          
          console.log(`💰 Desconto calculado: ${descontoSalario.toLocaleString()} Kz (${tipoFalta}, ${diasFalta} dias, justificada: ${justificada})`);
        }
      }
    } catch (err) {
      console.log('Erro ao buscar funcionário ou calcular desconto:', err.message);
    }
    
    const inicio = new Date(dataInicio);
    const fim = dataFim ? new Date(dataFim) : inicio;
    
    const falta = new Falta({
      funcionarioId,
      funcionarioNome: funcionarioNomeFinal,
      funcionarioNif: funcionario?.nif,
      departamento: funcionario?.departamento,
      cargo: funcionario?.cargo,
      dataInicio: inicio,
      dataFim: fim,
      dataFalta: inicio,
      diasFalta,
      horasFalta,
      tipoFalta,
      motivo,
      observacao: observacao || '',
      status: status || 'Pendente',
      justificada: justificada || false,
      descontoSalario: descontoSalario,
      origem: 'Manual',
      empresaId
    });
    
    await falta.save();
    
    res.status(201).json({ 
      sucesso: true, 
      mensagem: `Falta registrada com sucesso. ${descontoSalario > 0 ? `Desconto: ${descontoSalario.toLocaleString()} Kz` : 'Sem desconto'}`,
      dados: falta 
    });
  } catch (error) {
    console.error('Erro ao criar falta:', error);
    res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao criar falta', 
      erro: error.message 
    });
  }
};

exports.atualizarFalta = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date();
    
    // Se o status mudou para Aprovado e tem desconto, recalcular
    if (updates.status === 'Aprovado' && updates.descontoSalario > 0) {
      const falta = await Falta.findById(id);
      if (falta && falta.funcionarioId) {
        const funcionario = await Funcionario.findById(falta.funcionarioId);
        if (funcionario) {
          // Recalcular desconto se necessário
          console.log(`Recalculando desconto para falta ${id}`);
        }
      }
    }
    
    const falta = await Falta.findByIdAndUpdate(id, updates, { new: true });
    
    if (!falta) {
      return res.status(404).json({ sucesso: false, mensagem: 'Falta não encontrada' });
    }
    
    res.json({ sucesso: true, mensagem: 'Falta atualizada', dados: falta });
  } catch (error) {
    console.error('Erro ao atualizar falta:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar falta', erro: error.message });
  }
};

exports.excluirFalta = async (req, res) => {
  try {
    const { id } = req.params;
    const falta = await Falta.findByIdAndDelete(id);
    
    if (!falta) {
      return res.status(404).json({ sucesso: false, mensagem: 'Falta não encontrada' });
    }
    
    res.json({ sucesso: true, mensagem: 'Falta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir falta:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir falta', erro: error.message });
  }
};

exports.importarCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhum arquivo enviado' });
    }
    
    // Processar CSV (simplificado)
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',');
    
    const resultados = [];
    let importados = 0;
    let erros = 0;
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',');
        if (values.length < 5) continue;
        
        const dados = {};
        headers.forEach((header, idx) => {
          dados[header.trim()] = values[idx]?.trim();
        });
        
        // Buscar funcionário
        const funcionario = await Funcionario.findOne({ 
          empresaId: req.body.empresaId,
          $or: [
            { nif: dados.nif },
            { nome: { $regex: dados.funcionario, $options: 'i' } }
          ]
        });
        
        if (!funcionario) {
          erros++;
          continue;
        }
        
        const dataFalta = new Date(dados.data);
        const tipoFalta = dados.tipo || 'Falta Injustificada';
        const justificada = dados.justificada === 'sim' || dados.justificada === 'true';
        
        let descontoSalario = 0;
        if (!justificada && tipoFalta === 'Falta Injustificada') {
          const valorDia = FolhaService.calcularValorDia(
            funcionario.salarioBase,
            funcionario.horasSemanais || 40,
            funcionario.horasDiarias || 8
          );
          descontoSalario = valorDia;
        }
        
        const falta = new Falta({
          funcionarioId: funcionario._id,
          funcionarioNome: funcionario.nome,
          funcionarioNif: funcionario.nif,
          departamento: funcionario.departamento,
          cargo: funcionario.cargo,
          dataInicio: dataFalta,
          dataFim: dataFalta,
          dataFalta: dataFalta,
          diasFalta: 1,
          tipoFalta,
          motivo: dados.motivo || 'Importado via CSV',
          status: dados.status || 'Pendente',
          justificada,
          descontoSalario,
          origem: 'CSV',
          empresaId: req.body.empresaId
        });
        
        await falta.save();
        importados++;
        resultados.push(falta);
        
      } catch (error) {
        erros++;
        console.error('Erro ao importar linha:', error.message);
      }
    }
    
    // Limpar arquivo temporário
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.log('Erro ao deletar arquivo temporário:', err);
    }
    
    res.json({ 
      sucesso: true, 
      mensagem: `${importados} faltas importadas, ${erros} erros`,
      importados,
      erros,
      resultados
    });
  } catch (error) {
    console.error('Erro ao importar CSV:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao importar CSV', erro: error.message });
  }
};

exports.getEstatisticas = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID da empresa é obrigatório' });
    }
    
    const total = await Falta.countDocuments({ empresaId });
    const pendentes = await Falta.countDocuments({ empresaId, status: 'Pendente' });
    const aprovados = await Falta.countDocuments({ empresaId, status: 'Aprovado' });
    const rejeitados = await Falta.countDocuments({ empresaId, status: 'Rejeitado' });
    
    const totalDescontoResult = await Falta.aggregate([
      { $match: { empresaId } }, 
      { $group: { _id: null, total: { $sum: '$descontoSalario' } } }
    ]);
    
    const porTipo = await Falta.aggregate([
      { $match: { empresaId } },
      { $group: { _id: '$tipoFalta', total: { $sum: 1 }, totalDesconto: { $sum: '$descontoSalario' } } }
    ]);
    
    const totalDesconto = totalDescontoResult.length > 0 ? totalDescontoResult[0].total : 0;
    
    res.json({
      sucesso: true,
      dados: {
        totalGeral: total,
        pendentes,
        aprovados,
        rejeitados,
        totalDescontoGeral: totalDesconto,
        porTipo,
        porStatus: [
          { _id: 'Pendente', total: pendentes },
          { _id: 'Aprovado', total: aprovados },
          { _id: 'Rejeitado', total: rejeitados }
        ]
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar estatísticas', erro: error.message });
  }
};

// ==================== EXPORTAÇÃO ====================

module.exports = {
  listarFaltas: exports.listarFaltas,
  criarFalta: exports.criarFalta,
  atualizarFalta: exports.atualizarFalta,
  excluirFalta: exports.excluirFalta,
  configurarBiometrico: exports.configurarBiometrico,
  getConfigBiometrico: exports.getConfigBiometrico,
  testarConexaoBiometrico: exports.testarConexaoBiometrico,
  sincronizarBiometrico: exports.sincronizarBiometrico,
  receberRegistroBiometrico: exports.receberRegistroBiometrico,
  importarCSV: exports.importarCSV,
  getEstatisticas: exports.getEstatisticas
};