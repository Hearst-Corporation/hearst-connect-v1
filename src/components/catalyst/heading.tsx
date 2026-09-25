import clsx from 'clsx'

type HeadingProps = { level?: 1 | 2 | 3 | 4 | 5 | 6 } & React.ComponentPropsWithoutRef<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
>

export function Heading({ className, level = 1, ...props }: HeadingProps) {
  let Element: `h${typeof level}` = `h${level}`

  return (
    <Element
      {...props}
      className={clsx(className, 'text-2xl/8 font-semibold text-ink sm:text-xl/8 dark:text-fg')}
    />
  )
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
  let Element: `h${typeof level}` = `h${level}`

  return (
    <Element
      {...props}
      /* 17px, comme les titres de bloc de /account — `sm:text-sm/6` les
         rabaissait à 14px sur grand écran, si bien que la console avait une
         hiérarchie typographique différente de celle du produit. */
      className={clsx(className, 'text-[17px] leading-[1.3] font-medium tracking-[-0.01em] text-ink dark:text-fg')}
    />
  )
}
