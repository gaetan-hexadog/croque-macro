import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// [DESIGN LAB temporaire] : ?design_lab → maquettes Réglages au lieu de l'app.
const DESIGN_LAB = typeof window !== "undefined" && window.location.search.includes("design_lab");
const DesignLab = DESIGN_LAB ? React.lazy(() => import("../.claude-design/lab/DesignLab.jsx")) : null;

// [COACHING LAB temporaire] : ?coaching_lab → maquettes coaching (indépendant du précédent).
const COACHING_LAB = typeof window !== "undefined" && window.location.search.includes("coaching_lab");
const CoachingLab = COACHING_LAB ? React.lazy(() => import("../.claude-design/coaching-lab/CoachingLab.jsx")) : null;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {COACHING_LAB
      ? <Suspense fallback={null}><CoachingLab /></Suspense>
      : DESIGN_LAB
      ? <Suspense fallback={null}><DesignLab /></Suspense>
      : <App />}
  </React.StrictMode>
);
