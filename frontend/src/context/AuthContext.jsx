import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import client from "../api/client.js";

const AuthContext = createContext(null);

// Deconnexion automatique apres inactivite (cahier des charges §3.3)
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    window.location.href = "/connexion";
  }, []);

  const login = useCallback(async (email, mot_de_passe) => {
    const { data } = await client.post("/auth/login", { email, mot_de_passe });

    if (data.compte_desactive) {
      // Compte reconnu mais desactive : pas de session ouverte, on redirige
      // vers l'ecran dedie sans jamais exposer de donnees (§3.2).
      const err = new Error(data.message || "Compte desactive.");
      err.code = "COMPTE_DESACTIVE";
      err.motif = data.motif;
      throw err;
    }

    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await client.get("/auth/me");
      localStorage.setItem("auth_user", JSON.stringify(data));
      setUser(data);
      return data;
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      throw err;
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      refreshMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(logout, INACTIVITY_LIMIT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, logout]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise dans un AuthProvider");
  return ctx;
}
