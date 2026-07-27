'use server'

import { revalidatePath } from 'next/cache'

/** Relance une requête réelle pour la page indiquée (bouton « Réessayer »). */
export async function retryPath(path: string): Promise<void> {
  revalidatePath(path)
}
