// src/components/Feedback.jsx
import React, { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const Feedback = ({ message, type, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />
  };

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-600"
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in-right`}>
      {icons[type]}
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 hover:text-gray-200">
        <X size={16} />
      </button>
    </div>
  );
};

export default Feedback;