// frontend/src/hooks/useCrud.js
import { useState, useCallback } from "react";
import axios from "axios";

export const useCrud = (baseUrl, options = {}) => {
  const [data, setData] = useState([]);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const getHeaders = useCallback(() => ({
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  }), []);

  const fetchAll = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
      const response = await axios.get(url, getHeaders());
      setData(response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.mensagem || err.message;
      setError(msg);
      console.error("Erro ao buscar:", msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [baseUrl, getHeaders]);

  const fetchOne = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${baseUrl}/${id}`, getHeaders());
      setItem(response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.mensagem || err.message;
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [baseUrl, getHeaders]);

  const create = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await axios.post(baseUrl, data, getHeaders());
      setSuccess(response.data.mensagem || "Registo criado com sucesso!");
      await fetchAll();
      return { success: true, data: response.data };
    } catch (err) {
      const msg = err.response?.data?.mensagem || err.message;
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [baseUrl, getHeaders, fetchAll]);

  const update = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await axios.put(`${baseUrl}/${id}`, data, getHeaders());
      setSuccess(response.data.mensagem || "Registo atualizado com sucesso!");
      await fetchAll();
      return { success: true, data: response.data };
    } catch (err) {
      const msg = err.response?.data?.mensagem || err.message;
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [baseUrl, getHeaders, fetchAll]);

  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await axios.delete(`${baseUrl}/${id}`, getHeaders());
      setSuccess(response.data.mensagem || "Registo eliminado com sucesso!");
      await fetchAll();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.mensagem || err.message;
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [baseUrl, getHeaders, fetchAll]);

  return {
    data,
    item,
    loading,
    error,
    success,
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    setData,
    setItem
  };
};
