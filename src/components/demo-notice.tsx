import { Text } from '@/components/catalyst/text'
import { InformationCircleIcon } from '@heroicons/react/16/solid'

/**
 * Bandeau d'honnêteté : les écrans ci-dessous affichent des données de
 * démonstration tant que la source réelle n'est pas branchée. Rien ici ne doit
 * pouvoir passer pour une mesure réelle (doctrine Hearst §3).
 */
export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-950/5 dark:bg-white/5 dark:ring-white/10">
      <InformationCircleIcon className="mt-1 size-4 shrink-0 fill-zinc-500 dark:fill-zinc-400" />
      <Text className="text-xs/5!">
        {children ?? 'Données de démonstration — aucune source de production n’est encore branchée sur cet écran.'}
      </Text>
    </div>
  )
}
