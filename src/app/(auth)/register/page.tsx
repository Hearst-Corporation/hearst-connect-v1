import { Button } from '@/components/catalyst/button'
import { Strong, Text, TextLink } from '@/components/catalyst/text'
import { Heading } from '@/components/catalyst/heading'
import { Logo } from '@/components/logo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demander un accès',
}

export default function RegisterPage() {
  return (
    <div className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Logo className="text-zinc-950 dark:text-white" />
      <div>
        <Heading>Accès sur invitation</Heading>
        <Text className="mt-2">
          Les comptes Hearst Connect sont ouverts par le propriétaire de l’espace de travail : il n’y a pas
          d’inscription libre. Écrivez-nous en indiquant votre organisation, nous ouvrons l’espace et vous invitons.
        </Text>
      </div>

      <Button href="mailto:connect@hearstcorporation.io?subject=Demande%20d%27acc%C3%A8s%20Hearst%20Connect" className="w-full">
        Écrire à l’équipe
      </Button>

      <Text>
        Vous avez déjà un compte ?{' '}
        <TextLink href="/login">
          <Strong>Se connecter</Strong>
        </TextLink>
      </Text>
    </div>
  )
}
