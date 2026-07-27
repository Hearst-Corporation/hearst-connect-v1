import { Button } from '@/components/catalyst/button'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Divider } from '@/components/catalyst/divider'
import { Heading, Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { DataState } from '@/components/data-state'
import { logout } from '@/lib/actions'
import { requireSession, roleLabel } from '@/lib/auth'
import { resolved } from '@/lib/resolved'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Paramètres',
}

export default async function SettingsPage() {
  const user = await requireSession()

  // Aucune route de configuration d'espace n'existe côté backend : l'état le dit.
  const securitySettings = resolved.notConfigured(
    "Aucun service de configuration n'est branché : le backend Hearst Connect n'expose pas de route de réglages d'espace. Les valeurs affichées auparavant ne commandaient rien.",
  )

  return (
    <>
      <Heading>Paramètres</Heading>
      <Text className="mt-2">Votre compte et les réglages de sécurité de l’espace.</Text>

      <Divider className="my-10" />

      <Subheading>Compte</Subheading>
      <DescriptionList className="mt-4">
        <DescriptionTerm>Nom</DescriptionTerm>
        <DescriptionDetails>{user.name}</DescriptionDetails>

        <DescriptionTerm>Adresse e-mail</DescriptionTerm>
        <DescriptionDetails>{user.email}</DescriptionDetails>

        <DescriptionTerm>Rôle</DescriptionTerm>
        <DescriptionDetails>{roleLabel[user.role]}</DescriptionDetails>

        <DescriptionTerm>Session</DescriptionTerm>
        <DescriptionDetails>
          Cookie signé côté serveur, non lisible par le navigateur, valable 7 jours.
        </DescriptionDetails>
      </DescriptionList>

      <Divider className="my-10" />

      <Subheading>Sécurité de l’espace</Subheading>
      <Text className="mt-2">Réglages appliqués à l’ensemble des membres.</Text>
      {/*
        Les interrupteurs ont été retirés : aucun service de configuration ne les
        lit ni ne les écrit. Un interrupteur qui ne commande rien affiche un état
        de sécurité inventé — exactement ce que cette page ne doit pas faire.
      */}
      <div className="mt-6">
        <DataState state={securitySettings} />
      </div>

      <Divider className="my-10" />

      <Subheading>Session en cours</Subheading>
      <Text className="mt-2">La déconnexion supprime le cookie de session sur cet appareil.</Text>
      <form action={logout} className="mt-4">
        <Button type="submit" color="red">
          Se déconnecter
        </Button>
      </form>
    </>
  )
}
