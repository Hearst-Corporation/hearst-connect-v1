# Hearst Connect V1 — Doctrine Design System, Catalyst et Charts

**Statut : document canonique de développement**  
**Projet cible : Hearst Connect V1**  
**Langue produit : français**  
**Principe directeur : une seule grammaire visuelle, une seule source de primitives, une seule couche de charts.**

---

## 1. Objet du document

Ce fichier définit les règles obligatoires pour construire et maintenir l’interface d’Hearst Connect V1.

Il gouverne :

- les primitives UI ;
- les composants métier ;
- les formulaires ;
- les overlays ;
- les tableaux ;
- les graphiques ;
- les tokens ;
- les animations ;
- les bibliothèques tierces ;
- l’accessibilité ;
- les tests et preuves de livraison.

Toute décision locale doit respecter ce document. Une page métier ne peut pas inventer une nouvelle doctrine visuelle.

---

## 2. Hiérarchie des sources UI

L’ordre de résolution est obligatoire.

### Niveau 1 — Catalyst

Catalyst est la source officielle pour les primitives interactives :

- Button ;
- Input ;
- Select ;
- Textarea ;
- Checkbox ;
- Switch ;
- Radio ;
- Fieldset ;
- Field ;
- Label ;
- Description ;
- ErrorMessage ;
- Dialog ;
- Dropdown ;
- Combobox ;
- Listbox ;
- Table ;
- Badge ;
- Sidebar ;
- Navbar ;
- Pagination ;
- Avatar ;
- autres primitives fournies par le kit officiel.

**Règle absolue : une primitive disponible dans Catalyst ne doit jamais être recréée à la main dans le métier.**

Avant d’écrire une primitive générique, le développeur doit vérifier le catalogue Catalyst complet, pas seulement les fichiers déjà présents dans le dépôt.

### Niveau 2 — Compositions Hearst Connect

Les compositions assemblent les primitives sans réinventer leur comportement :

- PageShell ;
- Panel ;
- Section ;
- KPI row ;
- Filter bar ;
- Data toolbar ;
- Empty state ;
- Status banner ;
- Command palette ;
- Data table composition ;
- Chart panel ;
- Timeline ;
- Activity feed.

Ces composants peuvent organiser, densifier ou contextualiser Catalyst, mais ne doivent pas refaire ses contrats d’accessibilité ou d’interaction.

### Niveau 3 — Modules métier

Les modules métier utilisent les compositions :

- finance ;
- mining ;
- serveurs ;
- énergie ;
- clients ;
- projets ;
- facturation ;
- monitoring ;
- opérations.

Un module métier ne doit pas définir une primitive réutilisable générique.

### Niveau 4 — Routes

Les routes composent les modules et fournissent les données. Elles ne doivent pas contenir une seconde grammaire UI.

---

## 3. Doctrine Catalyst

Catalyst est un starter kit vendoré, pas une dépendance opaque.

Les composants sont copiés dans le dépôt puis adaptés au produit. L’adaptation est autorisée si elle reste contrôlée et documentée.

### Adaptations autorisées

- remplacement des couleurs littérales par les tokens Hearst Connect ;
- remplacement des paires `dark:` par le système de surfaces du produit ;
- adaptation à Next.js, par exemple `next/link` ;
- ajustement raisonnable de densité ;
- ajustement de radius, ombres et surfaces par tokens ;
- accent de marque ;
- ajout de tests ;
- correction d’un défaut prouvé sans casser l’API.

### Adaptations interdites

- suppression silencieuse de props ;
- modification arbitraire de l’API publique ;
- remplacement du comportement Headless UI par du code maison ;
- copie approximative « inspirée de Catalyst » ;
- ajout de couleurs métier directement dans la primitive ;
- fork non documenté ;
- réécriture d’un Dialog, Combobox, Select ou Dropdown complexe à la main.

### VENDOR.md obligatoire

Le dossier Catalyst doit contenir un `VENDOR.md` indiquant pour chaque composant :

- source et version du kit ;
- date d’import ;
- statut vendoré ou non vendoré ;
- nature des divergences ;
- éventuelle modification d’API ;
- raison de l’adaptation ;
- tests associés ;
- dette connue.

Lors d’une mise à jour Catalyst :

1. comparer l’ancien original et le nouvel original ;
2. isoler les changements upstream ;
3. rejouer ces changements sur la version Hearst Connect ;
4. ne jamais écraser directement les adaptations ;
5. mettre à jour `VENDOR.md`.

---

## 4. Formulaires

Tous les formulaires doivent utiliser les contrats Catalyst.

Structure attendue :

