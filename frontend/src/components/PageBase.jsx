// src/components/PageBase.jsx
import React, { useState, useEffect } from "react";
import Layout from "./Layout";
import Feedback from "./Feedback";

const PageBase = ({ 
  children, 
  title, 
  loadData, 
  showBackButton = true,
  backToRoute = "/menu"
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (loadData) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const result = await loadData();
          setData(result);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setLoading(false);
    }
  }, [loadData]);

  const showFeedback = (msg, type) => {
    if (type === "success") setSuccess(msg);
    else setError(msg);
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  };

  if (loading) {
    return (
      <Layout title={title} showBackButton={showBackButton} backToRoute={backToRoute}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={title} showBackButton={showBackButton} backToRoute={backToRoute}>
      <Feedback message={error} type="error" onClose={() => setError(null)} />
      <Feedback message={success} type="success" onClose={() => setSuccess(null)} />
      {/* CORREÇÃO: Não clonar children com React.cloneElement */}
      {children}
    </Layout>
  );
};

export default PageBase;