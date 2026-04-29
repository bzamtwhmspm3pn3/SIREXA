import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-center p-6">
      <div>
        <h1 className="text-6xl font-bold text-amber-500 mb-4">404</h1>
        <p className="text-xl mb-6">Página não encontrada</p>
        <p className="mb-4">A página que estás à procura não existe ou foi removida.</p>
        <Link to="/menu" className="inline-block mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded transition">
          Voltar ao Menu
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
