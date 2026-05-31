// main.jsx ou index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import FacturasProvider from './contexts/FacturasContext';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>           {/* 🔥 PRIMEIRO: Router */}
      <AuthProvider>         {/* 🔥 DEPOIS: Auth (que usa useNavigate) */}
        <FacturasProvider>   {/* 🔥 DEPOIS: Outros providers */}
          <App />
        </FacturasProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);