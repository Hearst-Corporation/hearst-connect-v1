import clsx from 'clsx'
import type { ClassValue } from 'clsx'

/** Utilitaire shadcn / Aceternity — concatène des classes. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
