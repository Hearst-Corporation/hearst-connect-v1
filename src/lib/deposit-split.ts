/**
 * V2 — MINING AS A SERVICE : chaque dépôt se partage toujours de la même façon.
 * Une part achète de la puissance de calcul dans le pool de Hearst, l'autre reste
 * en USDC pour payer l'électricité du parc (environ quatre mois de factures).
 *
 * Le backend de démo a ses propres constantes (src/app/api/demo-backend/mock-data.js,
 * MINING_BPS / BUFFER_BPS) : les garder alignées.
 */
export const MINING_PCT = 85
export const BUFFER_PCT = 15
