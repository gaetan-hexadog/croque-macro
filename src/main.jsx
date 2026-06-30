import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// [DESIGN LAB temporaire] : ?design_lab → maquettes Réglages au lieu de l'app.
const DESIGN_LAB = typeof window !== "undefined" && window.location.search.includes("design_lab");
const DesignLab = DESIGN_LAB ? React.lazy(() => import("../.claude-design/lab/DesignLab.jsx")) : null;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {DESIGN_LAB
      ? <Suspense fallback={null}><DesignLab /></Suspense>
      : <App />}
  </React.StrictMode>
);
