// ════════════════════════════════════════════════════════════════
// inventory — MATÉRIEL possédé (source des paliers kettlebell).
// Éditable dans les Réglages Sport. Par défaut = stock réel de Bob :
// 2 kettlebells de 12 kg + 1 de 16 kg. (14 kg prévus plus tard → il suffira
// de les ajouter ici pour débloquer le palier 2×14.)
// `kb` = liste { kg, count }. `count ≥ 2` = utilisable en PAIRE (exos bilatéraux).
// ════════════════════════════════════════════════════════════════
export const DEFAULT_INVENTORY = {
  kb: [
    { kg: 12, count: 2 },
    { kg: 16, count: 1 },
  ],
};
