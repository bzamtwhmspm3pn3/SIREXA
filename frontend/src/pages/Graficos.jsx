import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, BarChart, Bar,
  PieChart, Pie, Cell
} from "recharts";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  RefreshCw,
  Printer,
  Loader2,
  Building,
  DollarSign,
  Percent,
  Wallet,
  Target,
  Activity,
  Users,
  Package,
  Eye
} from "lucide-react";

export default function Graficos() {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [dados, setDados] = useState({
    evolucao: [],
    distribuicao: [],
    fluxo: [],
    indicadores: [],
    topFornecedores: [],
    recursosHumanos: {
      totalFuncionarios: 0,
      totalSalarioAnual: 0,
      salarioMedio: 0,
      custoMensal: [],
      funcionariosPorDepartamento: []
    },
    clientes: {
      topClientes: [],
      clientesPorCategoria: []
    },
    produtos: {
      topProdutos: []
    },
    custosDepartamento: []
  });
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [periodo, setPeriodo] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("evolucao");

  const BASE_URL = "https://sirexa-api.onrender.com";
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const cores = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec489a", "#06b6d4", "#84cc16"];

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarAnosDisponiveis();
      carregarDadosCompletos();
    }
  }, [empresaSelecionada, periodo]);

  const carregarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
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
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarAnosDisponiveis = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/graficos/anos-disponiveis?empresaId=${empresaSelecionada}`, { headers: getHeaders() });
      const data = await response.json();
      setAnosDisponiveis(data.anos || [new Date().getFullYear()]);
    } catch (error) {
      const anoAtual = new Date().getFullYear();
      const anos = [];
      for (let i = anoAtual - 5; i <= anoAtual + 1; i++) anos.push(i);
      setAnosDisponiveis(anos);
    }
  };

  const carregarDadosCompletos = async () => {
    setLoading(true);
    try {
      const [dashboardRes, funcionariosRes, clientesRes, topClientesRes, produtosRes, custosDeptoRes] = await Promise.all([
        fetch(`${BASE_URL}/api/graficos/dashboard?empresaId=${empresaSelecionada}&ano=${periodo.ano}`, { headers: getHeaders() }),
        fetch(`${BASE_URL}/api/graficos/custo-funcionarios?empresaId=${empresaSelecionada}&ano=${periodo.ano}`, { headers: getHeaders() }),
        fetch(`${BASE_URL}/api/graficos/clientes-categoria?empresaId=${empresaSelecionada}`, { headers: getHeaders() }),
        fetch(`${BASE_URL}/api/graficos/top-clientes?empresaId=${empresaSelecionada}&ano=${periodo.ano}`, { headers: getHeaders() }),
        fetch(`${BASE_URL}/api/graficos/top-produtos?empresaId=${empresaSelecionada}&ano=${periodo.ano}`, { headers: getHeaders() }),
        fetch(`${BASE_URL}/api/graficos/custos-departamento?empresaId=${empresaSelecionada}&ano=${periodo.ano}`, { headers: getHeaders() })
      ]);

      const dashboard = await dashboardRes.json();
      const funcionarios = await funcionariosRes.json();
      const clientesCat = await clientesRes.json();
      const topClientesData = await topClientesRes.json();
      const produtosData = await produtosRes.json();
      const custosDepto = await custosDeptoRes.json();

      setDados({
        evolucao: dashboard.sucesso ? dashboard.dados.evolucao : [],
        distribuicao: dashboard.sucesso ? dashboard.dados.distribuicao : [],
        fluxo: dashboard.sucesso ? dashboard.dados.fluxo : [],
        indicadores: dashboard.sucesso ? dashboard.dados.indicadores : [],
        topFornecedores: dashboard.sucesso ? dashboard.dados.topFornecedores : [],
        recursosHumanos: funcionarios.sucesso ? funcionarios.dados : {
          totalFuncionarios: 0,
          totalSalarioAnual: 0,
          salarioMedio: 0,
          custoMensal: [],
          funcionariosPorDepartamento: []
        },
        clientes: {
          topClientes: topClientesData.sucesso ? topClientesData.dados : [],
          clientesPorCategoria: clientesCat.sucesso ? clientesCat.dados : []
        },
        produtos: {
          topProdutos: produtosData.sucesso ? produtosData.dados : []
        },
        custosDepartamento: custosDepto.sucesso ? custosDepto.dados : []
      });
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatarNumero = (numero) => {
    if (!numero && numero !== 0) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatarMoeda = (numero) => `${formatarNumero(numero)} Kz`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-2 rounded-lg shadow-lg border border-blue-500 text-xs">
          <p className="font-semibold text-white mb-1 border-b border-gray-600 pb-1">{label}</p>
          {payload.map((p, idx) => (
            <p key={idx} className="text-xs" style={{ color: p.color || p.fill }}>
              {p.name}: {p.name.includes("%") ? `${p.value}%` : formatarMoeda(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const imprimirRelatorio = () => {
    const printContent = document.getElementById("graficos-content");
    if (!printContent) return;
    
    const win = window.open("", "", "width=1200,height=800");
    win.document.write(`
      <html>
        <head>
          <title>Relatório - Gráficos Financeiros</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2563eb; text-align: center; font-size: 20px; }
            h2 { color: #1e40af; margin-top: 20px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 12px; }
            th { background-color: #f3f4f6; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
            .card { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <h1>📊 Relatório Gerencial</h1>
          <p><strong>Empresa:</strong> ${empresas.find(e => e._id === empresaSelecionada)?.nome || (isTecnico() ? userEmpresaNome : "Empresa")}</p>
          <p><strong>Período:</strong> ${meses[periodo.mes - 1]} de ${periodo.ano}</p>
          ${printContent.innerHTML}
          <div class="footer">
            <p>Sistema de Gestão Empresarial - ${new Date().toLocaleDateString("pt-AO")}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const abas = [
    { id: "evolucao", nome: "Evolução", icon: <TrendingUp size={14} /> },
    { id: "distribuicao", nome: "Distribuição", icon: <PieChartIcon size={14} /> },
    { id: "indicadores", nome: "Indicadores", icon: <Activity size={14} /> },
    { id: "clientes", nome: "Clientes", icon: <Users size={14} /> },
    { id: "produtos", nome: "Produtos", icon: <Package size={14} /> }
  ];

  if (loadingEmpresas) {
    return (
      <Layout title="Dashboard de Métricas" showBackButton={true} backToRoute="/menu">
        <div className="flex justify-center items-center h-96">
          <Loader2 size={40} className="animate-spin mx-auto text-blue-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard de Métricas" showBackButton={true} backToRoute="/menu">
      <div className="p-3 space-y-4 max-w-full">
        {/* Mensagem de toast */}
        {mensagem && (
          <div className={`p-2 rounded-lg text-center text-sm ${
            tipoMensagem === "sucesso" ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"
          }`}>
            {mensagem}
          </div>
        )}

        {/* Seletor de Empresa */}
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => carregarDadosCompletos()}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <Building className="mx-auto mb-3 text-gray-500" size={40} />
            <p className="text-gray-400">Selecione uma empresa para começar</p>
          </div>
        ) : (
          <>
            {/* Informação do Técnico */}
            {isTecnico() && (
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-2 text-center">
                <span className="text-blue-400 text-sm">📌 Empresa: <strong>{userEmpresaNome}</strong></span>
              </div>
            )}

            {/* Barra de controle superior */}
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const idx = anosDisponiveis.indexOf(periodo.ano);
                        if (idx > 0) setPeriodo({ ...periodo, ano: anosDisponiveis[idx - 1] });
                      }}
                      disabled={anosDisponiveis.indexOf(periodo.ano) === 0}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-2 py-1 rounded text-white text-sm"
                    >◀</button>
                    <select
                      value={periodo.ano}
                      onChange={(e) => setPeriodo({ ...periodo, ano: parseInt(e.target.value) })}
                      className="px-2 py-1 rounded bg-gray-700 text-white text-sm"
                    >
                      {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                    </select>
                    <button
                      onClick={() => {
                        const idx = anosDisponiveis.indexOf(periodo.ano);
                        if (idx < anosDisponiveis.length - 1) setPeriodo({ ...periodo, ano: anosDisponiveis[idx + 1] });
                      }}
                      disabled={anosDisponiveis.indexOf(periodo.ano) === anosDisponiveis.length - 1}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-2 py-1 rounded text-white text-sm"
                    >▶</button>
                  </div>
                  <select
                    value={periodo.mes}
                    onChange={(e) => setPeriodo({ ...periodo, mes: parseInt(e.target.value) })}
                    className="px-2 py-1 rounded bg-gray-700 text-white text-sm"
                  >
                    {meses.map((mes, idx) => <option key={idx} value={idx + 1}>{mes.substring(0, 3)}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={carregarDadosCompletos} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                    <RefreshCw size={14} /> Atualizar
                  </button>
                  <button onClick={imprimirRelatorio} className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                    <Printer size={14} /> Imprimir
                  </button>
                </div>
              </div>
            </div>

            {/* Abas simplificadas */}
            <div className="border-b border-gray-700 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {abas.map(aba => (
                  <button
                    key={aba.id}
                    onClick={() => setAbaAtiva(aba.id)}
                    className={`px-3 py-1.5 rounded-t-lg flex items-center gap-1 text-sm transition ${
                      abaAtiva === aba.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {aba.icon} {aba.nome}
                  </button>
                ))}
              </div>
            </div>

            <div id="graficos-content" className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 size={32} className="animate-spin text-blue-400" />
                </div>
              ) : (
                <>
                  {/* ABA 1: Evolução */}
                  {abaAtiva === "evolucao" && dados.evolucao.length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <h2 className="text-base font-bold text-blue-400 mb-2">📈 Receita vs Custo</h2>
                        <div className="w-full h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dados.evolucao}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                              <XAxis dataKey="mes" stroke="#cbd5e1" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#cbd5e1" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                              <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} name="Receita" dot={false} />
                              <Line type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} name="Custo" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-lg p-3">
                        <h2 className="text-base font-bold text-blue-400 mb-2">💰 Evolução do Lucro</h2>
                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dados.evolucao}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                              <XAxis dataKey="mes" stroke="#cbd5e1" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#cbd5e1" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="lucro" fill="#8b5cf6" name="Lucro" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABA 2: Distribuição */}
                  {abaAtiva === "distribuicao" && dados.distribuicao.length > 0 && (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <h2 className="text-base font-bold text-blue-400 mb-2">🥧 Distribuição por Categoria</h2>
                        <div className="w-full h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={dados.distribuicao} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={100} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                {dados.distribuicao.map((entry, idx) => <Cell key={idx} fill={entry.cor || cores[idx % cores.length]} />)}
                              </Pie>
                              <Tooltip formatter={(value) => formatarMoeda(value)} />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABA 3: Indicadores */}
                  {abaAtiva === "indicadores" && dados.indicadores.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-3">
                      <h2 className="text-base font-bold text-blue-400 mb-2">📊 Evolução dos Indicadores</h2>
                      <div className="w-full h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dados.indicadores}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                            <XAxis dataKey="mes" stroke="#cbd5e1" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="left" stroke="#cbd5e1" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                            <YAxis yAxisId="right" orientation="right" stroke="#cbd5e1" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} width={30} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Line yAxisId="left" type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} name="Receita" dot={false} />
                            <Line yAxisId="left" type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} name="Custo" dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="margem" stroke="#8b5cf6" strokeWidth={2} name="Margem (%)" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ABA 4: Clientes */}
                  {abaAtiva === "clientes" && dados.clientes.topClientes.length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <h2 className="text-base font-bold text-blue-400 mb-2">🏆 Top Clientes</h2>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {dados.clientes.topClientes.slice(0, 8).map((cliente, idx) => (
                            <div key={idx} className="bg-gray-700 rounded-lg p-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-white text-sm">#{idx + 1} {cliente.nome}</span>
                                <span className="font-bold text-amber-400 text-sm">{formatarMoeda(cliente.valor)}</span>
                              </div>
                              <div className="w-full bg-gray-600 rounded-full h-1.5">
                                <div className="bg-blue-500 rounded-full h-1.5" style={{ width: `${(cliente.valor / dados.clientes.topClientes[0]?.valor) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {dados.clientes.clientesPorCategoria.length > 0 && (
                        <div className="bg-gray-800 rounded-lg p-3">
                          <h2 className="text-base font-bold text-blue-400 mb-2">👥 Clientes por Categoria</h2>
                          <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={dados.clientes.clientesPorCategoria} dataKey="quantidade" nameKey="nome" cx="50%" cy="50%" outerRadius={80} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                  {dados.clientes.clientesPorCategoria.map((entry, idx) => <Cell key={idx} fill={entry.cor || cores[idx % cores.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} clientes`} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ABA 5: Produtos */}
                  {abaAtiva === "produtos" && dados.produtos.topProdutos.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-3">
                      <h2 className="text-base font-bold text-blue-400 mb-2">📦 Produtos Mais Vendidos</h2>
                      <div className="space-y-2">
                        {dados.produtos.topProdutos.slice(0, 6).map((produto, idx) => (
                          <div key={idx} className="bg-gray-700 rounded-lg p-2 flex justify-between items-center">
                            <span className="text-white text-sm">#{idx + 1} {produto.nome}</span>
                            <span className="text-amber-400 text-sm font-semibold">{produto.quantidade} unidades</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="text-center text-xs text-gray-500 pt-3 border-t border-gray-700">
              <p>Período: {meses[periodo.mes - 1]} de {periodo.ano}</p>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}