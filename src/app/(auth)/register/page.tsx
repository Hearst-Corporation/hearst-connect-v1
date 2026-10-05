import { Button } from '@hearst/ui/catalyst/button'
import { Strong, Text, TextLink } from '@hearst/ui/catalyst/text'
import { Heading } from '@hearst/ui/catalyst/heading'
import { Logo } from '@/components/logo'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Request access',
}

export default function RegisterPage() {
  return (
    <div className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Logo className="text-(--ds-text)" />
      <div>
        <Heading>Invitation-only access</Heading>
        <Text className="mt-2">
          Hearst Connect accounts are opened by the workspace owner: there is no open registration. Email us with
          your organization details and we will open the workspace and invite you.
        </Text>
      </div>

      <Button color="accent" href="mailto:connect@hearstcorporation.io?subject=Hearst%20Connect%20access%20request" className="w-full">
        Email the team
      </Button>

      <Text>
        Already have an account?{' '}
        <TextLink href="/login">
          <Strong>Sign in</Strong>
        </TextLink>
      </Text>
    </div>
  )
}
