import { redirect } from 'next/navigation'

/* Le registre vit dans My Vault, onglet « Movements » : filtres par type, par
   vault, export CSV — une seule page, plus deux qui se répétaient. */
export default function ActivityPage() {
  redirect('/account?tab=movements')
}
