// ════════════════════════════════════════════════════════════════
// lib/sport.js — BARREL de compatibilité (refonte config-driven, Phase 0b).
//
// Le MOTEUR vit désormais dans src/sport/engine/ (un fichier par concern),
// les DONNÉES dans src/sport/config/. Ce fichier ré-exporte tout pour que les
// imports consommateurs (`from "../lib/sport.js"`) ne changent pas pendant la
// migration. Il sera supprimé en Phase 6, une fois les imports repointés.
// ════════════════════════════════════════════════════════════════
export * from "../sport/engine/index.js";
