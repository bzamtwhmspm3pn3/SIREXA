// src/pages/Contabilidade/PlanoContas.jsx
import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { 
  BookOpen, Search, RefreshCw, Download, Printer,
  ChevronDown, ChevronRight, Database, Plus, Minus,
  Edit, Trash2, Save, X, FolderPlus, CheckCircle, AlertCircle
} from "lucide-react";

const PlanoContas = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [classeFiltro, setClasseFiltro] = useState("todas");
  const [expandidas, setExpandidas] = useState({});
  const [expandirTodas, setExpandirTodas] = useState(false);
  
  // Estado para modal de criação de conta
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [novaConta, setNovaConta] = useState({
    codigo: "",
    nome: "",
    classe: 1,
    nivel: 1,
    natureza: "Devedora",
    pai: null,
    paiCodigo: ""
  });
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [erroValidacao, setErroValidacao] = useState("");
  const [sucessoValidacao, setSucessoValidacao] = useState("");

  const BASE_URL = "https://sirexa-api.onrender.com";

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  // Buscar empresas
  const buscarEmpresas = async () => {
    if (isTecnico()) return;
    try {
      const response = await fetch(`${BASE_URL}/api/empresa`, { headers: getHeaders() });
      if (response.status === 403) {
        setEmpresas([]);
        return;
      }
      const data = await response.json();
      const lista = Array.isArray(data) ? data : [];
      setEmpresas(lista);
      if (lista.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(lista[0]._id);
      }
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
    }
  };

  // Buscar plano de contas do backend
  const buscarPlanoContas = async () => {
    if (!empresaSelecionada && !isTecnico()) return;
    
    setLoading(true);
    try {
      const id = isTecnico() ? userEmpresaId : empresaSelecionada;
      const response = await fetch(`${BASE_URL}/api/contabilidade/plano-contas?empresaId=${id}`, {
        headers: getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso && data.dados && data.dados.length > 0) {
          // Ordenar contas para exibição hierárquica
          const contasOrdenadas = data.dados.sort((a, b) => {
            const aParts = a.codigo.split('.').map(p => parseInt(p) || 0);
            const bParts = b.codigo.split('.').map(p => parseInt(p) || 0);
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
              const aVal = aParts[i] || 0;
              const bVal = bParts[i] || 0;
              if (aVal !== bVal) return aVal - bVal;
            }
            return 0;
          });
          setContas(contasOrdenadas);
        } else {
          await carregarPlanoPadrao();
        }
      } else {
        await carregarPlanoPadrao();
      }
    } catch (error) {
      console.error("Erro ao buscar plano de contas:", error);
      await carregarPlanoPadrao();
    } finally {
      setLoading(false);
    }
  };

  // Carregar plano de contas padrão do PGCA
  const carregarPlanoPadrao = async () => {
    const planoPadrao = [
      { codigo: "1", nome: "MEIOS FIXOS E INVESTIMENTOS", classe: 1, nivel: 1, natureza: "Devedora", pai: null, paiCodigo: null, ativo: true },
      { codigo: "11", nome: "Imobilizações Corpóreas", classe: 1, nivel: 2, natureza: "Devedora", pai: "1", paiCodigo: "1", ativo: true },
      { codigo: "11.1", nome: "Terrenos e Recursos Naturais", classe: 1, nivel: 3, natureza: "Devedora", pai: "11", paiCodigo: "11", ativo: true },
      { codigo: "11.1.1", nome: "Terrenos em Bruto", classe: 1, nivel: 4, natureza: "Devedora", pai: "11.1", paiCodigo: "11.1", ativo: true },
      { codigo: "11.2", nome: "Edifícios e Outras Construções", classe: 1, nivel: 3, natureza: "Devedora", pai: "11", paiCodigo: "11", ativo: true },
      { codigo: "11.2.1", nome: "Edifícios", classe: 1, nivel: 4, natureza: "Devedora", pai: "11.2", paiCodigo: "11.2", ativo: true },
      { codigo: "2", nome: "EXISTÊNCIAS", classe: 2, nivel: 1, natureza: "Devedora", pai: null, paiCodigo: null, ativo: true },
      { codigo: "21", nome: "Compras", classe: 2, nivel: 2, natureza: "Devedora", pai: "2", paiCodigo: "2", ativo: true },
      { codigo: "22", nome: "Matérias-primas", classe: 2, nivel: 2, natureza: "Devedora", pai: "2", paiCodigo: "2", ativo: true },
      { codigo: "3", nome: "TERCEIROS", classe: 3, nivel: 1, natureza: "Mista", pai: null, paiCodigo: null, ativo: true },
      { codigo: "31", nome: "Clientes", classe: 3, nivel: 2, natureza: "Devedora", pai: "3", paiCodigo: "3", ativo: true },
      { codigo: "31.1", nome: "Clientes Nacionais", classe: 3, nivel: 3, natureza: "Devedora", pai: "31", paiCodigo: "31", ativo: true },
      { codigo: "32", nome: "Fornecedores", classe: 3, nivel: 2, natureza: "Credora", pai: "3", paiCodigo: "3", ativo: true },
      { codigo: "33", nome: "Empréstimos", classe: 3, nivel: 2, natureza: "Credora", pai: "3", paiCodigo: "3", ativo: true },
      { codigo: "34", nome: "Estado", classe: 3, nivel: 2, natureza: "Mista", pai: "3", paiCodigo: "3", ativo: true },
      { codigo: "36", nome: "Pessoal", classe: 3, nivel: 2, natureza: "Mista", pai: "3", paiCodigo: "3", ativo: true },
      { codigo: "4", nome: "MEIOS MONETÁRIOS", classe: 4, nivel: 1, natureza: "Devedora", pai: null, paiCodigo: null, ativo: true },
      { codigo: "43", nome: "Depósitos à Ordem", classe: 4, nivel: 2, natureza: "Devedora", pai: "4", paiCodigo: "4", ativo: true },
      { codigo: "45", nome: "Caixa", classe: 4, nivel: 2, natureza: "Devedora", pai: "4", paiCodigo: "4", ativo: true },
      { codigo: "5", nome: "CAPITAL E RESERVAS", classe: 5, nivel: 1, natureza: "Credora", pai: null, paiCodigo: null, ativo: true },
      { codigo: "51", nome: "Capital Social", classe: 5, nivel: 2, natureza: "Credora", pai: "5", paiCodigo: "5", ativo: true },
      { codigo: "6", nome: "PROVEITOS E GANHOS", classe: 6, nivel: 1, natureza: "Credora", pai: null, paiCodigo: null, ativo: true },
      { codigo: "61", nome: "Vendas", classe: 6, nivel: 2, natureza: "Credora", pai: "6", paiCodigo: "6", ativo: true },
      { codigo: "62", nome: "Prestações de Serviços", classe: 6, nivel: 2, natureza: "Credora", pai: "6", paiCodigo: "6", ativo: true },
      { codigo: "7", nome: "CUSTOS E PERDAS", classe: 7, nivel: 1, natureza: "Devedora", pai: null, paiCodigo: null, ativo: true },
      { codigo: "71", nome: "Custo das Existências", classe: 7, nivel: 2, natureza: "Devedora", pai: "7", paiCodigo: "7", ativo: true },
      { codigo: "72", nome: "Custos com Pessoal", classe: 7, nivel: 2, natureza: "Devedora", pai: "7", paiCodigo: "7", ativo: true },
      { codigo: "73", nome: "Amortizações", classe: 7, nivel: 2, natureza: "Devedora", pai: "7", paiCodigo: "7", ativo: true },
      { codigo: "75", nome: "Outros Custos", classe: 7, nivel: 2, natureza: "Devedora", pai: "7", paiCodigo: "7", ativo: true },
      { codigo: "8", nome: "RESULTADOS ANALÍTICOS", classe: 8, nivel: 1, natureza: "Mista", pai: null, paiCodigo: null, ativo: true },
      { codigo: "9", nome: "CONTAS DE ORDEM", classe: 9, nivel: 1, natureza: "Mista", pai: null, paiCodigo: null, ativo: true }
    ];
    
    setContas(planoPadrao);
  };

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    buscarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada || isTecnico()) {
      buscarPlanoContas();
    }
  }, [empresaSelecionada]);

  // Validar código da conta - SEM LIMITAÇÃO DE TAMANHO
  const validarCodigo = (codigo) => {
    // Permite números separados por pontos, sem limite de níveis
    // Exemplos válidos: 1, 11, 11.1, 11.1.1, 11.2.1.1, 1.2.3.4.5.6.7.8.9.10
    const regex = /^\d+(\.\d+)*$/;
    return regex.test(codigo);
  };

  // Verificar se o código já existe
  const codigoExiste = (codigo, ignorarId = null) => {
    return contas.some(conta => conta.codigo === codigo && conta._id !== ignorarId && conta.ativo !== false);
  };

  // Verificar se a conta pai existe (para qualquer nível)
  const verificarPai = (codigo) => {
    if (!codigo.includes('.')) return { existe: true, pai: null, codigoPai: null };
    
    const partes = codigo.split('.');
    partes.pop(); // Remove a última parte
    const codigoPai = partes.join('.');
    
    const pai = contas.find(c => c.codigo === codigoPai && c.ativo !== false);
    return { existe: !!pai, pai: pai || null, codigoPai };
  };

  // Calcular nível baseado no código (quantos pontos + 1)
  const calcularNivel = (codigo) => {
    return codigo.split('.').length;
  };

  // Determinar classe baseada no primeiro dígito do código
  const determinarClasse = (codigo) => {
    const primeiraParte = parseInt(codigo.split('.')[0]);
    if (primeiraParte >= 1 && primeiraParte <= 9) return primeiraParte;
    return 9; // Padrão para códigos que começam com números > 9
  };

  // Determinar natureza baseada na classe
  const determinarNatureza = (classe) => {
    const naturezas = {
      1: "Devedora",
      2: "Devedora", 
      3: "Mista",
      4: "Devedora",
      5: "Credora",
      6: "Credora",
      7: "Devedora",
      8: "Mista",
      9: "Mista"
    };
    return naturezas[classe] || "Mista";
  };

  // Validar e preparar conta antes de salvar
  const prepararConta = (codigo, nome, contaPaiSelecionada = null) => {
    setErroValidacao("");
    setSucessoValidacao("");
    
    // Validar formato do código (sem limitação de níveis)
    if (!validarCodigo(codigo)) {
      setErroValidacao("❌ Formato inválido! Use números separados por pontos (ex: 1, 11, 11.1, 11.2.1.1, 1.2.3.4.5)");
      return null;
    }
    
    // Verificar se código já existe
    if (codigoExiste(codigo, contaSelecionada?._id)) {
      setErroValidacao(`❌ O código ${codigo} já existe!`);
      return null;
    }
    
    // Verificar se a conta pai existe (se não for nível 1)
    const nivel = calcularNivel(codigo);
    const { existe, pai, codigoPai } = verificarPai(codigo);
    
    if (nivel > 1 && !existe) {
      setErroValidacao(`❌ A conta pai ${codigoPai} não existe! Crie-a primeiro.`);
      return null;
    }
    
    const classe = determinarClasse(codigo);
    const natureza = determinarNatureza(classe);
    
    setSucessoValidacao(`✅ Código válido! Nível: ${nivel}, Classe: ${classe}`);
    
    return {
      codigo,
      nome,
      classe,
      nivel,
      natureza,
      pai: pai ? pai.codigo : null,
      paiCodigo: pai ? pai.codigo : null,
      ativo: true
    };
  };

  // Abrir modal para criar conta
  const abrirModalCriarConta = (contaPai = null) => {
    let sugestaoCodigo = "";
    let nivel = 1;
    
    if (contaPai) {
      // Se veio de uma conta pai, sugerir código filho
      sugestaoCodigo = `${contaPai.codigo}.1`;
      nivel = calcularNivel(sugestaoCodigo);
    } else {
      // Se é nova classe, sugerir próximo número
      sugestaoCodigo = "10";
      nivel = 1;
    }
    
    setModalType("create");
    setContaSelecionada(contaPai);
    setNovaConta({
      codigo: sugestaoCodigo,
      nome: "",
      classe: determinarClasse(sugestaoCodigo),
      nivel: nivel,
      natureza: determinarNatureza(determinarClasse(sugestaoCodigo)),
      pai: contaPai?.codigo || null,
      paiCodigo: contaPai?.codigo || null
    });
    setErroValidacao("");
    setSucessoValidacao("");
    setShowModal(true);
  };

  // Abrir modal para editar conta
  const abrirModalEditar = (conta) => {
    setModalType("edit");
    setContaSelecionada(conta);
    setNovaConta({ ...conta });
    setErroValidacao("");
    setSucessoValidacao("");
    setShowModal(true);
  };

  // Salvar conta (criar ou editar)
  const salvarConta = async () => {
    if (!novaConta.codigo || !novaConta.nome) {
      setErroValidacao("❌ Código e nome da conta são obrigatórios!");
      return;
    }
    
    let contaParaSalvar;
    
    if (modalType === "create") {
      const preparada = prepararConta(novaConta.codigo, novaConta.nome, contaSelecionada);
      if (!preparada) return;
      contaParaSalvar = preparada;
    } else {
      contaParaSalvar = { ...novaConta };
    }
    
    try {
      const id = isTecnico() ? userEmpresaId : empresaSelecionada;
      const url = modalType === "edit" 
        ? `${BASE_URL}/api/contabilidade/plano-contas/${contaSelecionada._id}`
        : `${BASE_URL}/api/contabilidade/plano-contas`;
      const method = modalType === "edit" ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          empresaId: id,
          ...contaParaSalvar
        })
      });
      
      if (response.ok) {
        alert(modalType === "edit" ? "✅ Conta actualizada com sucesso!" : "✅ Conta criada com sucesso!");
        setShowModal(false);
        buscarPlanoContas();
      } else {
        const error = await response.json();
        setErroValidacao(`❌ Erro: ${error.mensagem || error.message}`);
      }
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      setErroValidacao("❌ Erro ao salvar conta");
    }
  };

  // Desativar/remover conta
  const desativarConta = async (conta) => {
    if (!confirm(`Deseja ${conta.ativo ? 'desativar' : 'ativar'} a conta ${conta.codigo} - ${conta.nome}?\n${conta.ativo ? 'Isso também desativará todas as subcontas!' : ''}`)) return;
    
    try {
      const response = await fetch(`${BASE_URL}/api/contabilidade/plano-contas/${conta._id}`, {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ empresaId: isTecnico() ? userEmpresaId : empresaSelecionada })
      });
      
      if (response.ok) {
        alert(conta.ativo ? "✅ Conta desativada com sucesso!" : "✅ Conta ativada com sucesso!");
        buscarPlanoContas();
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.mensagem}`);
      }
    } catch (error) {
      console.error("Erro ao desativar conta:", error);
      alert("❌ Erro ao desativar conta");
    }
  };

  // Função para construir árvore hierárquica (sem limite de profundidade)
  const construirArvore = (contasLista) => {
    const mapa = {};
    const raizes = [];
    
    // Primeiro, criar mapa de todas as contas
    contasLista.forEach(conta => {
      mapa[conta.codigo] = { ...conta, filhos: [] };
    });
    
    // Depois, organizar hierarquia
    contasLista.forEach(conta => {
      if (conta.pai && mapa[conta.pai]) {
        mapa[conta.pai].filhos.push(mapa[conta.codigo]);
      } else if (conta.nivel === 1 || !conta.pai || !mapa[conta.pai]) {
        raizes.push(mapa[conta.codigo]);
      }
    });
    
    // Ordenar recursivamente por código
    const ordenarFilhos = (node) => {
      if (node.filhos) {
        node.filhos.sort((a, b) => {
          const aParts = a.codigo.split('.').map(p => parseInt(p) || 0);
          const bParts = b.codigo.split('.').map(p => parseInt(p) || 0);
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aVal = aParts[i] || 0;
            const bVal = bParts[i] || 0;
            if (aVal !== bVal) return aVal - bVal;
          }
          return 0;
        });
        node.filhos.forEach(ordenarFilhos);
      }
    };
    raizes.forEach(ordenarFilhos);
    
    return raizes;
  };

  const temFilhos = (conta) => {
    return conta.filhos && conta.filhos.length > 0;
  };

  const toggleExpandir = (codigo) => {
    setExpandidas(prev => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  const toggleExpandirTodas = () => {
    if (expandirTodas) {
      setExpandidas({});
    } else {
      const todasExpandidas = {};
      const expandirRecursivo = (conta) => {
        if (temFilhos(conta)) {
          todasExpandidas[conta.codigo] = true;
          conta.filhos.forEach(expandirRecursivo);
        }
      };
      arvoreContas.forEach(expandirRecursivo);
      setExpandidas(todasExpandidas);
    }
    setExpandirTodas(!expandirTodas);
  };

  // Filtrar contas
  const contasFiltradas = contas.filter(conta => {
    if (classeFiltro !== "todas" && conta.classe !== parseInt(classeFiltro)) return false;
    if (filtro && !conta.codigo.includes(filtro) && !conta.nome.toLowerCase().includes(filtro.toLowerCase())) return false;
    if (conta.ativo === false) return false;
    return true;
  });

  const arvoreContas = construirArvore(contasFiltradas);

  const contarFilhos = (conta) => {
    let total = conta.filhos.length;
    conta.filhos.forEach(filho => {
      total += contarFilhos(filho);
    });
    return total;
  };

  const getClasseCor = (classe) => {
    const cores = {
      1: "text-blue-400",
      2: "text-green-400",
      3: "text-yellow-400",
      4: "text-purple-400",
      5: "text-pink-400",
      6: "text-indigo-400",
      7: "text-red-400",
      8: "text-orange-400",
      9: "text-gray-400"
    };
    return cores[classe] || "text-cyan-400";
  };

  const getClasseBg = (classe) => {
    const cores = {
      1: "bg-blue-500/20 border-blue-500",
      2: "bg-green-500/20 border-green-500",
      3: "bg-yellow-500/20 border-yellow-500",
      4: "bg-purple-500/20 border-purple-500",
      5: "bg-pink-500/20 border-pink-500",
      6: "bg-indigo-500/20 border-indigo-500",
      7: "bg-red-500/20 border-red-500",
      8: "bg-orange-500/20 border-orange-500",
      9: "bg-gray-500/20 border-gray-500"
    };
    return cores[classe] || "bg-cyan-500/20 border-cyan-500";
  };

  const getNaturezaBadge = (natureza) => {
    if (natureza === "Devedora") {
      return <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">Devedora</span>;
    } else if (natureza === "Credora") {
      return <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">Credora</span>;
    }
    return <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">Mista</span>;
  };

  // Renderizar conta recursivamente (sem limite de profundidade)
  const renderizarConta = (conta, nivel = 0) => {
    const isExpanded = expandidas[conta.codigo];
    const hasChildren = temFilhos(conta);
    const paddingLeft = nivel * 20;
    
    return (
      <React.Fragment key={conta._id || conta.codigo}>
        <tr className={`border-t border-gray-700 hover:bg-gray-700/50 ${conta.ativo === false ? 'opacity-50' : ''}`}>
          <td className="p-3 font-mono text-xs" style={{ paddingLeft: `${12 + paddingLeft}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button 
                  onClick={() => toggleExpandir(conta.codigo)} 
                  className="text-gray-400 hover:text-white transition"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              {!hasChildren && <span className="w-4" />}
              <span className={getClasseCor(conta.classe)}>{conta.codigo}</span>
            </div>
            </td>
          <td className="p-3 text-white">
            {conta.nome}
            {hasChildren && (
              <span className="ml-2 text-xs text-gray-500">({contarFilhos(conta)} subcontas)</span>
            )}
            </td>
          <td className="p-3 text-center">
            <span className={`font-semibold ${getClasseCor(conta.classe)}`}>
              {conta.classe}
            </span>
            </td>
          <td className="p-3 text-center">{getNaturezaBadge(conta.natureza)}</td>
          <td className="p-3 text-center">
            <span className="text-xs bg-gray-600 px-2 py-0.5 rounded-full">
              Nível {conta.nivel}
            </span>
            </td>
          <td className="p-3 text-center">
            <div className="flex justify-center gap-2">
              <button 
                onClick={() => abrirModalCriarConta(conta)}
                className="text-green-400 hover:text-green-300 transition"
                title="Criar subconta"
              >
                <FolderPlus size={16} />
              </button>
              <button 
                onClick={() => abrirModalEditar(conta)}
                className="text-blue-400 hover:text-blue-300 transition"
                title="Editar conta"
              >
                <Edit size={16} />
              </button>
              <button 
                onClick={() => desativarConta(conta)}
                className={`${conta.ativo ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'} transition`}
                title={conta.ativo ? "Desativar conta" : "Ativar conta"}
              >
                <Trash2 size={16} />
              </button>
            </div>
            </td>
          </tr>
        {isExpanded && hasChildren && conta.filhos.map(filho => renderizarConta(filho, nivel + 1))}
      </React.Fragment>
    );
  };

  // Totais por classe (incluindo classes > 9)
  const classesUnicas = [...new Set(contas.filter(c => c.ativo !== false).map(c => c.classe))].sort((a, b) => a - b);
  const totaisPorClasse = classesUnicas.map(classe => ({
    classe,
    total: contas.filter(c => c.classe === classe && c.ativo !== false).length
  }));

  if (loading) {
    return (
      <Layout title="Plano de Contas - PGCA" showBackButton backToRoute="/contabilidade">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Plano de Contas - PGCA" showBackButton backToRoute="/contabilidade">
      <div className="space-y-6 p-4">
        {/* Cabeçalho */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BookOpen size={28} className="text-blue-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Plano de Contas Geral</h2>
                <p className="text-gray-400 text-sm">PGCA - Angola | Códigos sem limite de níveis (ex: 1, 11, 11.1, 11.2.1.1, 1.2.3.4.5.6.7.8.9.10)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Database size={18} className="text-gray-400" />
              <span className="text-gray-300 text-sm">{contas.filter(c => c.ativo !== false).length} contas activas</span>
              <button 
                onClick={() => abrirModalCriarConta()}
                className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-white flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> Nova Conta
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por código ou nome..."
                  className="bg-gray-700 rounded-lg pl-10 pr-4 py-2 text-white w-64"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>
              <select
                className="bg-gray-700 rounded-lg px-3 py-2 text-white"
                value={classeFiltro}
                onChange={(e) => setClasseFiltro(e.target.value)}
              >
                <option value="todas">Todas as Classes</option>
                {classesUnicas.map(classe => (
                  <option key={classe} value={classe}>Classe {classe}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={toggleExpandirTodas} 
                className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg text-white flex items-center gap-2"
              >
                {expandirTodas ? <Minus size={16} /> : <Plus size={16} />}
                {expandirTodas ? "Colapsar Tudo" : "Expandir Tudo"}
              </button>
              <button onClick={buscarPlanoContas} className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg text-white">
                <RefreshCw size={18} />
              </button>
              <button className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-white">
                <Download size={18} />
              </button>
              <button className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-white">
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas por Classe */}
        <div className="flex flex-wrap gap-2">
          {totaisPorClasse.map(({ classe, total }) => (
            <div 
              key={classe}
              onClick={() => setClasseFiltro(classe.toString())}
              className={`cursor-pointer rounded-lg p-2 text-center border transition min-w-[60px] ${getClasseBg(classe)} ${
                classeFiltro === classe.toString() ? 'ring-2 ring-offset-1 ring-offset-gray-800 ring-blue-500' : ''
              }`}
            >
              <div className={`text-lg font-bold ${getClasseCor(classe)}`}>{classe}</div>
              <div className="text-xs text-gray-400">{total} contas</div>
            </div>
          ))}
        </div>

        {/* Tabela de Contas com Hierarquia */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr className="text-left text-gray-300">
                  <th className="p-3 w-40">Código</th>
                  <th className="p-3">Nome da Conta</th>
                  <th className="p-3 w-24 text-center">Classe</th>
                  <th className="p-3 w-28 text-center">Natureza</th>
                  <th className="p-3 w-24 text-center">Nível</th>
                  <th className="p-3 w-32 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {arvoreContas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-8 text-gray-400">
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  arvoreContas.map(conta => renderizarConta(conta, 0))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal para Criar/Editar Conta */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  {modalType === "edit" ? "Editar Conta" : 
                   contaSelecionada ? `Criar Subconta de ${contaSelecionada.codigo}` : "Criar Nova Conta"}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Código da Conta *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white font-mono"
                    value={novaConta.codigo}
                    onChange={(e) => {
                      setNovaConta({...novaConta, codigo: e.target.value});
                      setErroValidacao("");
                      setSucessoValidacao("");
                    }}
                    placeholder="Ex: 1, 11, 11.1, 11.2.1.1, 1.2.3.4.5.6.7.8.9.10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Sem limite de níveis. Use pontos para separar (ex: 1.2.3.4.5)</p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nome da Conta *</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                    value={novaConta.nome}
                    onChange={(e) => setNovaConta({...novaConta, nome: e.target.value})}
                    placeholder="Ex: Clientes - Luanda, Despesas de Electricidade"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Natureza</label>
                  <select
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                    value={novaConta.natureza}
                    onChange={(e) => setNovaConta({...novaConta, natureza: e.target.value})}
                  >
                    <option value="Devedora">Devedora (Activo, Custos)</option>
                    <option value="Credora">Credora (Passivo, Proveitos)</option>
                    <option value="Mista">Mista (Terceiros, Resultados)</option>
                  </select>
                </div>
                
                {novaConta.pai && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Conta Pai</label>
                    <input
                      type="text"
                      className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white font-mono"
                      value={novaConta.pai}
                      disabled
                    />
                  </div>
                )}
                
                {/* Informação do nível calculado */}
                <div className="bg-gray-700/50 rounded-lg p-2">
                  <p className="text-xs text-gray-400">
                    Nível calculado: <strong className="text-white">{calcularNivel(novaConta.codigo)}</strong>
                    {novaConta.codigo && ` | Classe: ${determinarClasse(novaConta.codigo)}`}
                  </p>
                </div>
                
                {erroValidacao && (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-300 text-sm">{erroValidacao}</span>
                  </div>
                )}
                {sucessoValidacao && (
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-2 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-green-300 text-sm">{sucessoValidacao}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarConta}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white flex items-center gap-2"
                >
                  <Save size={16} /> {modalType === "edit" ? "Actualizar" : "Criar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legenda */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Informações</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <FolderPlus size={14} className="text-green-400" />
              <span className="text-gray-400">Criar subcontas em qualquer nível</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">∞</span>
              <span className="text-gray-400">Sem limite de profundidade (nível 1, 2, 3, ... 10, 20, 100)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">📌</span>
              <span className="text-gray-400">Códigos válidos: 1, 11, 11.1, 11.1.1, 1.2.3.4.5, 10.20.30.40</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">💡</span>
              <span className="text-gray-400">A classe é determinada pelo primeiro dígito do código</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PlanoContas;