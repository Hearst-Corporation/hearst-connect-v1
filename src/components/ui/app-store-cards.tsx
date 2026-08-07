'use client'

import styles from '@/components/ui/app-store-cards.module.css'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import Image from 'next/image'
import { useMemo, useState, type CSSProperties } from 'react'

export type AppStoreCardTheme = 'light' | 'dark'

export type AppStoreCardItem = Readonly<{
  id: string
  category: string
  title: string
  paragraphs: readonly string[]
  image: string
  theme?: AppStoreCardTheme
  imageStyle?: Readonly<{
    top?: number
    bottom?: number
    width?: string
    left?: number
  }>
}>

export type AppStoreCardsProps = Readonly<{
  title: string
  avatarSrc: string
  avatarAlt: string
  items: readonly AppStoreCardItem[]
}>

function imageInlineStyle(imageStyle: AppStoreCardItem['imageStyle']): CSSProperties {
  return {
    top: imageStyle?.top !== undefined ? `${imageStyle.top}px` : 'auto',
    bottom: imageStyle?.bottom !== undefined ? `${imageStyle.bottom}px` : 'auto',
    width: imageStyle?.width ?? '100%',
    left: imageStyle?.left !== undefined ? `${imageStyle.left}px` : 'auto',
  }
}

function CardBody({
  item,
  showContent,
}: Readonly<{
  item: AppStoreCardItem
  showContent: boolean
}>) {
  const themeClass = item.theme === 'dark' ? styles.themeDark : ''
  const imgStyle = imageInlineStyle(item.imageStyle)

  return (
    <motion.div className={`${styles.cardContent} ${themeClass}`} layoutId={`card-container-${item.id}`}>
      <motion.div className={styles.cardImageContainer} layoutId={`card-image-container-${item.id}`}>
        <motion.img
          className={styles.cardImage}
          src={item.image}
          alt=""
          style={imgStyle}
          layoutId={`card-image-${item.id}`}
        />
      </motion.div>

      <motion.div className={styles.titleContainer} layoutId={`title-container-${item.id}`} layout="position">
        <span className={styles.category}>{item.category}</span>
        <h3 className={styles.title}>{item.title}</h3>
      </motion.div>

      {showContent ? (
        <motion.div className={`${styles.contentContainer} ${themeClass}`} layout="position">
          {item.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
        </motion.div>
      ) : null}
    </motion.div>
  )
}

export function AppStoreCards({ title, avatarSrc, avatarAlt, items }: AppStoreCardsProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const openItem = useMemo(() => items.find((item) => item.id === openId) ?? null, [items, openId])

  return (
    <LayoutGroup id="app-store-cards">
      <section className={styles.section} aria-label={title}>
        <header className={styles.header}>
          <h2 className={styles.storeTitle}>{title}</h2>
          <div className={styles.avatar}>
            <Image src={avatarSrc} alt={avatarAlt} width={40} height={40} className="size-full object-cover" />
          </div>
        </header>

        <ul className={styles.cardList}>
          {items.map((item) => (
            <li
              key={item.id}
              className={styles.card}
              data-open={openId === item.id}
              onClick={() => setOpenId(item.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setOpenId(item.id)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className={styles.cardContentContainer}>
                <CardBody item={item} showContent={false} />
              </div>
            </li>
          ))}
        </ul>

        <AnimatePresence>
          {openItem ? (
            <>
              <motion.button
                type="button"
                aria-label="Fermer"
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                onClick={() => setOpenId(null)}
              />
              <div
                className={`${styles.cardContentContainer} ${styles.cardContentContainerOpen} ${
                  openItem.theme === 'dark' ? styles.themeDark : ''
                }`}
              >
                <CardBody item={openItem} showContent />
              </div>
            </>
          ) : null}
        </AnimatePresence>
      </section>
    </LayoutGroup>
  )
}
