import { Heading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'

/** En-tête de page console — pleine largeur, description bornée pour la lecture. */
export function AdminPageHeader({
  title,
  description,
}: Readonly<{ title: string; description?: string }>) {
  return (
    <div className="min-w-0">
      <Heading>{title}</Heading>
      {description ? <Text className="mt-2 max-w-prose">{description}</Text> : null}
    </div>
  )
}
