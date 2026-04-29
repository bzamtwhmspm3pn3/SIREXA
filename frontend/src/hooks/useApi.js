// src/hooks/useApi.js
import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { token } = useAuth();

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  }), []);

  const request = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...getHeaders(), ...options.headers }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.mensagem || "Erro na requisição");
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return { loading, error, success, request, clearMessages, setSuccess };
};