```tsx
<Field>
  <Label>Nom</Label>
  <Input />
  <Description>Information complémentaire</Description>
  <ErrorMessage>Message d’erreur</ErrorMessage>
</Field>
```

Règles :

- aucun `<label>` isolé sans association stable ;
- aucun message d’erreur visuel non relié au contrôle ;
- `disabled`, `required`, `invalid` et `aria-describedby` doivent être transmis correctement ;
- aucune checkbox, radio ou switch brute si Catalyst fournit la primitive ;
- aucune validation seulement par couleur ;
- le clic sur le label doit focaliser ou activer le contrôle ;
- les erreurs doivent être annoncées par les technologies d’assistance.

---

## 5. Overlays et interactions complexes

Les overlays doivent être fondés sur Catalyst et Headless UI.

Cela concerne :

- Dialog ;
- Drawer ;
- Command palette ;
- Modal ;
- Popover ;
- Dropdown ;
- Combobox ;
- Listbox.

Obligations :

- focus initial défini ;
- focus piégé lorsque nécessaire ;
- Tab et Shift+Tab contrôlés ;
- fermeture par Escape ;
- restitution du focus au déclencheur ;
- nom accessible ;
- contenu arrière non interactif pendant l’ouverture ;
- gestion correcte du scroll ;
- test clavier réel obligatoire.

Il est interdit d’implémenter manuellement un focus trap si Headless UI le fournit.

---

## 6. Tables et affichage de données

Les tableaux doivent utiliser la primitive Table officielle.

Structure attendue :

- Table ;
- TableHead ;
- TableBody ;
- TableRow ;
- TableHeader ;
- TableCell.

Règles :

- zéro `<table>` métier avec sa propre géométrie si la primitive officielle existe ;
- alignement numérique cohérent ;
- en-têtes sémantiques ;
- actions clairement nommées ;
- responsive explicite ;
- scroll horizontal interne si nécessaire ;
- jamais d’écrasement de colonnes sur mobile ;
- état vide, chargement et erreur obligatoires.

---

## 7. Doctrine officielle des charts

### 7.1 Une seule couche de dataviz

La couche officielle est :

**Recharts comme moteur + wrappers inspirés de shadcn Charts + tokens Hearst Connect.**

Aceternity ne devient pas une seconde bibliothèque de graphiques.

Aceternity peut fournir :

- la composition du dashboard ;
- les surfaces ;
- les grilles ;
- les cartes ;
- les animations d’entrée ;
- les arrière-plans ;
- les layouts bento ;
- des références visuelles.

Aceternity ne doit pas définir :

- les contrats de données ;
- les axes ;
- les tooltips métier ;
- les légendes ;
- les formats de nombres ;
- les états de données ;
- la couche d’accessibilité des charts.

### 7.2 Architecture recommandée

```text
src/components/charts/
├── core/
│   ├── chart-container.tsx
│   ├── chart-tooltip.tsx
│   ├── chart-legend.tsx
│   ├── chart-theme.ts
│   ├── chart-formatters.ts
│   └── chart-contracts.ts
├── cartesian/
│   ├── area-chart.tsx
│   ├── bar-chart.tsx
│   ├── line-chart.tsx
│   ├── composed-chart.tsx
│   └── time-series-chart.tsx
├── polar/
│   ├── radar-chart.tsx
│   └── radial-chart.tsx
├── composition/
│   ├── pie-chart.tsx
│   └── donut-chart.tsx
└── index.ts
```

### 7.3 Contrat commun obligatoire

Chaque chart doit accepter un contrat cohérent :

```ts
type ChartState =
  | "live"
  | "loading"
  | "empty"
  | "error"
  | "unavailable"
  | "not_configured"
  | "stale"
  | "simulated"

interface ChartSeries {
  key: string
  label: string
  unit?: string
  colorToken?: string
}
```

Chaque chart doit gérer :

- titre ;
- description ;
- source ;
- timestamp ;
- statut de fraîcheur ;
- tooltip ;
- légende ;
- format des valeurs ;
- état loading ;
- état empty ;
- état error ;
- état unavailable ;
- état simulated clairement signalé ;
- responsive ;
- export ou détail si nécessaire.

### 7.4 Choix du type de chart

- **Line** : séries temporelles et évolution ordonnée ;
- **Area** : volume dans le temps, avec prudence sur les superpositions ;
- **Bar** : comparaison de catégories ;
- **Horizontal bar** : classement ou plus de six catégories ;
- **Stacked bar** : composition comparable dans plusieurs périodes ;
- **Pie/Donut** : composition d’un total, peu de catégories ;
- **Radar** : profil multivariable comparable, jamais pour une série temporelle ;
- **Radial** : progression compacte ou métrique unique, pas pour une analyse détaillée ;
- **Scatter** : relation entre deux variables numériques ;
- **Heatmap** : activité dans le temps ou matrice dense, si une implémentation dédiée est présente.

