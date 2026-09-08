import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { FournisseurNotifications } from "./components/ui/Feedback.jsx";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Le fournisseur de notifications enveloppe l'authentification : les
          erreurs de connexion doivent pouvoir declencher une notification. */}
      <FournisseurNotifications>
        <AuthProvider>
          <App />
        </AuthProvider>
      </FournisseurNotifications>
    </BrowserRouter>
  </React.StrictMode>
);
