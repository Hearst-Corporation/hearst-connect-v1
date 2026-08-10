import clsx from 'clsx'
import type { ClassValue } from 'clsx'

/** shadcn / Aceternity utility — concatenates class names. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
