// backend/routes/funcionarios.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Funcionario = require('../models/Funcionario');
const Tecnico = require('../models/Tecnico');
const Empresa = require('../models/Empresa');
const { verifyToken } = require('../middlewares/auth');
const { validateEmpresaAccess } = require('../middlewares/security');

// Garantir que a pasta uploads/funcionarios existe
const uploadDir = path.join(__dirname, '../uploads/funcionarios');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar multer para upload de fotos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'func-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // AUMENTADO PARA 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas (jpg, jpeg, png, gif)'));
    }
  }
});

// 🔒 TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
router.use(verifyToken);

// 🔒 GET - Listar funcionários (COM VALIDAÇÃO DE EMPRESA)
router.get('/', validateEmpresaAccess, async (req, res) => {
  try {
    const empresaId = req.empresaAtual;
    
    console.log('📋 Buscando funcionários para empresa:', empresaId);
    
    const funcionarios = await Funcionario.find({ empresaId }).sort({ nome: 1 });
    
    console.log(`✅ Encontrados ${funcionarios.length} funcionários`);
    res.json(funcionarios);
    
  } catch (error) {
    console.error('❌ Erro ao buscar funcionários:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar funcionários', error: error.message });
  }
});

// GET - Buscar funcionário por ID
router.get('/:id', async (req, res) => {
  try {
    const funcionario = await Funcionario.findById(req.params.id);
    if (!funcionario) {
      return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
    }
    
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const temAcesso = usuarioEmpresasPermitidas.includes(funcionario.empresaId.toString());
    
    if (!temAcesso && req.user?.role !== 'admin') {
      console.error(`❌ ACESSO NEGADO: ${req.user?.nome} tentou acessar funcionário de empresa ${funcionario.empresaId}`);
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    res.json(funcionario);
  } catch (error) {
    console.error('Erro ao buscar funcionário:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar funcionário' });
  }
});

