import localFont from 'next/font/local'

/**
 * Absolute design system rule: FK Grotesk everywhere.
 *
 * A single family for interface, headings, and tabular data.
 * Source: Florian Karsten. No other production font.
 *
 * ATTENTION — fichiers TRIAL. La licence d'essai ne couvre pas la production :
 * les fichiers `FKGrotesk-*.woff2` doivent être remplacés par les versions sous
 * licence avant toute mise en ligne définitive. Les noms de fichiers ne
 * changeront pas, donc le remplacement ne touche que le dossier des fontes.
 *
 * Contrairement à Satoshi, qui était VARIABLE (une seule ressource couvrant
 * 300–900), FK Grotesk est livrée en poids statiques : chaque graisse est donc
 * déclarée séparément, et le navigateur ne télécharge que celles qu'il utilise.
 *
 * FK Grotesk n'a pas de SemiBold : les titres et grands chiffres, jusqu'ici en
 * 550/600, sont rendus par le Medium (500) — voir la table de correspondance
 * dans `src/styles/tailwind.css`.
 */

export const fontFKGrotesk = localFont({
  src: [
    { path: '../assets/fonts/FKGrotesk-Thin.woff2', weight: '100', style: 'normal' },
    { path: '../assets/fonts/FKGrotesk-Light.woff2', weight: '300', style: 'normal' },
    { path: '../assets/fonts/FKGrotesk-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../assets/fonts/FKGrotesk-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../assets/fonts/FKGrotesk-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../assets/fonts/FKGrotesk-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-fk-grotesk',
  display: 'swap',
})
