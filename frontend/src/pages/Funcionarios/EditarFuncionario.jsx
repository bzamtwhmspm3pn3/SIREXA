import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, ArrowLeft, UserCog, Upload, X, Building2, 
  Mail, Phone, Briefcase, Calendar, DollarSign, CreditCard,
  Users, MapPin, Hash, Globe, Heart, Cake, Award, Clock,
  Shield, UserCheck, AlertCircle,CheckCircle
} from "lucide-react";

const EditarFuncionario = () => {
  const [formData, setFormData] = useState({
    // Dados Pessoais
    nome: "", 
    nif: "",
    dataNascimento: "",
    genero: "",
    estadoCivil: "",
    nacionalidade: "Angolana",
    email: "", 
    telefone: "", 
    endereco: "",
    // Dados Profissionais
    funcao: "",
    departamento: "",
    dataAdmissao: "",
    tipoContrato: "Efetivo",
    status: "Ativo",
    salarioBase: "",
    horasSemanais: 40,
    horasDiarias: 8,
    // Dados Bancários
    banco: "",
    numeroConta: "",
    iban: "",
    titularConta: "",
    // Tributação
    grupoIRT: "A",
    dependentes: 0,
    // Segurança Social
    contribuiINSS: true,
    // Status
    ativo: true
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [empresas, setEmpresas] = useState([]);
  
  const { user, isTecnico, empresaId: userEmpresaId } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarFuncionario();
    }
  }, [empresaSelecionada]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const formatarData = (data) => {
    if (!data) return "";
    try {
      return new Date(data).toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  const carregarEmpresas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      
      if (isTecnico() && userEmpresaId) {
        setEmpresaSelecionada(userEmpresaId);
      } else if (empresasList.length > 0) {
        setEmpresaSelecionada(empresasList[0]._id);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    }
  };

  const carregarFuncionario = async () => {
    if (!empresaSelecionada) return;
    
    setLoadingData(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/funcionarios/${id}?empresaId=${empresaSelecionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        mostrarMensagem("Acesso negado a este funcionário", "erro");
        navigate("/funcionarios");
        return;
      }
      
      const data = await response.json();
      console.log("📊 Dados carregados:", data);
      
      setFormData({
        // Dados Pessoais
        nome: data.nome || "",
        nif: data.nif || "",
        dataNascimento: formatarData(data.dataNascimento),
        genero: data.genero || "",
        estadoCivil: data.estadoCivil || "",
        nacionalidade: data.nacionalidade || "Angolana",
        email: data.email || "",
        telefone: data.telefone || "",
        endereco: data.endereco || "",
        // Dados Profissionais
        funcao: data.funcao || data.cargo || "",
        departamento: data.departamento || "",
        dataAdmissao: formatarData(data.dataAdmissao || data.dataContratacao),
        tipoContrato: data.tipoContrato || "Efetivo",
        status: data.status || "Ativo",
        salarioBase: data.salarioBase || "",
        horasSemanais: data.horasSemanais || 40,
        horasDiarias: data.horasDiarias || 8,
        // Dados Bancários
        banco: data.banco || "",
        numeroConta: data.numeroConta || "",
        iban: data.iban || "",
        titularConta: data.titularConta || "",
        // Tributação
        grupoIRT: data.grupoIRT || "A",
        dependentes: data.dependentes || 0,
        // Segurança Social - Se o campo não existir, padrão é true
        contribuiINSS: data.contribuiINSS !== undefined ? data.contribuiINSS : true,
        // Status
        ativo: data.ativo !== undefined ? data.ativo : true
      });
      
      if (data.foto) {
        setFotoPreview(`http://localhost:5000${data.foto}`);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar funcionário", "erro");
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removerFoto = () => {
    setFotoPreview(null);
    setFotoFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const submitData = new FormData();
    
    // Dados Pessoais
    submitData.append("nome", formData.nome);
    submitData.append("nif", formData.nif);
    submitData.append("dataNascimento", formData.dataNascimento);
    submitData.append("genero", formData.genero);
    submitData.append("estadoCivil", formData.estadoCivil);
    submitData.append("nacionalidade", formData.nacionalidade);
    submitData.append("email", formData.email);
    submitData.append("telefone", formData.telefone);
    submitData.append("endereco", formData.endereco);
    
    // Dados Profissionais
    submitData.append("funcao", formData.funcao);
    submitData.append("departamento", formData.departamento);
    submitData.append("dataAdmissao", formData.dataAdmissao);
    submitData.append("tipoContrato", formData.tipoContrato);
    submitData.append("status", formData.status);
    submitData.append("salarioBase", formData.salarioBase);
    submitData.append("horasSemanais", formData.horasSemanais);
    submitData.append("horasDiarias", formData.horasDiarias);
    
    // Dados Bancários
    submitData.append("banco", formData.banco);
    submitData.append("numeroConta", formData.numeroConta);
    submitData.append("iban", formData.iban);
    submitData.append("titularConta", formData.titularConta);
    
    // Tributação
    submitData.append("grupoIRT", formData.grupoIRT);
    submitData.append("dependentes", formData.dependentes);
    
    // Segurança Social
    submitData.append("contribuiINSS", formData.contribuiINSS);
    
    // Status
    submitData.append("ativo", formData.ativo);
    submitData.append("empresaId", empresaSelecionada);
    
    if (fotoFile) {
      submitData.append("foto", fotoFile);
    }
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/funcionarios/${id}?empresaId=${empresaSelecionada}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: submitData
      });

      if (response.ok) {
        mostrarMensagem("✅ Funcionário atualizado com sucesso!", "sucesso");
        setTimeout(() => navigate("/funcionarios"), 1500);
      } else {
        const error = await response.json();
        mostrarMensagem(error.mensagem || "Erro ao atualizar", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Layout title="Editar Funcionário" showBackButton={true} backToRoute="/funcionarios">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Carregando dados do funcionário...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editar Funcionário" showBackButton={true} backToRoute="/funcionarios">
      {mensagem.texto && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
        } text-white`}>
          {mensagem.texto}
        </div>
      )}

      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg p-6">
        {/* Seletor de Empresa */}
        {!isTecnico() && empresas.length > 1 && (
          <div className="mb-6 p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="text-blue-400" size={20} />
              <span className="text-gray-300">Empresa:</span>
              <select
                className="flex-1 p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                value={empresaSelecionada}
                onChange={(e) => setEmpresaSelecionada(e.target.value)}
              >
                {empresas.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.nome}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <UserCog className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-white">Editar Funcionário</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              {fotoPreview ? (
                <div className="relative">
                  <img 
                    src={fotoPreview} 
                    alt="Foto" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={removerFoto}
                    className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 hover:bg-red-700"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 hover:border-blue-500 transition flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400">Foto</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Seção 1: Dados Pessoais */}
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1">Nome Completo *</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">NIF *</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} required />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Data Nascimento</label>
                <input type="date" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.dataNascimento} onChange={(e) => setFormData({...formData, dataNascimento: e.target.value})} />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Género</label>
                <select className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.genero} onChange={(e) => setFormData({...formData, genero: e.target.value})}>
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Estado Civil</label>
                <select className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.estadoCivil} onChange={(e) => setFormData({...formData, estadoCivil: e.target.value})}>
                  <option value="">Selecione</option>
                  <option value="Solteiro">Solteiro(a)</option>
                  <option value="Casado">Casado(a)</option>
                  <option value="Divorciado">Divorciado(a)</option>
                  <option value="Viúvo">Viúvo(a)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Nacionalidade</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.nacionalidade} onChange={(e) => setFormData({...formData, nacionalidade: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-1">Endereço</label>
                <textarea rows="2" className="w-full p-2 rounded bg-gray-700 text-white resize-none"
                  value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Seção 2: Contactos */}
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Contactos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Email</label>
                <input type="email" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Telefone</label>
                <input type="tel" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Seção 3: Dados Profissionais */}
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Dados Profissionais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Função *</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.funcao} onChange={(e) => setFormData({...formData, funcao: e.target.value})} required />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Departamento</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.departamento} onChange={(e) => setFormData({...formData, departamento: e.target.value})} />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Data Admissão</label>
                <input type="date" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.dataAdmissao} onChange={(e) => setFormData({...formData, dataAdmissao: e.target.value})} />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Tipo Contrato</label>
                <select className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.tipoContrato} onChange={(e) => setFormData({...formData, tipoContrato: e.target.value})}>
                  <option value="Efetivo">Efetivo</option>
                  <option value="Estágio">Estágio</option>
                  <option value="Temporário">Temporário</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Status</label>
                <select className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Licença">Licença</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Salário Base (Kz) *</label>
                <input type="number" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.salarioBase} onChange={(e) => setFormData({...formData, salarioBase: e.target.value})} required />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Horas Semanais</label>
                <input type="number" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.horasSemanais} onChange={(e) => setFormData({...formData, horasSemanais: e.target.value})} />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Horas Diárias</label>
                <input type="number" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.horasDiarias} onChange={(e) => setFormData({...formData, horasDiarias: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Seção 4: Dados Bancários */}
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Dados Bancários
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Banco</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.banco} onChange={(e) => setFormData({...formData, banco: e.target.value})} />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Nº Conta</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.numeroConta} onChange={(e) => setFormData({...formData, numeroConta: e.target.value})} />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">IBAN</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.iban} onChange={(e) => setFormData({...formData, iban: e.target.value})} />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Titular Conta</label>
                <input type="text" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.titularConta} onChange={(e) => setFormData({...formData, titularConta: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Seção 5: Tributação */}
          <div className="bg-gray-700/30 rounded-xl p-4">
            <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" /> Tributação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-1">Grupo IRT</label>
                <select className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.grupoIRT} onChange={(e) => setFormData({...formData, grupoIRT: e.target.value})}>
                  <option value="A">Grupo A</option>
                  <option value="B">Grupo B</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Nº Dependentes</label>
                <input type="number" className="w-full p-2 rounded bg-gray-700 text-white"
                  value={formData.dependentes} onChange={(e) => setFormData({...formData, dependentes: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Seção 6: Segurança Social (INSS) - NOVA SEÇÃO */}
          <div className="bg-gray-700/30 rounded-xl p-4 border border-cyan-500/30">
            <h3 className="text-md font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Segurança Social (INSS)
            </h3>
            <div className="bg-cyan-600/10 rounded-lg p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <UserCheck className="text-cyan-400" size={20} />
                  <div>
                    <p className="text-white font-medium">Contribui para a Segurança Social?</p>
                    <p className="text-sm text-gray-400">
                      Se marcado "Sim", o INSS será descontado do salário do funcionário.
                      <br />
                      Se marcado "Não", o funcionário não terá desconto de INSS.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${!formData.contribuiINSS ? 'text-gray-400' : 'text-gray-500'}`}>Não</span>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, contribuiINSS: !formData.contribuiINSS})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                      formData.contribuiINSS ? 'bg-cyan-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.contribuiINSS ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${formData.contribuiINSS ? 'text-cyan-400' : 'text-gray-500'}`}>Sim</span>
                </div>
              </label>
              
              {!formData.contribuiINSS && (
                <div className="mt-3 p-2 bg-yellow-600/20 rounded-lg">
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertCircle size={12} /> Atenção: Este funcionário NÃO contribuirá para o INSS. Nenhum desconto será aplicado.
                  </p>
                </div>
              )}
              
              {formData.contribuiINSS && (
                <div className="mt-3 p-2 bg-green-600/20 rounded-lg">
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle size={12} /> Este funcionário contribuirá para o INSS conforme regime da empresa.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status Ativo/Inativo */}
          <div className="bg-gray-700/30 rounded-xl p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.ativo}
                onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-gray-300">Funcionário Ativo</span>
            </label>
          </div>
          
          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition flex items-center justify-center gap-2">
              <Save size={18} /> {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
            <button type="button" onClick={() => navigate("/funcionarios")}
              className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg transition flex items-center gap-2">
              <ArrowLeft size={18} /> Cancelar
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditarFuncionario;