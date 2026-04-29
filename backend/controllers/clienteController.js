// backend/controllers/clienteController.js
const Cliente = require('../models/Cliente');

// Criar ou atualizar cliente
async function criarOuAtualizarCliente(dadosCliente, empresaId) {
  try {
    if (!dadosCliente.nif || dadosCliente.nif === '999999999') {
      console.log('⚠️ Cliente sem NIF válido, não será cadastrado');
      return null;
    }
    
    let cliente = await Cliente.findOne({ 
      nif: dadosCliente.nif, 
      empresaId 
    });
    
    if (cliente) {
      // Atualizar dados do cliente existente
      cliente.nome = dadosCliente.nome || cliente.nome;
      cliente.email = dadosCliente.email || cliente.email;
      cliente.telefone = dadosCliente.telefone || cliente.telefone;
      cliente.endereco = dadosCliente.endereco || cliente.endereco;
      cliente.updatedAt = new Date();
      await cliente.save();
      console.log(`✅ Cliente atualizado: ${cliente.nome} (${cliente.nif})`);
    } else {
      // Criar novo cliente
      cliente = new Cliente({
        nome: dadosCliente.nome,
        nif: dadosCliente.nif,
        email: dadosCliente.email || '',
        telefone: dadosCliente.telefone || '',
        endereco: dadosCliente.endereco || '',
        cidade: dadosCliente.cidade || 'Luanda',
        tipo: dadosCliente.tipo || 'particular',
        empresaId: empresaId,
        ativo: true
      });
      await cliente.save();
      console.log(`✅ Novo cliente cadastrado: ${cliente.nome} (${cliente.nif})`);
    }
    
    return cliente;
  } catch (error) {
    console.error('❌ Erro ao criar/atualizar cliente:', error);
    return null;
  }
}

// GET /api/clientes/:empresaId
exports.getClientes = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { search, page = 1, limit = 50 } = req.query;
    
    const query = { empresaId, ativo: true };
    
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { nif: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [clientes, total] = await Promise.all([
      Cliente.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Cliente.countDocuments(query)
    ]);
    
    res.json({
      sucesso: true,
      dados: clientes,
      total,
      pagina: parseInt(page),
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// GET /api/clientes/:empresaId/:id
exports.getClienteById = async (req, res) => {
  try {
    const { id, empresaId } = req.params;
    
    const cliente = await Cliente.findOne({ _id: id, empresaId });
    if (!cliente) {
      return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado' });
    }
    
    res.json({ sucesso: true, dados: cliente });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// POST /api/clientes
exports.createCliente = async (req, res) => {
  try {
    const { empresaId, nome, nif, email, telefone, endereco, cidade, tipo } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ sucesso: false, mensagem: 'Empresa não informada' });
    }
    
    if (!nome || !nif) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nome e NIF são obrigatórios' });
    }
    
    const existe = await Cliente.findOne({ nif, empresaId });
    if (existe) {
      return res.status(400).json({ sucesso: false, mensagem: 'Cliente já cadastrado com este NIF' });
    }
    
    const cliente = new Cliente({
      nome,
      nif,
      email,
      telefone,
      endereco,
      cidade: cidade || 'Luanda',
      tipo: tipo || 'particular',
      empresaId
    });
    
    await cliente.save();
    
    res.status(201).json({ sucesso: true, mensagem: 'Cliente cadastrado com sucesso', dados: cliente });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// PUT /api/clientes/:id
exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId, ...dados } = req.body;
    
    const cliente = await Cliente.findOne({ _id: id, empresaId });
    if (!cliente) {
      return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado' });
    }
    
    Object.assign(cliente, dados, { updatedAt: new Date() });
    await cliente.save();
    
    res.json({ sucesso: true, mensagem: 'Cliente atualizado com sucesso', dados: cliente });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// DELETE /api/clientes/:id
exports.deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.query;
    
    const cliente = await Cliente.findOne({ _id: id, empresaId });
    if (!cliente) {
      return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado' });
    }
    
    cliente.ativo = false;
    await cliente.save();
    
    res.json({ sucesso: true, mensagem: 'Cliente removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover cliente:', error);
    res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};

// Exportar função auxiliar
module.exports.criarOuAtualizarCliente = criarOuAtualizarCliente;