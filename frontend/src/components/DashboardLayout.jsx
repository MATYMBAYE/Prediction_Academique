import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";

export default function DashboardLayout({ title, navItems, children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName =
    user?.role === "admin" ? "Administration" : `${user?.student?.prenom ?? ""} ${user?.student?.nom ?? ""}`.trim() || user?.identifiant;

  return (
    <div className="min-h-screen bg-brume-academique">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-encre-nocturne/10 bg-white px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            className="tap-target rounded-md p-2 text-encre-nocturne md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
          >
            <MenuIcon />
          </button>
          <Logo />
          <span className="hidden font-display text-lg font-semibold sm:inline">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-encre-nocturne/80 sm:inline">{displayName}</span>
          <button
            onClick={logout}
            className="focus-ring tap-target rounded-md border border-encre-nocturne px-3 py-1.5 text-sm font-medium text-encre-nocturne hover:bg-encre-nocturne/5"
          >
            Deconnexion
          </button>
        </div>
      </header>

      <div className="flex">
        <nav
          className={`fixed inset-y-0 left-0 z-10 mt-[57px] w-64 transform border-r border-encre-nocturne/10 bg-white p-4 transition-transform md:static md:mt-0 md:block md:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `focus-ring tap-target flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                      isActive ? "bg-encre-nocturne text-white" : "text-encre-nocturne hover:bg-encre-nocturne/5"
                    }`
                  }
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {menuOpen && (
          <button
            aria-label="Fermer le menu"
            className="fixed inset-0 z-[5] bg-black/20 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <main className="min-h-[calc(100vh-57px)] flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
