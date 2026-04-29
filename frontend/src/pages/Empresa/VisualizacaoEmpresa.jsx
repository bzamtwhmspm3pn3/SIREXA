import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  Edit,
  Trash2,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Users,
  Briefcase,
  Landmark,
  FileText,
  Globe,
  Smartphone,
  CreditCard,
  Hash,
  Home,
  Building,
  DollarSign,
  Printer,
  Download,
  Share2,
  AlertTriangle,
  Copy,
  Check,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Percent,
  Shield,
  TrendingUp
} from 'lucide-react';

const VisualizacaoEmpresa = () => {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [copiado, setCopiado] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    carregarEmpresa();
  }, [id]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const carregarEmpresa = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${id}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      setEmpresa(data);
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar empresa", "erro");
    } finally {
      setLoading(false);
    }
  };

  const copiarParaClipboard = (texto, campo) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    mostrarMensagem(`${campo} copiado para a área de transferência!`, "sucesso");
    setTimeout(() => setCopiado(false), 2000);
  };

  const confirmarExclusao = () => {
    setShowDeleteModal(true);
  };

  const excluirEmpresa = async () => {
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      
      if (response.ok) {
        mostrarMensagem("✅ Empresa excluída com sucesso!", "sucesso");
        setTimeout(() => navigate("/empresa"), 2000);
      } else {
        mostrarMensagem("Erro ao excluir empresa", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const imprimirRelatorio = () => {
    window.print();
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA',
      minimumFractionDigits: 0
    }).format(valor);
  };

  const formatarPercentual = (valor) => {
    return `${(valor * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Layout title="Detalhes da Empresa" showBackButton={true} backToRoute="/empresa">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-400">Carregando dados da empresa...</p>
        </div>
      </Layout>
    );
  }

  if (!empresa) {
    return (
      <Layout title="Detalhes da Empresa" showBackButton={true} backToRoute="/empresa">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center">
          <div className="bg-red-500/10 rounded-full p-6 mb-4 inline-flex">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
          <p className="text-gray-400 text-lg">Empresa não encontrada</p>
          <button
            onClick={() => navigate("/empresa")}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Voltar para lista
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={empresa.nome} showBackButton={true} backToRoute="/empresa">
      {/* Toast Notification */}
      {mensagem.texto && (
        <div className={`fixed top-20 right-4 z-50 animate-slide-in-right`}>
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl backdrop-blur-sm ${
            mensagem.tipo === "sucesso" 
              ? "bg-green-600/95 border border-green-400" 
              : "bg-red-600/95 border border-red-400"
          } text-white`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-700 animate-scale-in">
            <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirmar Exclusão</h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-300">
                Tem certeza que deseja excluir a empresa <strong className="text-white">{empresa.nome}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">Esta ação não pode ser desfeita.</p>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={excluirEmpresa}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho da Empresa */}
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {empresa.logotipo ? (
                  <img 
                    src={`https://sirexa-api.onrender.com/uploads/${empresa.logotipo}`}
                    alt={empresa.nome}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <Building2 className="w-10 h-10 text-white" />
                  </div>
                )}
                
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{empresa.nome}</h1>
                  {empresa.nomeComercial && (
                    <p className="text-gray-400 mt-1">{empresa.nomeComercial}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-sm text-gray-400">NIF: {empresa.nif}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      empresa.ativo 
                        ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                      {empresa.ativo ? "Ativo" : "Inativo"}
                    </span>
                    {empresa.isBaixosRendimentos && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Baixos Rendimentos
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/empresa/editar/${empresa._id}`)}
                  className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  <Edit size={18} /> Editar
                </button>
                <button
                  onClick={confirmarExclusao}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  <Trash2 size={18} /> Excluir
                </button>
                <button
                  onClick={imprimirRelatorio}
                  className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600 text-gray-400 hover:text-white rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  <Printer size={18} /> Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Esquerda - Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações de Contacto */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold text-white">Contactos</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {empresa.contactos?.email && (
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="text-white">{empresa.contactos.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copiarParaClipboard(empresa.contactos.email, "Email")}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-600 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}
                
                {empresa.contactos?.telefone && (
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-xs text-gray-400">Telefone</p>
                        <p className="text-white">{empresa.contactos.telefone}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copiarParaClipboard(empresa.contactos.telefone, "Telefone")}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-600 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                )}
                
                {empresa.contactos?.telefoneAlternativo && (
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <Phone className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-xs text-gray-400">Telefone Alternativo</p>
                      <p className="text-white">{empresa.contactos.telefoneAlternativo}</p>
                    </div>
                  </div>
                )}
                
                {empresa.contactos?.whatsapp && (
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs text-gray-400">WhatsApp</p>
                      <p className="text-white">{empresa.contactos.whatsapp}</p>
                    </div>
                  </div>
                )}
                
                {empresa.contactos?.website && (
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <Globe className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-xs text-gray-400">Website</p>
                      <a 
                        href={empresa.contactos.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {empresa.contactos.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Endereço */}
            {(empresa.endereco?.rua || empresa.endereco?.cidade) && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-400" />
                    <h2 className="text-lg font-bold text-white">Endereço</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-2">
                    {empresa.endereco?.rua && (
                      <p className="text-white">
                        {empresa.endereco.rua}
                        {empresa.endereco.numero && `, ${empresa.endereco.numero}`}
                      </p>
                    )}
                    {empresa.endereco?.bairro && (
                      <p className="text-gray-300">Bairro: {empresa.endereco.bairro}</p>
                    )}
                    {(empresa.endereco?.cidade || empresa.endereco?.provincia) && (
                      <p className="text-gray-300">
                        {empresa.endereco.cidade}
                        {empresa.endereco.cidade && empresa.endereco.provincia && ", "}
                        {empresa.endereco.provincia}
                      </p>
                    )}
                    {empresa.endereco?.pais && (
                      <p className="text-gray-300">{empresa.endereco.pais}</p>
                    )}
                    {empresa.endereco?.codigoPostal && (
                      <p className="text-gray-300">Código Postal: {empresa.endereco.codigoPostal}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coluna da Direita - Informações Adicionais */}
          <div className="space-y-6">
            {/* CONFIGURAÇÕES FISCAIS - INSS e IRT */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white">Configurações Fiscais</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Regime INSS */}
                <div className="border-b border-gray-700 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">Regime INSS</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      empresa.isBaixosRendimentos 
                        ? "bg-yellow-500/20 text-yellow-400" 
                        : "bg-green-500/20 text-green-400"
                    }`}>
                      {empresa.isBaixosRendimentos ? "Baixos Rendimentos" : "Regime Normal"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400">INSS Colaborador</p>
                      <p className="text-lg font-bold text-blue-400">{formatarPercentual(empresa.inssColaboradorTaxa || 0.03)}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400">INSS Empregador</p>
                      <p className="text-lg font-bold text-purple-400">{formatarPercentual(empresa.inssEmpregadorTaxa || 0.08)}</p>
                    </div>
                  </div>
                </div>

                {/* Regime IRT */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">Regime IRT</p>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                      {empresa.irtTipoCalculo === 'progressivo' ? 'Progressivo' : 'Taxa Fixa'}
                    </span>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    {empresa.irtTipoCalculo === 'fixo' && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Taxa Fixa IRT</span>
                        <span className="text-lg font-bold text-green-400">{formatarPercentual(empresa.irtTaxaFixa || 0.065)}</span>
                      </div>
                    )}
                    {empresa.irtTipoCalculo === 'progressivo' && (
                      <div>
                        <p className="text-sm text-gray-300">Tabela Progressiva</p>
                        <p className="text-xs text-gray-500 mt-1">Conforme Lei Geral do Trabalho de Angola</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <TrendingUp size={12} />
                    IRT definido individualmente por funcionário (Grupo A ou B)
                  </p>
                </div>

                {/* IVA */}
                {(empresa.taxaIVA !== undefined || empresa.regimeIva) && (
                  <div className="border-t border-gray-700 pt-3 mt-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-400">Taxa de IVA</p>
                      <p className="text-white font-medium">{empresa.taxaIVA || 14}%</p>
                    </div>
                    {empresa.incluiRetencao && (
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-400">Retenção na Fonte</p>
                        <p className="text-white font-medium">{empresa.taxaRetencao || 7}%</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dados Bancários */}
            {(empresa.banco || empresa.iban || empresa.swift) && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-lg font-bold text-white">Dados Bancários</h2>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {empresa.banco && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Banco</p>
                      <p className="text-white">{empresa.banco}</p>
                    </div>
                  )}
                  {empresa.iban && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">IBAN</p>
                      <p className="text-white font-mono text-sm break-all">{empresa.iban}</p>
                    </div>
                  )}
                  {empresa.swift && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">SWIFT/BIC</p>
                      <p className="text-white font-mono">{empresa.swift}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dados Corporativos */}
            {(empresa.capitalSocial > 0 || empresa.numeroFuncionarios > 0 || empresa.objetoSocial) && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-bold text-white">Dados Corporativos</h2>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {empresa.capitalSocial > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Capital Social</p>
                      <p className="text-white">{formatarMoeda(empresa.capitalSocial)}</p>
                    </div>
                  )}
                  {empresa.numeroFuncionarios > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Nº de Funcionários</p>
                      <p className="text-white">{empresa.numeroFuncionarios}</p>
                    </div>
                  )}
                  {empresa.objetoSocial && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Objeto Social</p>
                      <p className="text-white text-sm leading-relaxed">{empresa.objetoSocial}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações do Sistema */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600/20 to-gray-700/20 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-bold text-white">Informações do Sistema</h2>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Data de Cadastro</p>
                  <p className="text-white">{new Date(empresa.createdAt).toLocaleDateString('pt-PT')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Última Atualização</p>
                  <p className="text-white">{new Date(empresa.updatedAt).toLocaleDateString('pt-PT')}</p>
                </div>
              </div>
            </div>

            {/* Botão de Relatório Completo */}
            <button
              onClick={() => navigate(`/empresa/relatorio/${empresa._id}`)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/25"
            >
              <FileText className="w-5 h-5" />
              Gerar Relatório Completo
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </Layout>
  );
};

export default VisualizacaoEmpresa;