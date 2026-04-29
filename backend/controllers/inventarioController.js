// controllers/inventarioController.js - Versão completa com associação à empresa

const Inventario = require('../models/Inventario');
const Stock = require('../models/Stock');
const Viatura = require('../models/Viatura');
const codificadorPGCA = require('../services/codificadorPGCA');
const mongoose = require('mongoose');
const crypto = require('crypto');

console.log('📦 Inventario Controller carregado');

// Criar novo item no inventário (com empresaId)
exports.criarItem = async (req, res) => {
  try {
    const { 
      empresaId, categoria, tipoAtivo, nome, valorUnitario, quantidade, 
      localizacao, fornecedor, observacoes, ...outros  // ← ALTERADO
    } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";

    // Validação do empresaId
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }

    if (!nome) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nome do item é obrigatório' });
    }
    if (!valorUnitario || valorUnitario <= 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Valor unitário deve ser maior que zero' });
    }
    
    const { codigo, codigoCompleto, classe } = await codificadorPGCA.gerarCodigo(categoria, tipoAtivo, nome);
    const quantidadeNum = parseInt(quantidade) || 1;
    const valorTotal = parseFloat(valorUnitario) * quantidadeNum;
    
    const novoItem = new Inventario({
      empresaId: new mongoose.Types.ObjectId(empresaId),
      codigo,
      codigoCompleto,
      classe: classe || (tipoAtivo === 'Imobilizado' ? '4' : '2'),
      tipoAtivo: tipoAtivo || 'Mercadoria',
      categoria: categoria || 'Outros',
      nome,
      quantidade: quantidadeNum,
      valorUnitario: parseFloat(valorUnitario),
      valorTotal,
      localizacao: localizacao || '',  // ← ALTERADO
      fornecedor: fornecedor || '',
      observacoes: observacoes || '',
      dataAquisicao: new Date(),
      estado: 'Ativo',
      criadoPor: usuario,
      ...outros
    });
    
    await novoItem.save();
    
    res.status(201).json({
      sucesso: true,
      mensagem: `Item "${nome}" adicionado ao inventário com código ${codigo}`,
      dados: novoItem
    });
    
  } catch (error) {
    console.error('Erro ao criar item:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Atualizar item
exports.atualizarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, localizacao, ...updates } = req.body;  // ← ALTERADO
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido' });
    }
    
    const itemExistente = await Inventario.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!itemExistente) {
      return res.status(404).json({ sucesso: false, mensagem: 'Item não encontrado' });
    }
    
    updates.updatedAt = new Date();
    updates.atualizadoPor = usuario;
    
    if (localizacao !== undefined) {
      updates.localizacao = localizacao;  // ← ALTERADO
    }
    
    if (updates.valorUnitario !== undefined || updates.quantidade !== undefined) {
      const valorUnitario = updates.valorUnitario !== undefined ? updates.valorUnitario : itemExistente.valorUnitario;
      const quantidade = updates.quantidade !== undefined ? updates.quantidade : itemExistente.quantidade;
      updates.valorTotal = parseFloat(valorUnitario) * parseInt(quantidade);
    }
    
    delete updates.codigo;
    delete updates.codigoCompleto;
    delete updates.empresaId;
    
    const itemAtualizado = await Inventario.findOneAndUpdate(
      { _id: id, empresaId: new mongoose.Types.ObjectId(empresaId) },
      { $set: updates },
      { new: true, runValidators: false }
    );
    
    res.json({
      sucesso: true,
      mensagem: 'Item atualizado com sucesso',
      dados: itemAtualizado
    });
    
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Importar de stock (com empresaId)
exports.importarDeStock = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const produtos = await Stock.find({ 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      ativo: true 
    });
    
    console.log(`📦 Encontrados ${produtos.length} produtos para importar`);
    
    let importados = 0;
    let erros = 0;
    let detalhes = [];
    
    for (const produto of produtos) {
      try {
        const existe = await Inventario.findOne({ 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          $or: [
            { nome: produto.produto },
            { 'dadosEspecificos.codigoBarras': produto.codigoBarras }
          ]
        });
        
        if (existe) {
          console.log(`⏭️ Produto "${produto.produto}" já existe no inventário`);
          detalhes.push({ produto: produto.produto, status: 'já existe' });
          continue;
        }
        
        const codigoInfo = await codificadorPGCA.gerarCodigo(
          'Produtos Alimentares', 
          'Mercadoria', 
          produto.produto,
          Inventario,
          empresaId
        );
        
        const novoItem = new Inventario({
          empresaId: new mongoose.Types.ObjectId(empresaId),
          codigo: codigoInfo.codigo,
          codigoCompleto: codigoInfo.codigoCompleto,
          classe: codigoInfo.classe,
          tipoAtivo: 'Mercadoria',
          categoria: 'Produtos Alimentares',
          nome: produto.produto,
          quantidade: produto.quantidade || 0,
          valorUnitario: produto.precoVenda || 0,
          valorTotal: (produto.quantidade || 0) * (produto.precoVenda || 0),
          dataAquisicao: new Date(),
          localizacao: produto.localizacao || '',  // ← ALTERADO
          fornecedor: produto.fornecedor || '',
          dadosEspecificos: {
            dataValidade: produto.dataValidade,
            codigoBarras: produto.codigoBarras,
            fornecedor: produto.fornecedor,
            localizacao: produto.localizacao
          },
          estado: 'Ativo',
          criadoPor: req.user?.nome || "Sistema - Importação"
        });
        
        await novoItem.save();
        importados++;
        detalhes.push({ 
          produto: produto.produto, 
          codigo: codigoInfo.codigo, 
          status: 'importado' 
        });
        console.log(`✅ Importado: ${produto.produto} - Código PGCA: ${codigoInfo.codigo}`);
        
      } catch (err) {
        erros++;
        detalhes.push({ 
          produto: produto.produto, 
          status: 'erro', 
          erro: err.message 
        });
        console.error(`❌ Erro ao importar ${produto.produto}:`, err.message);
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: `Importação concluída: ${importados} itens importados, ${erros} erros`,
      detalhes
    });
    
  } catch (error) {
    console.error('Erro ao importar de stock:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Importar de viaturas (com empresaId)
exports.importarDeViaturas = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const viaturas = await Viatura.find({ 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      ativo: true 
    });
    
    console.log(`📦 Encontradas ${viaturas.length} viaturas para importar`);
    
    let importados = 0;
    let erros = 0;
    let detalhes = [];
    
    for (const viatura of viaturas) {
      try {
        const nomeViatura = `${viatura.marca} ${viatura.modelo} - ${viatura.matricula}`;
        
        const existe = await Inventario.findOne({ 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          $or: [
            { nome: nomeViatura },
            { 'dadosEspecificos.matricula': viatura.matricula }
          ]
        });
        
        if (existe) {
          detalhes.push({ viatura: viatura.matricula, status: 'já existe' });
          continue;
        }
        
        const codigoInfo = await codificadorPGCA.gerarCodigo(
          'Viaturas Ligeiras', 
          'Imobilizado', 
          nomeViatura,
          Inventario,
          empresaId
        );
        
        const valorAquisicao = viatura.valorAquisicao || viatura.precoCompra || 0;
        
        const novoItem = new Inventario({
          empresaId: new mongoose.Types.ObjectId(empresaId),
          codigo: codigoInfo.codigo,
          codigoCompleto: codigoInfo.codigoCompleto,
          classe: codigoInfo.classe,
          tipoAtivo: 'Imobilizado',
          categoria: 'Viaturas',
          nome: nomeViatura,
          quantidade: 1,
          valorUnitario: valorAquisicao,
          valorTotal: valorAquisicao,
          dataAquisicao: viatura.dataAquisicao ? new Date(viatura.dataAquisicao) : new Date(),
          localizacao: viatura.localizacao || viatura.endereco || '',  // ← ALTERADO
          dadosEspecificos: {
            matricula: viatura.matricula,
            marca: viatura.marca,
            modelo: viatura.modelo,
            ano: viatura.ano,
            km: viatura.km || 0,
            combustivel: viatura.combustivel,
            motorista: viatura.motorista,
            cor: viatura.cor
          },
          estado: viatura.estado === 'Em uso' ? 'Ativo' : 'Em manutenção',
          criadoPor: req.user?.nome || "Sistema - Importação"
        });
        
        await novoItem.save();
        importados++;
        detalhes.push({ 
          viatura: viatura.matricula, 
          codigo: codigoInfo.codigo, 
          status: 'importado' 
        });
        console.log(`✅ Importada: ${nomeViatura} - Código PGCA: ${codigoInfo.codigo}`);
        
      } catch (err) {
        erros++;
        detalhes.push({ 
          viatura: viatura.matricula, 
          status: 'erro', 
          erro: err.message 
        });
        console.error(`❌ Erro ao importar ${viatura.matricula}:`, err.message);
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: `Importação concluída: ${importados} viaturas importadas, ${erros} erros`,
      detalhes
    });
    
  } catch (error) {
    console.error('Erro ao importar viaturas:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Listar inventário - atualizar para retornar localizacao
exports.listarInventario = async (req, res) => {
  try {
    const { empresaId, tipoAtivo, categoria, estado, busca, page = 1, limit = 50 } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const query = { empresaId: new mongoose.Types.ObjectId(empresaId) };
    
    if (tipoAtivo && tipoAtivo !== 'Todos') query.tipoAtivo = tipoAtivo;
    if (categoria && categoria !== 'Todas') query.categoria = categoria;
    if (estado && estado !== 'Todos') query.estado = estado;
    
    if (busca) {
      query.$or = [
        { nome: { $regex: busca, $options: 'i' } },
        { codigo: { $regex: busca, $options: 'i' } },
        { codigoCompleto: { $regex: busca, $options: 'i' } },
        { 'dadosEspecificos.matricula': { $regex: busca, $options: 'i' } },
        { fornecedor: { $regex: busca, $options: 'i' } },
        { localizacao: { $regex: busca, $options: 'i' } }  // ← ADICIONADO
      ];
    }
    
    const inventario = await Inventario.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    
    const total = await Inventario.countDocuments(query);
    
    res.json({
      sucesso: true,
      dados: inventario,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
    
  } catch (error) {
    console.error('Erro ao listar inventário:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Buscar item por ID
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido' });
    }
    
    const item = await Inventario.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!item) {
      return res.status(404).json({ sucesso: false, mensagem: 'Item não encontrado' });
    }
    
    res.json({ sucesso: true, dados: item });
    
  } catch (error) {
    console.error('Erro ao buscar item:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Atualizar item
exports.atualizarItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, ...updates } = req.body;
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido' });
    }
    
    const itemExistente = await Inventario.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!itemExistente) {
      return res.status(404).json({ sucesso: false, mensagem: 'Item não encontrado' });
    }
    
    updates.updatedAt = new Date();
    updates.atualizadoPor = usuario;
    
    if (updates.valorUnitario !== undefined || updates.quantidade !== undefined) {
      const valorUnitario = updates.valorUnitario !== undefined ? updates.valorUnitario : itemExistente.valorUnitario;
      const quantidade = updates.quantidade !== undefined ? updates.quantidade : itemExistente.quantidade;
      updates.valorTotal = parseFloat(valorUnitario) * parseInt(quantidade);
    }
    
    delete updates.codigo;
    delete updates.codigoCompleto;
    delete updates.empresaId;
    
    const itemAtualizado = await Inventario.findOneAndUpdate(
      { _id: id, empresaId: new mongoose.Types.ObjectId(empresaId) },
      { $set: updates },
      { new: true, runValidators: false }
    );
    
    res.json({
      sucesso: true,
      mensagem: 'Item atualizado com sucesso',
      dados: itemAtualizado
    });
    
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Soft Delete - Dar baixa
exports.excluirItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, motivo } = req.body || {};
    const usuario = req.user?.nome || req.user?.email || "Sistema";
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    console.log(`🔧 Dando baixa no item ID: ${id} da empresa ${empresaId}`);
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido' });
    }
    
    const item = await Inventario.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!item) {
      return res.status(404).json({ sucesso: false, mensagem: 'Item não encontrado' });
    }
    
    console.log(`📦 Item: ${item.nome}, Estado: ${item.estado}`);
    
    if (item.estado === 'Baixado') {
      return res.status(400).json({ 
        sucesso: false, 
        mensagem: `Item "${item.nome}" já está baixado` 
      });
    }
    
    item.estado = 'Baixado';
    item.dataBaixa = new Date();
    item.motivoBaixa = motivo || 'Baixa manual';
    item.atualizadoPor = usuario;
    item.updatedAt = new Date();
    
    await item.save();
    
    console.log(`✅ Item "${item.nome}" dado como baixa!`);
    
    res.json({
      sucesso: true,
      mensagem: `Item "${item.nome}" dado como baixa no inventário`,
      dados: item
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Hard Delete - Excluir permanentemente
exports.excluirPermanente = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    console.log(`🗑️ Excluindo permanentemente ID: ${id}`);
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido' });
    }
    
    const item = await Inventario.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!item) {
      return res.status(404).json({ sucesso: false, mensagem: 'Item não encontrado' });
    }
    
    await Inventario.findOneAndDelete({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    console.log(`✅ Item "${item.nome}" excluído permanentemente!`);
    
    res.json({
      sucesso: true,
      mensagem: `Item "${item.nome}" excluído permanentemente do sistema`,
      dados: { id: item._id, nome: item.nome, codigo: item.codigo }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Importar de stock (com empresaId)
exports.importarDeStock = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const produtos = await Stock.find({ 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      ativo: true 
    });
    
    console.log(`📦 Encontrados ${produtos.length} produtos para importar`);
    
    let importados = 0;
    let erros = 0;
    let detalhes = [];
    
    for (const produto of produtos) {
      try {
        // Verificar se já existe no inventário
        const existe = await Inventario.findOne({ 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          $or: [
            { nome: produto.produto },
            { 'dadosEspecificos.codigoBarras': produto.codigoBarras }
          ]
        });
        
        if (existe) {
          console.log(`⏭️ Produto "${produto.produto}" já existe no inventário`);
          detalhes.push({ produto: produto.produto, status: 'já existe' });
          continue;
        }
        
        // Gerar código PGCA usando o codificador
        const codigoInfo = await codificadorPGCA.gerarCodigo(
          'Produtos Alimentares', 
          'Mercadoria', 
          produto.produto,
          Inventario,
          empresaId
        );
        
        const novoItem = new Inventario({
          empresaId: new mongoose.Types.ObjectId(empresaId),
          codigo: codigoInfo.codigo,
          codigoCompleto: codigoInfo.codigoCompleto,
          classe: codigoInfo.classe,
          tipoAtivo: 'Mercadoria',
          categoria: 'Produtos Alimentares',
          nome: produto.produto,
          quantidade: produto.quantidade || 0,
          valorUnitario: produto.precoVenda || 0,
          valorTotal: (produto.quantidade || 0) * (produto.precoVenda || 0),
          dataAquisicao: new Date(),
          localizacaoFisica: produto.localizacao || '',
          fornecedor: produto.fornecedor || '',
          dadosEspecificos: {
            dataValidade: produto.dataValidade,
            codigoBarras: produto.codigoBarras,
            fornecedor: produto.fornecedor,
            localizacao: produto.localizacao
          },
          estado: 'Ativo',
          criadoPor: req.user?.nome || "Sistema - Importação"
        });
        
        await novoItem.save();
        importados++;
        detalhes.push({ 
          produto: produto.produto, 
          codigo: codigoInfo.codigo, 
          status: 'importado' 
        });
        console.log(`✅ Importado: ${produto.produto} - Código PGCA: ${codigoInfo.codigo}`);
        
      } catch (err) {
        erros++;
        detalhes.push({ 
          produto: produto.produto, 
          status: 'erro', 
          erro: err.message 
        });
        console.error(`❌ Erro ao importar ${produto.produto}:`, err.message);
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: `Importação concluída: ${importados} itens importados, ${erros} erros`,
      detalhes
    });
    
  } catch (error) {
    console.error('Erro ao importar de stock:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Importar de viaturas (com empresaId)
exports.importarDeViaturas = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const viaturas = await Viatura.find({ 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      ativo: true 
    });
    
    console.log(`📦 Encontradas ${viaturas.length} viaturas para importar`);
    
    let importados = 0;
    let erros = 0;
    let detalhes = [];
    
    for (const viatura of viaturas) {
      try {
        const nomeViatura = `${viatura.marca} ${viatura.modelo} - ${viatura.matricula}`;
        
        // Verificar se já existe
        const existe = await Inventario.findOne({ 
          empresaId: new mongoose.Types.ObjectId(empresaId),
          $or: [
            { nome: nomeViatura },
            { 'dadosEspecificos.matricula': viatura.matricula }
          ]
        });
        
        if (existe) {
          detalhes.push({ viatura: viatura.matricula, status: 'já existe' });
          continue;
        }
        
        // Gerar código PGCA para viatura
        const codigoInfo = await codificadorPGCA.gerarCodigo(
          'Viaturas Ligeiras', 
          'Imobilizado', 
          nomeViatura,
          Inventario,
          empresaId
        );
        
        const valorAquisicao = viatura.valorAquisicao || viatura.precoCompra || 0;
        
        const novoItem = new Inventario({
          empresaId: new mongoose.Types.ObjectId(empresaId),
          codigo: codigoInfo.codigo,
          codigoCompleto: codigoInfo.codigoCompleto,
          classe: codigoInfo.classe,
          tipoAtivo: 'Imobilizado',
          categoria: 'Viaturas',
          nome: nomeViatura,
          quantidade: 1,
          valorUnitario: valorAquisicao,
          valorTotal: valorAquisicao,
          dataAquisicao: viatura.dataAquisicao ? new Date(viatura.dataAquisicao) : new Date(),
          dadosEspecificos: {
            matricula: viatura.matricula,
            marca: viatura.marca,
            modelo: viatura.modelo,
            ano: viatura.ano,
            km: viatura.km || 0,
            combustivel: viatura.combustivel,
            motorista: viatura.motorista,
            cor: viatura.cor
          },
          estado: viatura.estado === 'Em uso' ? 'Ativo' : 'Em manutenção',
          criadoPor: req.user?.nome || "Sistema - Importação"
        });
        
        await novoItem.save();
        importados++;
        detalhes.push({ 
          viatura: viatura.matricula, 
          codigo: codigoInfo.codigo, 
          status: 'importado' 
        });
        console.log(`✅ Importada: ${nomeViatura} - Código PGCA: ${codigoInfo.codigo}`);
        
      } catch (err) {
        erros++;
        detalhes.push({ 
          viatura: viatura.matricula, 
          status: 'erro', 
          erro: err.message 
        });
        console.error(`❌ Erro ao importar ${viatura.matricula}:`, err.message);
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: `Importação concluída: ${importados} viaturas importadas, ${erros} erros`,
      detalhes
    });
    
  } catch (error) {
    console.error('Erro ao importar viaturas:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Dashboard - Estatísticas do inventário (por empresa)
exports.getDashboard = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const empresaIdObj = new mongoose.Types.ObjectId(empresaId);
    
    const totalItens = await Inventario.countDocuments({ empresaId: empresaIdObj });
    const totalAtivos = await Inventario.countDocuments({ empresaId: empresaIdObj, estado: 'Ativo' });
    const totalBaixados = await Inventario.countDocuments({ empresaId: empresaIdObj, estado: 'Baixado' });
    const totalManutencao = await Inventario.countDocuments({ empresaId: empresaIdObj, estado: 'Em manutenção' });
    
    const valorTotalAtivos = await Inventario.aggregate([
      { $match: { empresaId: empresaIdObj, estado: 'Ativo' } },
      { $group: { _id: null, total: { $sum: '$valorTotal' } } }
    ]);
    
    const porCategoria = await Inventario.aggregate([
      { $match: { empresaId: empresaIdObj, estado: 'Ativo' } },
      {
        $group: {
          _id: '$categoria',
          totalItens: { $sum: 1 },
          totalQuantidade: { $sum: '$quantidade' },
          valorTotal: { $sum: '$valorTotal' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    const porTipoAtivo = await Inventario.aggregate([
      { $match: { empresaId: empresaIdObj, estado: 'Ativo' } },
      {
        $group: {
          _id: '$tipoAtivo',
          totalItens: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        totalItens,
        totalAtivos,
        totalBaixados,
        totalManutencao,
        valorTotal: valorTotalAtivos[0]?.total || 0,
        porCategoria: porCategoria.filter(c => c._id),
        porTipoAtivo: porTipoAtivo.filter(t => t._id)
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter dashboard:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Obter estatísticas por classe PGCA (por empresa)
exports.getStatsPorClasse = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const stats = await Inventario.aggregate([
      { $match: { empresaId: new mongoose.Types.ObjectId(empresaId) } },
      {
        $group: {
          _id: '$classe',
          totalItens: { $sum: 1 },
          valorTotal: { $sum: '$valorTotal' },
          quantidadeTotal: { $sum: '$quantidade' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json({
      sucesso: true,
      dados: stats
    });
    
  } catch (error) {
    console.error('Erro ao obter estatísticas por classe:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Calcular depreciação de um item específico
exports.calcularDepreciacao = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const item = await Inventario.findOne({ 
      _id: id, 
      empresaId: new mongoose.Types.ObjectId(empresaId) 
    });
    
    if (!item) {
      return res.status(404).json({ sucesso: false, mensagem: 'Item não encontrado' });
    }
    
    const depreciacaoCalculada = item.calcularDepreciacao();
    await item.save();
    
    res.json({
      sucesso: true,
      mensagem: 'Depreciação calculada com sucesso',
      dados: {
        item: item.nome,
        valorOriginal: item.valorUnitario,
        depreciacaoAcumulada: item.depreciacaoAcumulada,
        valorDepreciado: item.valorDepreciado,
        percentualDepreciado: ((item.depreciacaoAcumulada / item.valorUnitario) * 100).toFixed(2)
      }
    });
    
  } catch (error) {
    console.error('Erro ao calcular depreciação:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Calcular depreciação de todos os itens da empresa
exports.calcularDepreciacoesEmMassa = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const itens = await Inventario.find({ 
      empresaId: new mongoose.Types.ObjectId(empresaId),
      tipoAtivo: 'Imobilizado',
      estado: 'Ativo'
    });
    
    let atualizados = 0;
    const resultados = [];
    
    for (const item of itens) {
      const depreciacaoAnterior = item.depreciacaoAcumulada;
      item.calcularDepreciacao();
      await item.save();
      
      resultados.push({
        nome: item.nome,
        depreciacaoAnterior,
        depreciacaoNova: item.depreciacaoAcumulada,
        diferenca: item.depreciacaoAcumulada - depreciacaoAnterior
      });
      atualizados++;
    }
    
    res.json({
      sucesso: true,
      mensagem: `Depreciação calculada para ${atualizados} itens`,
      dados: resultados
    });
    
  } catch (error) {
    console.error('Erro ao calcular depreciações em massa:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Obter resumo completo do inventário (por empresa)
exports.getResumo = async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa é obrigatória' });
    }
    
    const empresaIdObj = new mongoose.Types.ObjectId(empresaId);
    
    const [totalGeral, totalMercadorias, totalImobilizados, totalOutros] = await Promise.all([
      Inventario.countDocuments({ empresaId: empresaIdObj }),
      Inventario.countDocuments({ empresaId: empresaIdObj, tipoAtivo: 'Mercadoria' }),
      Inventario.countDocuments({ empresaId: empresaIdObj, tipoAtivo: 'Imobilizado' }),
      Inventario.countDocuments({ empresaId: empresaIdObj, tipoAtivo: { $nin: ['Mercadoria', 'Imobilizado'] } })
    ]);
    
    const valorTotal = await Inventario.aggregate([
      { $match: { empresaId: empresaIdObj } },
      { $group: { _id: null, total: { $sum: '$valorTotal' } } }
    ]);
    
    res.json({
      sucesso: true,
      dados: {
        totalGeral,
        totalMercadorias,
        totalImobilizados,
        totalOutros,
        valorTotal: valorTotal[0]?.total || 0
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter resumo:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};