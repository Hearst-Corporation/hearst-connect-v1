import { Heading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'

/** En-tête de page console — une composition Catalyst, pas une carte. */
export function AdminPageHeader({
  title,
  description,
}: Readonly<{ title: string; description?: string }>) {
  return (
    <div className="max-w-4xl">
      <Heading>{title}</Heading>
      {description ? <Text className="mt-2">{description}</Text> : null}
    </div>
  )
}
