import { redirect } from 'next/navigation'

/**
 * L'ancienne page Vaults. Elle répétait la page Clients (un client = un vault,
 * et « Open » menait à la même fiche) : ses vaults sont désormais le filtre
 * « Active » de Clients, son contrat on-chain vit dans Operations.
 */
export default function Page() {
  redirect('/admin/clients/active')
}