Ne pas choisir un chart pour son effet visuel. Le type doit correspondre à la question métier.

### 7.5 Couleurs et tokens

Interdictions :

- couleurs hexadécimales dans les composants charts ;
- palettes Recharts par défaut non gouvernées ;
- couleurs différentes pour une même série selon les pages ;
- rouge/vert comme seul moyen de transmettre un statut ;
- couleurs Aceternity ou shadcn copiées directement.

Utiliser des tokens :

```text
--chart-1
--chart-2
--chart-3
--chart-4
--chart-5
--chart-positive
--chart-negative
--chart-warning
--chart-neutral
--chart-grid
--chart-axis
--chart-tooltip-surface
```

Les couleurs de statut et les couleurs de séries sont deux grammaires différentes.

### 7.6 Format des données

Les formats doivent être centralisés :

- devises ;
- pourcentages ;
- énergie ;
- puissance ;
- température ;
- hash rate ;
- BTC ;
- dates ;
- durées ;
- valeurs compactes.

Aucun chart ne doit réinventer son propre formateur monétaire ou temporel.

### 7.7 Accessibilité des charts

Chaque chart doit fournir :

- titre et description accessibles ;
- résumé textuel de la tendance ;
- valeurs disponibles dans le tooltip clavier ou une table alternative lorsque nécessaire ;
- contraste suffisant ;
- motifs, libellés ou formes si la couleur ne suffit pas ;
- ordre de lecture cohérent ;
- absence d’animation obligatoire en `prefers-reduced-motion`.

Un chart visuellement réussi mais incompréhensible sans couleur est non conforme.

### 7.8 Performance

- ne pas rendre des milliers de points sans agrégation ;
- limiter les animations coûteuses ;
- désactiver les animations pour les flux rapides ;
- mémoriser les transformations lourdes ;
- ne pas recalculer les séries dans le rendu ;
- vérifier la taille du bundle ;
- ne pas charger une bibliothèque secondaire pour un seul chart.

---

## 8. Aceternity

Aceternity est une source premium de compositions et de références visuelles.

### Autorisé

- bento grid ;
- fonds animés ;
- beams ;
- compositions de landing ou dashboard ;
- transitions ;
- effets de profondeur ;
- cards de présentation ;
- inspiration de mise en page.

### Interdit sans audit

- boutons ;
- inputs ;
- dialogs ;
- dropdowns ;
- sidebars concurrentes ;
- tables ;
- primitives d’accessibilité ;
- composants qui doublonnent Catalyst ;
- composants qui apportent une seconde palette ou un second système de tokens.

### Règle d’intégration

Chaque composant Aceternity doit être classé avant installation :

- `REFERENCE_VISUELLE` ;
- `INSTALLABLE_AVEC_ADAPTATION` ;
- `NE_PAS_INSTALLER` ;
- `À_AUDITER`.

Un composant installé doit être :

- adapté aux tokens Hearst Connect ;
- débarrassé des couleurs en dur ;
- débarrassé des dépendances inutiles ;
- testé en dark/light ;
- testé en reduced motion ;
- documenté ;
- isolé des primitives Catalyst.

Le code premium ne doit jamais être redistribué comme bibliothèque publique.

---

## 9. Tokens et surfaces

Aucune décoration structurelle ne doit être écrite directement dans les pages métier.

Les tokens doivent couvrir :

- surfaces ;
- encres ;
- bordures ;
- accent ;
- statuts ;
- charts ;
- radius ;
- ombres ;
- espacements ;
- typographie ;
- motion.

Exemples de familles :

```text
surface-app
surface-panel
surface-raised
surface-sunken
surface-hover
surface-edge
ink-strong
ink
ink-muted
ink-faint
accent-500
accent-600
status-success
status-warning
status-danger
```

Règles :

- pas de noir profond comme fond principal ;
- pas de `zinc-*`, `slate-*` ou couleurs Tailwind directes dans le métier ;
- pas de `dark:` dispersé si le thème est piloté par tokens ;
- pas de token inutilisé conservé « au cas où » ;
- tout token dynamique non détectable doit être documenté et testé ;
- les états métier doivent utiliser une table de correspondance centralisée.

---

## 10. Grammaire visuelle Hearst Connect

Hearst Connect doit rester :

- premium ;
- calme ;
- lisible ;
- dense sans être comprimé ;
- plein écran ;
- orienté cockpit ;
- cohérent entre opérations, finance et infrastructure.

