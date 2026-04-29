import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { pathname } = useLocation();

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/empresa", label: "Empresas" },
    { to: "/tecnico", label: "Técnicos" },
    { to: "/gestor", label: "Gestores" },
    { to: "/sobre", label: "Sobre" },
  ];

  return (
    <aside className="bg-gray-900 text-white w-64 min-h-screen p-4">
      <h2 className="text-2xl font-bold mb-6">AnDioGest - Corporativo</h2>
      <nav className="flex flex-col gap-2">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`p-2 rounded ${
              pathname === link.to ? "bg-blue-600" : "hover:bg-gray-700"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
