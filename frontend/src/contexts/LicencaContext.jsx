// src/contexts/LicencaContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const LicencaContext = createContext({});

export const useLicenca = () => useContext(LicencaContext);

export const LicencaProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [licenca, setLicenca] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modulos, setModulos] = useState({});
  const [limites, setLimites] = useState({});

  const carregarLicenca = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('https://sirexa-api.onrender.com/api/licenca/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLicenca(data);
        setModulos(data.modulos || {});
        setLimites(data.limites || {});
      }
    } catch (error) {
      console.error('Erro ao carregar licença:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLicenca();
  }, [token]);

  const verificarModulo = (modulo) => {
    if (!modulos[modulo]) {
      return false;
    }
    return modulos[modulo] === true;
  };

  const verificarLimite = (tipo, valorAtual) => {
    const limite = limites[`max${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`];
    if (limite === -1) return true; // Ilimitado
    return valorAtual < limite;
  };

  const diasRestantes = licenca?.diasRestantes || 0;
  const isExpirada = diasRestantes <= 0 && licenca?.status !== 'ativa';

  return (
    <LicencaContext.Provider value={{
      licenca,
      loading,
      modulos,
      limites,
      verificarModulo,
      verificarLimite,
      diasRestantes,
      isExpirada,
      plano: licenca?.plano || 'trial',
      recarregar: carregarLicenca
    }}>
      {children}
    </LicencaContext.Provider>
  );
};