Règles visuelles :

- un seul shell principal par page ;
- éviter les cartes imbriquées ;
- éviter les filets concentriques ;
- KPIs non enfermés inutilement ;
- listes et tableaux aussi plats que possible ;
- hiérarchie obtenue par espace, typographie et surface, pas par accumulation de boxes ;
- accent réservé aux actions, sélections et éléments réellement importants ;
- animations fonctionnelles, jamais décoratives au détriment de la lisibilité.

---

## 11. Interdictions générales

Il est interdit de :

- créer une primitive maison sans recherche préalable ;
- installer une bibliothèque UI concurrente sans décision d’architecture ;
- mélanger Catalyst, shadcn UI et Aceternity pour le même contrat ;
- copier une démo sans la tokeniser ;
- coder un chart directement dans une page métier ;
- déclarer fonctionnel un composant uniquement parce qu’il compile ;
- accepter un placeholder comme donnée live ;
- masquer un état indisponible par une fausse donnée ;
- modifier les gates pour faire passer le code ;
- merger sans preuves proportionnelles ;
- déployer sur la seule base d’un build vert.

---

## 12. Tests obligatoires

### Gates techniques

Selon les scripts du dépôt :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Ajouter les gates spécifiques existantes :

- tokens ;
- boundaries ;
- Catalyst integrity ;
- exports ;
- quarantine ;
- tests d’intégration ;
- e2e.

### Validation navigateur

Pour toute modification visible :

- desktop 1440×900 ;
- laptop 1280×800 ;
- mobile 375×812 ou 390×844 ;
- console propre ;
- aucun overflow horizontal ;
- clavier réel ;
- dark/light ;
- reduced motion ;
- loading/empty/error/unavailable ;
- données réelles ou statut honnête.

### Preuves visuelles

Créer :

```text
docs/visual-reviews/<MISSION-ID>/
```

Avec :

- captures par viewport ;
- états interactifs ;
- `manifest.json` ;
- `REVIEW.md` ;
- SHA testé ;
- route ;
- état ;
- erreurs console ;
- erreurs réseau.

---

## 13. Checklist de revue d’un composant

Avant validation :

- [ ] La primitive existe-t-elle déjà dans Catalyst ?
- [ ] Le composant respecte-t-il la hiérarchie des couches ?
- [ ] Toutes les couleurs viennent-elles des tokens ?
- [ ] L’API Catalyst reste-t-elle intacte ?
- [ ] Le composant est-il accessible au clavier ?
- [ ] Les états loading, empty, error et disabled sont-ils couverts ?
- [ ] Le responsive est-il prouvé ?
- [ ] La console est-elle propre ?
- [ ] Les données affichées sont-elles honnêtes ?
- [ ] Les tests prouvent-ils le comportement observable ?
- [ ] La documentation de vendoring est-elle à jour ?
- [ ] Une capture au SHA final existe-t-elle pour une modification visible ?

---

## 14. Checklist fonctionnelle actuelle

Cette checklist est cumulative et doit être mise à jour à chaque mission, rework, review, merge ou déploiement.

### Fonctionnel

Uniquement les éléments réellement utilisables au runtime.

### Testé

Uniquement les éléments prouvés par une commande, un test, un build ou une vérification navigateur.

### Mergé

Uniquement les éléments présents dans la branche principale.

### Déployé

Uniquement les éléments disponibles dans un environnement réellement démarré ou déployé.

### Non fonctionnel

Éléments cassés, incomplets, non conformes ou seulement codés.

### Limites connues

Zones non vérifiées, dettes acceptées et contraintes externes.

### Prochaines étapes

Actions restantes, dans l’ordre.

### Preuves

Toujours inclure lorsque disponibles :

- SHA de départ ;
- SHA final ;
- branche ;
- PR ;
- runId ;
- commandes ;
- exit codes ;
- nombre de tests ;
- routes ;
- captures ;
- environnement de déploiement.

**Ne jamais présenter comme fonctionnel un élément seulement codé ou partiellement vérifié.**

---

## 15. Décision finale de doctrine

Pour Hearst Connect V1 :

- **Catalyst** est l’unique source de primitives ;
- **Hearst Connect compositions** organisent les primitives ;
- **Recharts + wrappers shadcn Charts adaptés** constituent l’unique couche de dataviz ;
- **Aceternity** sert aux compositions visuelles et animations, jamais comme seconde source générale de composants ;
- **les tokens Hearst Connect** gouvernent toutes les surfaces, couleurs, charts et états ;
- **les preuves navigateur** sont obligatoires pour déclarer une UI interactive fonctionnelle.

Toute exception doit être explicitement documentée, testée et approuvée.
