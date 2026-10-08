import type { Offer } from '@/lib/offers/model'

/**
 * Les courriels du parcours.
 *
 * Quatre moments où le client reçoit quelque chose, et où le texte engage
 * l'entreprise : la proposition, l'appel de fonds, la confirmation de
 * réception, puis les accès. Chacun est déclenché par une transition d'état,
 * jamais envoyé à la main.
 *
 * Les textes vivent ici, en un seul endroit, pour deux raisons. D'abord parce
 * qu'un courriel qui annonce un virement est un document contractuel : il doit
 * se relire, se corriger, se versionner comme du code. Ensuite parce qu'un
 * modèle recopié dans deux écrans finit par diverger, et le client reçoit
 * alors deux versions de la même promesse.
 *
 * L'envoi passe par le backend : il part du Gmail de l'opérateur et se
 * consigne dans HubSpot (voir `admin-offer-email-send`). L'adresse de dépôt de
 * l'appel de fonds vient de Fireblocks, ouverte à l'acceptation de l'offre.
 */

export type EmailTemplate = Readonly<{
  id: string
  /** L'état qui déclenche ce courriel. */
  trigger: string
  subject: string
  body: string
}>

/** Un montant en dollars, tel qu'il doit apparaître dans un courriel. */
function usd(amount: number | null): string {
  if (amount === null) return '[amount]'
  return `$${amount.toLocaleString('en-US')}`
}

function pct(bps: number): string {
  return `${Math.round(bps / 100)} %`
}

/**
 * 1 — LA PROPOSITION.
 *
 * Porte les termes, pas une promesse de rendement : le produit engage un
 * capital sur une durée, il ne garantit pas un résultat.
 */
export function proposalEmail(offer: Offer): EmailTemplate {
  return {
    id: 'proposal',
    trigger: 'draft → sent',
    subject: `Hearst Connect — your Bitcoin Strategic Reserve proposal (${offer.reference})`,
    body: `Hello,

Following our conversation, here is the proposal for ${offer.clientName}.

  Capital            ${usd(offer.amountUsdc)} USDC
  Lock-up            ${offer.lockupMonths} months
  Allocation         ${pct(offer.allocation.miningBps)} mining · ${pct(offer.allocation.lendingBps)} bitcoin lending · ${pct(offer.allocation.stableBps)} USDC

The mining pocket acquires bitcoin below market price through our own fleet.
The other two pockets carry the defensive part of the allocation.

The attached projection shows a range, not a forecast: the gap between the
unfavourable and favourable scenarios is the message. Capital is committed for
the full lock-up; distributions are paid monthly throughout.

Happy to walk through any of it.

— Hearst`,
  }
}

/**
 * 2 — L'APPEL DE FONDS.
 *
 * Part une fois l'offre acceptée. Le virement passe par Fireblocks : les
 * institutionnels opèrent ainsi, et un lien de virement dans un courriel doit
 * pouvoir se vérifier hors du courriel.
 */
export function fundingEmail(offer: Offer): EmailTemplate {
  return {
    id: 'funding',
    trigger: 'accepted → funding',
    subject: `Hearst Connect — funding instructions (${offer.reference})`,
    body: `Hello,

Thank you for confirming. Here are the funding instructions for ${offer.clientName}.

  Amount             ${usd(offer.amountUsdc)} USDC
  Network            ${offer.fireblocks?.network ?? '[network]'}
  Deposit address    ${offer.fireblocks?.depositAddress ?? '[FIREBLOCKS_DEPOSIT_ADDRESS]'}

This address belongs to your dedicated vault account at Fireblocks. Please
confirm it with us by phone before approving the transfer — never from this
email alone. We will confirm receipt as soon as the transfer
settles, and your vault opens at that point.

— Hearst`,
  }
}

/**
 * 3 — LA RÉCEPTION.
 *
 * Confirme le virement et annonce l'ouverture du vault. Séparé du courriel
 * d'accès : recevoir des fonds et recevoir un mot de passe ne se mélangent
 * pas dans le même message.
 */
export function fundedEmail(offer: Offer): EmailTemplate {
  return {
    id: 'funded',
    trigger: 'funding → funded',
    subject: `Hearst Connect — funds received (${offer.reference})`,
    body: `Hello,

We have received ${usd(offer.amountUsdc)} USDC for ${offer.clientName}.

Your dedicated vault is being opened with the allocation agreed:
${pct(offer.allocation.miningBps)} mining · ${pct(offer.allocation.lendingBps)} bitcoin lending · ${pct(offer.allocation.stableBps)} USDC.

Your access credentials follow in a separate email.

— Hearst`,
  }
}

/**
 * 4 — LES ACCÈS.
 *
 * Le mot de passe est PROVISOIRE et le client en choisit un autre à la
 * première connexion : un mot de passe qui circule par courriel ne doit pas
 * rester valable.
 */
export function credentialsEmail(offer: Offer): EmailTemplate {
  return {
    id: 'credentials',
    trigger: 'funded → active',
    subject: 'Hearst Connect — your access',
    body: `Hello,

Your vault is live. You can now follow it here:

  Address            https://connect.hearst.app/login
  Username           ${offer.contactEmail ?? '[email]'}
  Temporary password [TEMPORARY_PASSWORD]

This password works once. You will be asked to choose your own on first
sign-in, and this one stops working at that point.

Inside you will find what your vault holds, what it has produced, and what you
can withdraw.

— Hearst`,
  }
}

/** Les quatre gabarits d'une offre, dans l'ordre du parcours. */
export function emailsFor(offer: Offer): readonly EmailTemplate[] {
  return [proposalEmail(offer), fundingEmail(offer), fundedEmail(offer), credentialsEmail(offer)]
}
