'use client'

import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import type { VaultAccount } from './load'

/**
 * Action sur le vault dédié : retirer.
 *
 * Agrandir le vault n'est pas ici — cela engage l'admin (KYC, capacité,
 * contrat), donc cela passe par lui, pas par un bouton que le backend refusera.
 * `depositUnlocked` reste porté par la source pour le jour où une demande en
 * ligne existera.
 *
 * Le bouton se désactive quand il n'y a rien à retirer : proposer une action
 * qui échouera vaut moins qu'un bouton inerte qui dit pourquoi.
 */
export function VaultActions({
  vault,
  onWithdraw,
}: Readonly<{
  vault: Availability<VaultAccount>
  onWithdraw: () => void
}>) {
  const account = valueOf(vault)

  if (account === null) {
    return (
      <div className="vault-actions">
        <p className="vault-actions-absent">
          {isAvailable(vault)
            ? 'No dedicated vault is linked to this account.'
            : 'Vault terms could not be read — no action is offered rather than one that would fail.'}
        </p>
      </div>
    )
  }

  /* Sous ~10 $ (≈ 0.0001 BTC, la plus petite saisie possible), il n'y a
     rien à retirer : un reliquat d'arrondi n'est pas un retrait. */
  const canWithdraw = account.withdrawUnlocked && account.availableUsdc >= 10

  return (
    <div className="vault-actions">
      <button
        type="button"
        className="vault-action vault-action--primary"
        disabled={!canWithdraw}
        title={canWithdraw ? undefined : 'Nothing available to withdraw right now'}
        onClick={onWithdraw}
      >
        Withdraw
      </button>
    </div>
  )
}