// 🔒 POST - Criar funcionário (COM VALIDAÇÃO DE EMPRESA)
router.post('/', validateEmpresaAccess, upload.single('foto'), async (req, res) => {
  try {
    const {
      nome, nif, dataNascimento, genero, estadoCivil, nacionalidade,
      email, telefone, endereco,
      funcao, departamento, dataAdmissao, tipoContrato, status,
      salarioBase,
      banco, numeroConta, iban, titularConta,
      grupoIRT, dependentes,
      horasSemanais, horasDiarias,
      contribuiINSS,  // NOVO CAMPO
      isTecnico,
      tecnicoSenha, tecnicoModulos
    } = req.body;
    
    const empresaId = req.empresaAtual;
    
    console.log('📝 Dados recebidos no POST:', {
      nome, nif, funcao, salarioBase, empresaId, contribuiINSS, isTecnico
    });
    
    // Validações
    if (!nome || !nome.trim()) {
      return res.status(400).json({ mensagem: 'Nome do funcionário é obrigatório' });
    }
    if (!nif || !nif.trim()) {
      return res.status(400).json({ mensagem: 'NIF é obrigatório' });
    }
    if (!funcao || !funcao.trim()) {
      return res.status(400).json({ mensagem: 'Função é obrigatória' });
    }
    if (!salarioBase || parseFloat(salarioBase) <= 0) {
      return res.status(400).json({ mensagem: 'Salário base é obrigatório' });
    }
    
    // Verificar se já existe funcionário com este NIF na mesma empresa
    const funcionarioExistente = await Funcionario.findOne({ nif, empresaId });
    if (funcionarioExistente) {
      return res.status(400).json({ mensagem: 'Já existe um funcionário com este NIF nesta empresa' });
    }
    
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(400).json({ mensagem: 'Empresa não encontrada' });
    }
    
    const isTecnicoBool = isTecnico === true || isTecnico === 'true';
    if (isTecnicoBool && (!tecnicoSenha || tecnicoSenha.trim() === '')) {
      return res.status(400).json({ mensagem: 'Senha é obrigatória para técnico' });
    }
    
    const funcionario = new Funcionario({
      nome: nome.trim(),
      nif: nif.trim(),
      dataNascimento: dataNascimento || null,
      genero: genero || null,
      estadoCivil: estadoCivil || null,
      nacionalidade: nacionalidade || 'Angolana',
      foto: req.file ? `/uploads/funcionarios/${req.file.filename}` : null,
      email: email || '',
      telefone: telefone || '',
      endereco: endereco || '',
      funcao: funcao.trim(),
      departamento: departamento || '',
      dataAdmissao: dataAdmissao || new Date(),
      status: status || 'Ativo',
      salarioBase: parseFloat(salarioBase),
      tipoContrato: tipoContrato || 'Efetivo',
      banco: banco || '',
      numeroConta: numeroConta || '',
      iban: iban || '',
      titularConta: titularConta || nome,
      grupoIRT: grupoIRT || 'A',
      dependentes: dependentes ? parseInt(dependentes) : 0,
      horasSemanais: horasSemanais ? parseFloat(horasSemanais) : 40,
      horasDiarias: horasDiarias ? parseFloat(horasDiarias) : 8,
      contribuiINSS: contribuiINSS === 'true' || contribuiINSS === true || contribuiINSS === undefined, // Padrão true
      empresaId,
      empresaNome: empresa.nome,
      isTecnico: isTecnicoBool
    });
    
    await funcionario.save();
    console.log('✅ Funcionário criado com sucesso:', funcionario._id);
    
    // CRIAR TÉCNICO SE MARCADO
    let tecnicoCriado = null;
    if (funcionario.isTecnico && tecnicoSenha) {
      try {
        const modulos = tecnicoModulos ? JSON.parse(tecnicoModulos) : {
          vendas: true,
          stock: true,
          facturacao: true,
          funcionarios: false,
          folhaSalarial: false,
          gestaoFaltas: false,
          gestaoAbonos: false,
          avaliacao: false,
          viaturas: false,
          abastecimentos: false,
          manutencoes: false,
          inventario: false,
          fornecedores: false,
          fluxoCaixa: false,
          contaCorrente: false,
          controloPagamento: false,
          custosReceitas: false,
          orcamentos: false,
          dre: false,
          indicadores: false,
          transferencias: false,
          reconciliacao: false,
          relatorios: false,
          graficos: false,
          analise: false
        };
        
        const tecnico = new Tecnico({
          nome: funcionario.nome,
          email: funcionario.email,
          senha: tecnicoSenha,
          telefone: funcionario.telefone || '',
          funcao: funcionario.funcao,
          empresaId: funcionario.empresaId,
          empresaNome: empresa.nome,
          modulos: modulos,
          funcionarioId: funcionario._id
        });
        
        await tecnico.save();
        funcionario.usuarioId = tecnico._id;
        await funcionario.save();
        tecnicoCriado = { id: tecnico._id, nome: tecnico.nome, email: tecnico.email };
        console.log('✅ Técnico criado com sucesso:', tecnico._id);
      } catch (error) {
        console.error('❌ Erro ao criar técnico:', error);
      }
    }
    
    res.status(201).json({
      mensagem: 'Funcionário cadastrado com sucesso',
      funcionario,
      tecnico: tecnicoCriado
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar funcionário:', error);
    res.status(500).json({ mensagem: 'Erro ao criar funcionário', error: error.message });
  }
});

// PUT - Atualizar funcionário
router.put('/:id', upload.single('foto'), async (req, res) => {
  try {
    const funcionario = await Funcionario.findById(req.params.id);
    if (!funcionario) {
      return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
    }
    
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const temAcesso = usuarioEmpresasPermitidas.includes(funcionario.empresaId.toString());
    
    if (!temAcesso && req.user?.role !== 'admin') {
      console.error(`❌ ACESSO NEGADO: ${req.user?.nome} tentou editar funcionário de empresa ${funcionario.empresaId}`);
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    const {
      nome, nif, dataNascimento, genero, estadoCivil, nacionalidade,
      email, telefone, endereco,
      funcao, departamento, dataAdmissao, tipoContrato, status,
      salarioBase,
      banco, numeroConta, iban, titularConta,
      grupoIRT, dependentes,
      horasSemanais, horasDiarias,
      contribuiINSS,  // NOVO CAMPO
      isTecnico,
      tecnicoSenha, tecnicoModulos
    } = req.body;
    
    // Verificar se o NIF já existe em outro funcionário na mesma empresa
    if (nif && nif !== funcionario.nif) {
      const nifExistente = await Funcionario.findOne({ nif, empresaId: funcionario.empresaId, _id: { $ne: req.params.id } });
      if (nifExistente) {
        return res.status(400).json({ mensagem: 'Já existe um funcionário com este NIF nesta empresa' });
      }
    }
    
    // Se houver nova foto, remover a antiga
    if (req.file) {
      if (funcionario.foto) {
        const oldPhotoPath = path.join(__dirname, '..', funcionario.foto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      funcionario.foto = `/uploads/funcionarios/${req.file.filename}`;
    }
    
    // Atualizar todos os campos
    funcionario.nome = nome || funcionario.nome;
    funcionario.nif = nif || funcionario.nif;
    funcionario.dataNascimento = dataNascimento || funcionario.dataNascimento;
    funcionario.genero = genero || funcionario.genero;
    funcionario.estadoCivil = estadoCivil || funcionario.estadoCivil;
    funcionario.nacionalidade = nacionalidade || funcionario.nacionalidade;
    funcionario.email = email || funcionario.email;
    funcionario.telefone = telefone || funcionario.telefone;
    funcionario.endereco = endereco || funcionario.endereco;
    funcionario.funcao = funcao || funcionario.funcao;
    funcionario.departamento = departamento || funcionario.departamento;
    funcionario.dataAdmissao = dataAdmissao || funcionario.dataAdmissao;
    funcionario.status = status || funcionario.status;
    funcionario.salarioBase = salarioBase ? parseFloat(salarioBase) : funcionario.salarioBase;
    funcionario.tipoContrato = tipoContrato || funcionario.tipoContrato;
    funcionario.banco = banco || funcionario.banco;
    funcionario.numeroConta = numeroConta || funcionario.numeroConta;
    funcionario.iban = iban || funcionario.iban;
    funcionario.titularConta = titularConta || funcionario.titularConta;
    funcionario.grupoIRT = grupoIRT || funcionario.grupoIRT;
    funcionario.dependentes = dependentes !== undefined ? parseInt(dependentes) : funcionario.dependentes;
    funcionario.horasSemanais = horasSemanais ? parseFloat(horasSemanais) : funcionario.horasSemanais;
    funcionario.horasDiarias = horasDiarias ? parseFloat(horasDiarias) : funcionario.horasDiarias;
    
    // ATUALIZAR CAMPO contribuiINSS
    if (contribuiINSS !== undefined) {
      funcionario.contribuiINSS = contribuiINSS === 'true' || contribuiINSS === true;
    }
    
    const wasTecnico = funcionario.isTecnico;
    funcionario.isTecnico = isTecnico === 'true' || isTecnico === true;
    
    await funcionario.save();
    
    // Gerenciar criação/atualização do técnico
    if (funcionario.isTecnico && !wasTecnico && tecnicoSenha) {
      const modulos = tecnicoModulos ? JSON.parse(tecnicoModulos) : {
        vendas: true,
        stock: true,
        facturacao: true,
        funcionarios: false,
        folhaSalarial: false,
        gestaoFaltas: false,
        gestaoAbonos: false,
        avaliacao: false,
        viaturas: false,
        abastecimentos: false,
        manutencoes: false,
        inventario: false,
        fornecedores: false,
        fluxoCaixa: false,
        contaCorrente: false,
        controloPagamento: false,
        custosReceitas: false,
        orcamentos: false,
        dre: false,
        indicadores: false,
        transferencias: false,
        reconciliacao: false,
        relatorios: false,
        graficos: false,
        analise: false
      };
      
      const tecnico = new Tecnico({
        nome: funcionario.nome,
        email: funcionario.email,
        senha: tecnicoSenha,
        telefone: funcionario.telefone || '',
        funcao: funcionario.funcao,
        empresaId: funcionario.empresaId,
        empresaNome: funcionario.empresaNome,
        modulos: modulos,
        funcionarioId: funcionario._id
      });
      
      await tecnico.save();
      funcionario.usuarioId = tecnico._id;
      await funcionario.save();
      console.log('✅ Técnico criado na atualização:', tecnico._id);
    } else if (funcionario.isTecnico && funcionario.usuarioId && tecnicoSenha) {
      const tecnico = await Tecnico.findById(funcionario.usuarioId);
      if (tecnico) {
        tecnico.nome = funcionario.nome;
        tecnico.email = funcionario.email;
        if (tecnicoSenha && tecnicoSenha !== '') {
          tecnico.senha = tecnicoSenha;
        }
        tecnico.telefone = funcionario.telefone || '';
        tecnico.funcao = funcionario.funcao;
        if (tecnicoModulos) {
          tecnico.modulos = JSON.parse(tecnicoModulos);
        }
        await tecnico.save();
        console.log('✅ Técnico atualizado:', tecnico._id);
      }
    } else if (!funcionario.isTecnico && wasTecnico && funcionario.usuarioId) {
      await Tecnico.findByIdAndDelete(funcionario.usuarioId);
      funcionario.usuarioId = null;
      await funcionario.save();
      console.log('✅ Técnico removido');
    }
    
    console.log('✅ Funcionário atualizado com sucesso:', funcionario._id);
    res.json(funcionario);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar funcionário:', error);
    res.status(500).json({ mensagem: 'Erro ao atualizar funcionário', error: error.message });
  }
});

// DELETE - Excluir funcionário
router.delete('/:id', async (req, res) => {
  try {
    const funcionario = await Funcionario.findById(req.params.id);
    if (!funcionario) {
      return res.status(404).json({ mensagem: 'Funcionário não encontrado' });
    }
    
    const usuarioEmpresasPermitidas = req.user?.empresasPermitidas || [];
    const temAcesso = usuarioEmpresasPermitidas.includes(funcionario.empresaId.toString());
    
    if (!temAcesso && req.user?.role !== 'admin') {
      console.error(`❌ ACESSO NEGADO: ${req.user?.nome} tentou excluir funcionário de empresa ${funcionario.empresaId}`);
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    
    if (funcionario.usuarioId) {
      await Tecnico.findByIdAndDelete(funcionario.usuarioId);
      console.log('✅ Técnico associado removido');
    }
    
    if (funcionario.foto) {
      const photoPath = path.join(__dirname, '..', funcionario.foto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    await Funcionario.findByIdAndDelete(req.params.id);
    console.log('✅ Funcionário excluído com sucesso:', funcionario._id);
    res.json({ mensagem: 'Funcionário excluído com sucesso' });
    
  } catch (error) {
    console.error('❌ Erro ao excluir funcionário:', error);
    res.status(500).json({ mensagem: 'Erro ao excluir funcionário' });
  }
});

module.exports = router;