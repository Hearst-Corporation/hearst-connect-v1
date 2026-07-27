# HC-BRAND-ALIGN-001 — Revue visuelle

## Référence inspectée

`https://www.hearstcorporation.io/`, inspecté le 28 juillet 2026 avec styles calculés et feuille CSS publique.

| Élément du site | Valeur observée                                                    | Comportement observé                                            | Transposition dans le dashboard                                          |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Corps           | `Fkgrotesktrial, Arial, sans-serif`, 15,68 px, interligne 23,53 px | Texte régulier, poids 400                                       | `Arial` légal, token `body` 16/24                                        |
| H1              | 78,42/78,42 px, poids 400, approche -0,55 px                       | Très grand titre superposé au hero                              | Tokens fluides `display` et `headline`, poids 400                        |
| H2              | 47,05/51,76 px, poids 400                                          | Titres courts, beaucoup d’espace négatif                        | Token `section-title`, compositions larges                               |
| Navigation      | 94,09 px de haut, gouttières 62,73 px à 1273 px                    | Navigation horizontale desktop, repli sous 991 px               | Header institutionnel horizontal, menu plein écran mobile                |
| Conteneur       | 1147,53 px à 1273 px, soit environ 4,9 vw de gouttière             | Largeur généreuse, contenu non enfermé                          | `max-w-360`, gouttières desktop `4vw`                                    |
| Palette         | `#000000`, `#FFFFFF`, `#FCFDFC`, gris `#B2B2B2` / `#7F7F7F`        | Alternance franche noir / blanc minéral                         | Surfaces noires et blanches, neutres minéraux                            |
| Accent          | `#A7FB90`, hover observé `#73DE56`                                 | CTA et métadonnées ciblées, jamais fond général                 | Accent de marque réservé aux actions et repères                          |
| Chiffres        | jusqu’à 5 rem, poids 400                                           | Bande chiffrée horizontale, sans tuiles                         | Encours en `numeric-display`, faits secondaires séparés par filets       |
| Cartes services | rayon 15,68 px, grandes images, 31,37 px de padding                | Peu de cartes, de grande taille                                 | Pas de mosaïque KPI ; panneaux rares et structurants                     |
| Filets          | gris ou blanc translucide, 1 px                                    | Séparent les contenus sans ombre                                | `hairline`, bordures 1 px, ombre quasi absente                           |
| Boutons         | rayon 100 px, vert sur noir                                        | Transition couleur 350 ms, cubic-bezier                         | Pilule uniquement pour actions primaires                                 |
| Hero            | hauteur 100 svh, image plein cadre, overlay noir                   | Texte rotatif vertical, image recadrée `cover`                  | Rythme et contraste repris sans importer d’image externe                 |
| Mouvement       | transitions 200–350 ms ; média `prefers-reduced-motion` ajouté     | Opacité, couleur, zoom d’image lent                             | Transitions de couleur sobres, réduction de mouvement respectée          |
| Responsive      | seuils 991, 767 et 479 px                                          | Navigation desktop remplacée par menu mobile ; grilles empilées | Breakpoint `lg`, menu mobile plein écran, contenus mono-colonne à 375 px |
| Footer          | fond noir, grille, marge verticale 78,42 px                        | Grande déclaration puis liens et métadonnées                    | Administration et diagnostics groupés par grandes familles               |

La fonte effectivement chargée est une version trial propriétaire. Aucun fichier de fonte n’a été téléchargé ou copié. `Arial`, fallback déclaré par le site lui-même, est utilisé.

## Divergences corrigées

- bleu nuit `#050A16` remplacé par noir, blanc et blanc minéral ;
- accent or `#C6A94E` supprimé ;
- échelle neutre bleutée remplacée par des gris minéraux ;
- sidebar SaaS supprimée au profit d’un header horizontal ;
- icônes décoratives retirées de la navigation ;
- grands rayons, ombres et cartes KPI fortement réduits ;
- hiérarchie compacte remplacée par des titres, chiffres et espacements éditoriaux ;
- graphiques or/bleu remplacés par un système monochrome ;
- états sans source conservés et rendus comme de grandes déclarations explicites.

## Risques fonctionnels évités

- aucun contrat ou appel backend modifié ;
- aucune valeur absente convertie en zéro ;
- aucune organisation, donnée KYC ou validation inventée ;
- réponses brutes conservées ;
- Keeper maintenu désarmé par défaut ;
- garde de session et déconnexion conservées ;
- primitives Catalyst vendorées non modifiées ;
- aucun actif ni fichier de fonte copié depuis le site public.

## Données visibles

- Accueil : `dashboard`, `series1-events`, `ready` ;
- Opérations : `series1-events` ;
- Runtime et diagnostics : endpoints explicitement indiqués dans chaque panneau ;
- Clients et Conformité : aucune donnée métier, état indisponible explicite ;
- identité : session serveur expurgée par `publicUser`.

## Captures

Les fichiers PNG et leurs conditions de capture sont décrits dans `manifest.json`.

## Validation

- `pnpm run check` : typecheck, lint, Catalyst, anti-mocks et 100 tests réussis ;
- `pnpm run build` : build Next.js réussi, 17 routes protégées conservées ;
- parcours authentifié local : 17/17 routes répondent en HTTP 200 sans redirection ;
- console Chrome et erreurs de page : 0 ;
- contraste automatisé du texte visible : aucun échec WCAG AA détecté ;
- navigation clavier : lien d’évitement atteint au premier `Tab`, focus visible 2 px ;
- menu mobile : ouverture et fermeture par `Échap` vérifiées ;
- viewports vérifiés : 375 × 812, 1280 × 800 et 1440 × 900 ;
- backend disponible pendant les captures ; Clients et Conformité restent sans donnée inventée.

Les conditions détaillées de chaque capture sont consignées dans `manifest.json`.
