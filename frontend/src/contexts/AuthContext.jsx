// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [empresaNome, setEmpresaNome] = useState(null);
  const [empresaNif, setEmpresaNif] = useState(null);
  const [empresaEmail, setEmpresaEmail] = useState(null);
  const [empresaTelefone, setEmpresaTelefone] = useState(null);
  const [empresaEndereco, setEmpresaEndereco] = useState(null);

  useEffect(() => {
    const loadUser = () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        
        if (token && storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Definir empresaId e dados da empresa baseado no usuário
          if (userData.empresaId) {
            setEmpresaId(userData.empresaId);
            setEmpresaNome(userData.empresaNome || "Empresa Designada");
            setEmpresaNif(userData.empresaNif);
            setEmpresaEmail(userData.empresaEmail);
            setEmpresaTelefone(userData.empresaTelefone);
            setEmpresaEndereco(userData.empresaEndereco);
          }
          
          console.log("✅ Usuário carregado:", userData?.nome);
          console.log("🏢 Empresa ID:", userData?.empresaId);
          console.log("🏢 Empresa NIF:", userData?.empresaNif);
        }
      } catch (err) {
        console.error("Erro ao carregar usuário:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const login = async (email, senha, tipo = "gestor") => {
    setError(null);
    
    try {
      console.log("📝 Tentando login:", email);
      
      const endpoint = tipo === "gestor" ? `${API_URL}/gestor/login` : `${API_URL}/tecnico/login`;
      
      const response = await axios.post(endpoint, { email, senha });
      
      const { token, gestor, usuario } = response.data;
      const userData = gestor || usuario;
      
      if (!userData) {
        throw new Error("Dados do usuário não encontrados");
      }
      
      // Buscar dados completos da empresa se for técnico
      let empresaCompleta = null;
      if (tipo === "tecnico" && userData.empresaId) {
  try {
    // Usar a rota pública em vez da rota restrita
    const empresaResponse = await axios.get(`${API_URL}/empresa/public/${userData.empresaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    empresaCompleta = empresaResponse.data.dados || empresaResponse.data;
  } catch (err) {
    console.log("Erro ao buscar empresa:", err.message);
  }
}
      
      const finalUserData = {
        ...userData,
        role: userData.role || tipo,
        nome: userData.nome || userData.name,
        empresaId: userData.empresaId,
        empresaNome: empresaCompleta?.nome || userData.empresaNome,
        empresaNif: empresaCompleta?.nif || userData.empresaNif,
        empresaEmail: empresaCompleta?.email || userData.empresaEmail,
        empresaTelefone: empresaCompleta?.telefone || userData.empresaTelefone,
        empresaEndereco: empresaCompleta?.endereco || userData.empresaEndereco,
        modulos: userData.modulos || {}
      };
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUserData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(finalUserData);
      
      // Definir empresaId e dados da empresa
      if (finalUserData.empresaId) {
        setEmpresaId(finalUserData.empresaId);
        setEmpresaNome(finalUserData.empresaNome);
        setEmpresaNif(finalUserData.empresaNif);
        setEmpresaEmail(finalUserData.empresaEmail);
        setEmpresaTelefone(finalUserData.empresaTelefone);
        setEmpresaEndereco(finalUserData.empresaEndereco);
      }
      
      console.log("✅ Login realizado com sucesso!");
      console.log("🏢 Empresa associada:", finalUserData.empresaId);
      console.log("🏢 NIF da empresa:", finalUserData.empresaNif);
      
      return { success: true, user: finalUserData };
      
    } catch (error) {
      console.error("❌ Erro no login:", error.response?.data || error.message);
      const mensagem = error.response?.data?.mensagem || "Erro ao fazer login";
      setError(mensagem);
      return { success: false, error: mensagem };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
    setEmpresaId(null);
    setEmpresaNome(null);
    setEmpresaNif(null);
    setEmpresaEmail(null);
    setEmpresaTelefone(null);
    setEmpresaEndereco(null);
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem("token");
  };

  const isGestor = () => user?.role === "gestor";
  const isTecnico = () => user?.role === "tecnico";
  
  const getEmpresaAtiva = () => {
    if (isTecnico() && empresaId) {
      return { 
        _id: empresaId, 
        nome: empresaNome,
        nif: empresaNif,
        email: empresaEmail,
        telefone: empresaTelefone,
        endereco: empresaEndereco
      };
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      isAuthenticated,
      isGestor,
      isTecnico,
      empresaId,
      empresaNome,
      empresaNif,
      empresaEmail,
      empresaTelefone,
      empresaEndereco,
      setEmpresaId,
      setEmpresaNome,
      getEmpresaAtiva
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
