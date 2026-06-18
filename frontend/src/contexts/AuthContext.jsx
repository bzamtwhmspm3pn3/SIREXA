// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

import API_URL from "../config/api";

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
  // 🔥 NOVOS STATES PARA MÓDULOS E PLANO
  const [empresaModulos, setEmpresaModulos] = useState([]);
  const [empresaPlano, setEmpresaPlano] = useState('FREE');

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
          
          // 🔥 CARREGAR MÓDULOS E PLANO DO USUÁRIO
          let modulos = userData.modulosAtivos || [];
          // Para técnicos: converter obj {vendas:true,stock:false} → ['vendas']
          if (userData.role === 'tecnico' && userData.modulos && typeof userData.modulos === 'object' && !Array.isArray(userData.modulos)) {
            modulos = Object.keys(userData.modulos).filter(k => userData.modulos[k] === true);
          } else if (!Array.isArray(modulos)) {
            modulos = [];
          }
          const plano = userData.plano || userData.empresaPlano || 'FREE';
          
          setEmpresaModulos(modulos);
          setEmpresaPlano(plano);
          
          console.log("✅ Usuário carregado:", userData?.nome);
          console.log("⭐ Role:", userData?.role);
          console.log("🏢 Empresa ID:", userData?.empresaId);
          console.log("🏢 Empresa NIF:", userData?.empresaNif);
          console.log("📋 Módulos ativos:", modulos);
          console.log("📋 Plano:", plano);
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
      
      const isAdmin = email === "admin@sirexa.ao";
      const endpoint = isAdmin || tipo === "gestor" 
        ? `${API_URL}/gestor/login` 
        : `${API_URL}/tecnico/login`;
      
      console.log("📍 Endpoint:", endpoint);
      
      const response = await axios.post(endpoint, { email, senha: senha });
      
      const { token, gestor, usuario } = response.data;
      let userData = gestor || usuario;
      
      if (!userData) {
        throw new Error("Dados do usuário não encontrados");
      }
      
      // 🔥 FORÇAR ROLE ADMIN PARA O EMAIL ADMIN
      if (isAdmin) {
        userData.role = "admin_sistema";
        console.log("👑 Usuário promovido a ADMIN_SISTEMA");
      }
      
      // 🔥 PEGAR MÓDULOS E PLANO (gestor ou técnico)
      let modulosAtivos = userData.modulosAtivos || [];
      // Para técnicos: converter obj {vendas:true,stock:false} → ['vendas']
      if ((tipo === 'tecnico' || userData.role === 'tecnico') && userData.modulos && typeof userData.modulos === 'object' && !Array.isArray(userData.modulos)) {
        modulosAtivos = Object.keys(userData.modulos).filter(k => userData.modulos[k] === true);
      } else if (!Array.isArray(modulosAtivos)) {
        modulosAtivos = [];
      }
      const plano = userData.plano || userData.empresas?.[0]?.plano || 'FREE';
      
      console.log("📋 Módulos recebidos do backend:", modulosAtivos);
      console.log("📋 Plano recebido:", plano);
      
      // Buscar dados completos da empresa se for técnico
      let empresaCompleta = null;
      if (tipo === "tecnico" && userData.empresaId) {
        try {
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
        modulos: userData.modulos || {},
        // 🔥 ADICIONAR MÓDULOS E PLANO
        modulosAtivos: modulosAtivos,
        plano: plano
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
      
      // 🔥 DEFINIR MÓDULOS E PLANO
      setEmpresaModulos(modulosAtivos);
      setEmpresaPlano(plano);
      
      console.log("✅ Login realizado com sucesso!");
      console.log("⭐ Role final:", finalUserData.role);
      console.log("🏢 Empresa associada:", finalUserData.empresaId);
      console.log("📋 Módulos finais:", modulosAtivos);
      
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
    setEmpresaModulos([]);
    setEmpresaPlano('FREE');
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem("token");
  };

  const isGestor = () => user?.role === "gestor";
  const isTecnico = () => user?.role === "tecnico";
  const isAdmin = () => user?.role === "admin_sistema";
  
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
      isAdmin,
      empresaId,
      empresaNome,
      empresaNif,
      empresaEmail,
      empresaTelefone,
      empresaEndereco,
      getEmpresaAtiva,
      // 🔥 NOVOS VALORES EXPORTADOS
      empresaModulos,
      empresaPlano
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);