/**
 * Liens vers les explorateurs de chaîne — dérivés du runtime quand disponible.
 */

export function explorerTxUrl(chainId: number | undefined, txHash: string | undefined): string | null {
  if (!txHash || txHash === '') return null
  if (chainId === 8453) return `https://basescan.org/tx/${txHash}`
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`
  return null
}

export function explorerAddressUrl(chainId: number | undefined, address: string | undefined): string | null {
  if (!address || address === '') return null
  if (chainId === 8453) return `https://basescan.org/address/${address}`
  if (chainId === 84532) return `https://sepolia.basescan.org/address/${address}`
  return null
}
