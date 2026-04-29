import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, Download, ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

const ImportarFuncionarios = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [resultado, setResultado] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const { user, isTecnico, empresaId: userEmpresaId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    carregarEmpresas();
  }, []);

  // Para técnico: definir empresa automaticamente
  useEffect(() => {
    if (isTecnico() && userEmpresaId) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const carregarEmpresas = async () => {
    if (isTecnico()) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sirexa-api.onrender.com/api/empresa", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      if (empresasList.length > 0) {
        setEmpresaSelecionada(empresasList[0]._id);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResultado(null);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      setPreview(rows.slice(0, 10));
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const downloadModelo = () => {
    const modelo = [
      {
        "Nome": "João Silva",
        "NIF": "123456789012",
        "Email": "joao.silva@empresa.com",
        "Telefone": "923456789",
        "Função": "Vendedor",
        "Departamento": "Vendas",
        "Salário Base": "150000",
        "Data de Admissão": "2024-01-15",
        "Tipo Contrato": "Efetivo",
        "Banco": "BAI",
        "Nº Conta": "123456789",
        "IBAN": "AO06004444444444444444444",
        "Titular da Conta": "João Silva",
        "Grupo IRT": "A",
        "Dependentes": "0",
        "Horas Semanais": "40",
        "Horas Diárias": "8",
        "Contribui INSS": "Sim",
        "Status": "Ativo"
      },
      {
        "Nome": "Maria Santos",
        "NIF": "123456789013",
        "Email": "maria.santos@empresa.com",
        "Telefone": "923456788",
        "Função": "Contabilista",
        "Departamento": "Financeiro",
        "Salário Base": "200000",
        "Data de Admissão": "2024-02-01",
        "Tipo Contrato": "Efetivo",
        "Banco": "BFA",
        "Nº Conta": "987654321",
        "IBAN": "AO06005555555555555555555",
        "Titular da Conta": "Maria Santos",
        "Grupo IRT": "B",
        "Dependentes": "2",
        "Horas Semanais": "40",
        "Horas Diárias": "8",
        "Contribui INSS": "Sim",
        "Status": "Ativo"
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(modelo);
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 25 }, // Nome
      { wch: 15 }, // NIF
      { wch: 30 }, // Email
      { wch: 15 }, // Telefone
      { wch: 20 }, // Função
      { wch: 20 }, // Departamento
      { wch: 15 }, // Salário Base
      { wch: 15 }, // Data de Admissão
      { wch: 15 }, // Tipo Contrato
      { wch: 15 }, // Banco
      { wch: 15 }, // Nº Conta
      { wch: 35 }, // IBAN
      { wch: 25 }, // Titular da Conta
      { wch: 12 }, // Grupo IRT
      { wch: 12 }, // Dependentes
      { wch: 15 }, // Horas Semanais
      { wch: 15 }, // Horas Diárias
      { wch: 18 }, // Contribui INSS
      { wch: 12 }  // Status
    ];
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Funcionários");
    XLSX.writeFile(wb, "modelo_importacao_funcionarios.xlsx");
    mostrarMensagem("Modelo baixado com sucesso!", "sucesso");
  };

  const handleImport = async () => {
    if (!file) {
      mostrarMensagem("Selecione um arquivo para importar", "erro");
      return;
    }
    
    if (!empresaSelecionada && !isTecnico()) {
      mostrarMensagem("Selecione uma empresa", "erro");
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        let sucesso = 0;
        let erros = 0;
        const errosLista = [];

        for (const row of rows) {
          try {
            // Mapear os campos do Excel para o formato esperado pelo backend
            const funcionarioData = {
              nome: row.Nome || row.nome || row["Nome Completo"] || "",
              nif: row.NIF || row.nif || row["Número de Identificação Fiscal"] || "",
              email: row.Email || row.email || row["E-mail"] || "",
              telefone: row.Telefone || row.telefone || row.Contacto || "",
              funcao: row.Função || row.funcao || row.Cargo || row.cargo || "",
              departamento: row.Departamento || row.departamento || "",
              salarioBase: parseFloat(String(row["Salário Base"] || row.salarioBase || row.SalarioBase || 0).replace(/[^0-9.-]/g, '')) || 0,
              dataAdmissao: row["Data de Admissão"] || row.dataAdmissao || row.DataAdmissao || new Date().toISOString().split('T')[0],
              tipoContrato: row["Tipo Contrato"] || row.tipoContrato || "Efetivo",
              banco: row.Banco || row.banco || "",
              numeroConta: row["Nº Conta"] || row.numeroConta || row["Número da Conta"] || "",
              iban: row.IBAN || row.iban || "",
              titularConta: row["Titular da Conta"] || row.titularConta || row.Nome || row.nome || "",
              grupoIRT: row["Grupo IRT"] || row.grupoIRT || "A",
              dependentes: parseInt(row.Dependentes || row.dependentes || 0),
              horasSemanais: parseFloat(row["Horas Semanais"] || row.horasSemanais || 40),
              horasDiarias: parseFloat(row["Horas Diárias"] || row.horasDiarias || 8),
              status: row.Status || row.status || "Ativo",
              contribuiINSS: (row["Contribui INSS"] || row.contribuiINSS || "Sim").toLowerCase() === "sim",
              empresaId: empresaSelecionada
            };

            // Validações básicas
            if (!funcionarioData.nome) {
              throw new Error("Nome é obrigatório");
            }
            if (!funcionarioData.nif) {
              throw new Error("NIF é obrigatório");
            }
            if (!funcionarioData.funcao) {
              throw new Error("Função é obrigatória");
            }
            if (funcionarioData.salarioBase <= 0) {
              throw new Error("Salário base inválido");
            }

            const response = await fetch(`https://sirexa-api.onrender.com/api/funcionarios`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
              },
              body: JSON.stringify(funcionarioData)
            });

            const result = await response.json();

            if (response.ok) {
              sucesso++;
            } else {
              erros++;
              errosLista.push({
                dados: row,
                erro: result.mensagem || "Erro ao cadastrar"
              });
            }
          } catch (error) {
            erros++;
            errosLista.push({
              dados: row,
              erro: error.message
            });
          }
        }

        setResultado({ sucesso, erros, total: rows.length, errosLista });
        mostrarMensagem(`Importação concluída: ${sucesso} sucessos, ${erros} erros`, sucesso > 0 ? "sucesso" : "erro");
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      mostrarMensagem("Erro ao importar arquivo", "erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Importar Funcionários" showBackButton={true} backToRoute="/funcionarios">
      {mensagem.texto && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
        } text-white`}>
          {mensagem.texto}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload size={20} /> Importar Funcionários
            </h2>
            <button
              onClick={downloadModelo}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Download size={18} /> Baixar Modelo
            </button>
          </div>

          {/* Seletor de Empresa (apenas para gestores) */}
          {!isTecnico() && empresas.length > 0 && (
            <div className="mb-6 p-4 bg-gray-700/30 rounded-lg">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Empresa
              </label>
              <select
                className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white"
                value={empresaSelecionada}
                onChange={(e) => setEmpresaSelecionada(e.target.value)}
              >
                {empresas.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.nome}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Os funcionários serão importados para esta empresa
              </p>
            </div>
          )}

          {/* Para técnico: mostrar empresa fixa */}
          {isTecnico() && (
            <div className="mb-6 p-4 bg-gray-700/30 rounded-lg">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Empresa
              </label>
              <input
                type="text"
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white cursor-not-allowed"
                value={user?.empresaNome || "Empresa vinculada"}
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">
                Você está vinculado a esta empresa. Os funcionários serão importados para ela.
              </p>
            </div>
          )}

          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileText size={48} className="text-gray-400" />
              <p className="text-gray-400">Clique para selecionar um arquivo</p>
              <p className="text-gray-500 text-sm">Formatos aceitos: .xlsx, .xls, .csv</p>
            </label>
          </div>

          {file && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-white">Arquivo selecionado: {file.name}</p>
              <p className="text-gray-400 text-sm">Pré-visualização: {preview.length} registros</p>
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Pré-visualização (10 primeiros registros)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-white text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      {Object.keys(preview[0] || {}).map(key => (
                        <th key={key} className="p-2 text-left">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-700">
                        {Object.values(row).map((val, i) => (
                          <td key={i} className="p-2">{String(val).substring(0, 30)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resultado && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3">Resultado da Importação</h3>
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white">Sucessos: {resultado.sucesso}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="text-red-400" size={20} />
                  <span className="text-white">Erros: {resultado.erros}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="text-blue-400" size={20} />
                  <span className="text-white">Total: {resultado.total}</span>
                </div>
              </div>
              {resultado.errosLista.length > 0 && (
                <details>
                  <summary className="text-yellow-400 cursor-pointer flex items-center gap-2">
                    <AlertCircle size={16} /> Ver detalhes dos erros ({resultado.errosLista.length})
                  </summary>
                  <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                    {resultado.errosLista.map((item, idx) => (
                      <div key={idx} className="p-2 bg-gray-800 rounded text-xs">
                        <p className="text-red-400 font-semibold">Erro: {item.erro}</p>
                        <pre className="mt-1 text-gray-400 overflow-x-auto">
                          {JSON.stringify(item.dados, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Importando...</>
              ) : (
                <><Upload size={18} /> Importar Funcionários</>
              )}
            </button>
            <button
              onClick={() => navigate("/funcionarios")}
              className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg transition flex items-center gap-2"
            >
              <ArrowLeft size={18} /> Voltar
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImportarFuncionarios;