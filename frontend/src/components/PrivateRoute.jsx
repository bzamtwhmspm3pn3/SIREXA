import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth(); // `loading` se ainda estiver carregando o usuário
  const location = useLocation();

  // Se estiver carregando dados do usuário, pode mostrar um spinner ou tela em branco
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="animate-pulse">🔒 A verificar sessão, aguarde...</p>
      </div>
    );
  }

  // Se não tiver usuário, redireciona para o login com destino original
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Autenticado? Libera a rota!
  return children;
}
