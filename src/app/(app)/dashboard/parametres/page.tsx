import { Button } from '@/components/catalyst/button'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Divider } from '@/components/catalyst/divider'
import { Description, Fieldset, Label, Legend } from '@/components/catalyst/fieldset'
import { Heading, Subheading } from '@/components/catalyst/heading'
import { Switch, SwitchField, SwitchGroup } from '@/components/catalyst/switch'
import { Text } from '@/components/catalyst/text'
import { DemoNotice } from '@/components/demo-notice'
import { logout } from '@/lib/actions'
import { requireSession, roleLabel } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Paramètres',
}

export default async function SettingsPage() {
  const user = await requireSession()

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

      <Fieldset>
        <Legend>Sécurité de l’espace</Legend>
        <Text className="mt-2">Réglages appliqués à l’ensemble des membres.</Text>
        <div className="mt-6">
          <DemoNotice>
            Réglages de démonstration — ces interrupteurs ne sont pas encore reliés à un service de configuration.
          </DemoNotice>
        </div>
        <SwitchGroup className="mt-6">
          <SwitchField>
            <Label>Second facteur obligatoire</Label>
            <Description>Impose une vérification supplémentaire à chaque nouvelle session.</Description>
            <Switch name="mfa" defaultChecked />
          </SwitchField>
          <SwitchField>
            <Label>Restreindre aux adresses IP listées</Label>
            <Description>Refuse toute connexion venant d’une adresse absente de la liste.</Description>
            <Switch name="ip_allowlist" />
          </SwitchField>
          <SwitchField>
            <Label>Alerter sur accès refusé</Label>
            <Description>Envoie une notification aux propriétaires dès qu’un accès est refusé.</Description>
            <Switch name="alerts" defaultChecked />
          </SwitchField>
        </SwitchGroup>
      </Fieldset>

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
