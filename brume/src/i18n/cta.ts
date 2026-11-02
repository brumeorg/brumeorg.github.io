/**
 * Calls to action: every text (FR + EN), the pre-filled email bodies and the
 * mailto builder used by CtaBlock, CtaLine, MailtoButton and the hero.
 *
 * Measuring without a tracker: each mailto subject reads
 * `[Brume] <intent> – <page id>`, so replies can be counted per call and page
 * straight from the inbox.
 */

export type Lang = 'fr' | 'en';

export const CONTACT_EMAIL = 'frederik@brume.software';
export const GITHUB_URL = 'https://github.com/brumeorg/Brume';
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`;
export const RELEASES_FEED_URL = `${GITHUB_URL}/releases.atom`;

const prefix = (lang: Lang) => (lang === 'fr' ? '/fr' : '');

/** Internal paths shared by several calls. */
export const paths = (lang: Lang) => ({
	gettingStarted: `${prefix(lang)}/docs/getting-started/`,
	gdpr: `${prefix(lang)}/docs/gdpr/`,
	checklist: `${prefix(lang)}/checklist-dpo/`,
	enterprise: `${prefix(lang)}/enterprise/`,
	partners: `${prefix(lang)}/enterprise/#partenaires`,
});

// ---------------------------------------------------------------------------
// Emails
// ---------------------------------------------------------------------------

type BodyKey = 'call' | 'migration' | 'partner' | 'otherDb' | 'quote' | 'notify';

/** Pre-filled bodies: three questions at most, the sender completes them. */
const BODIES: Record<Lang, Record<BodyKey, string[]>> = {
	fr: {
		call: [
			'Bonjour Frederik,',
			'Entreprise :',
			'Notre situation (copies de prod en recette, démo, debug…) :',
			'Créneaux qui m’arrangent :',
		],
		migration: [
			'Bonjour Frederik,',
			'Outil utilisé aujourd’hui :',
			'Taille approximative de la base :',
			'Ce qui bloque :',
		],
		partner: ['Entreprise :', 'Secteur :', 'Nombre de bases PostgreSQL en production :', 'Besoin principal :'],
		otherDb: ['Entreprise :', 'Base(s) concernée(s) et version :', 'Échéance souhaitée :'],
		quote: ['Bonjour Frederik,', 'Entreprise :', 'Nombre de bases PostgreSQL en production :', 'Besoin principal :'],
		notify: ['Bonjour Frederik,', 'Prévenez-moi à la sortie de ce chantier.'],
	},
	en: {
		call: [
			'Hello Frederik,',
			'Company:',
			'Our situation (production copies in staging, demos, debugging…):',
			'Times that suit me:',
		],
		migration: ['Hello Frederik,', 'Tool used today:', 'Approximate database size:', 'What is blocking:'],
		partner: ['Company:', 'Industry:', 'Number of production PostgreSQL databases:', 'Main need:'],
		otherDb: ['Company:', 'Database(s) and version:', 'Desired timeframe:'],
		quote: ['Hello Frederik,', 'Company:', 'Number of production PostgreSQL databases:', 'Main need:'],
		notify: ['Hello Frederik,', 'Please let me know when this ships.'],
	},
};

/** Subject intents; `{tool}` and `{topic}` are filled from the caller's vars. */
const MAILS = {
	dpoCall: { body: 'call', subject: { fr: 'Échange DPO', en: 'DPO call' } },
	dpoQuestion: { body: 'call', subject: { fr: 'Question DPO', en: 'DPO question' } },
	migration: { body: 'migration', subject: { fr: 'Migration depuis {tool}', en: 'Migration from {tool}' } },
	call: { body: 'call', subject: { fr: 'Appel 20 min', en: '20-min call' } },
	quote: { body: 'quote', subject: { fr: 'Devis', en: 'Quote' } },
	partner: { body: 'partner', subject: { fr: 'Partenaire de lancement', en: 'Launch partner' } },
	sqlServer: { body: 'otherDb', subject: { fr: 'SQL Server', en: 'SQL Server' } },
	otherDb: { body: 'otherDb', subject: { fr: 'Autre base', en: 'Other database' } },
	kanon: { body: 'call', subject: { fr: 'Rapport k-anonymat', en: 'k-anonymity report' } },
	checklist: { body: 'call', subject: { fr: 'Checklist DPO', en: 'DPO checklist' } },
	notify: { body: 'notify', subject: { fr: 'Me prévenir : {topic}', en: 'Notify me: {topic}' } },
	// The Enterprise form writes its own body from the fields the visitor filled in.
	contact: { body: undefined, subject: { fr: 'Contact', en: 'Contact' } },
} satisfies Record<string, { body: BodyKey | undefined; subject: Record<Lang, string> }>;

export type MailIntent = keyof typeof MAILS;

const fill = (template: string, vars: Record<string, string>) =>
	template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');

export function mailSubject(lang: Lang, intent: MailIntent, page: string, vars: Record<string, string> = {}) {
	return `[Brume] ${fill(MAILS[intent].subject[lang], vars)} – ${page}`;
}

const encode = (value: string) => encodeURIComponent(value).replace(/'/g, '%27');

export function mailtoHref(subject: string, lines: string[] = []) {
	// RFC 6068: line breaks in a mailto body must be CRLF.
	const body = lines.map((line) => `${line} `).join('\r\n');
	const query = `subject=${encode(subject)}` + (body ? `&body=${encode(body)}` : '');
	return `mailto:${CONTACT_EMAIL}?${query}`;
}

export function mailto(lang: Lang, intent: MailIntent, page: string, vars: Record<string, string> = {}) {
	const { body } = MAILS[intent];
	return mailtoHref(mailSubject(lang, intent, page, vars), body ? BODIES[lang][body] : []);
}

// ---------------------------------------------------------------------------
// Texts
// ---------------------------------------------------------------------------

export const ctaTexts = {
	fr: {
		externalSite: '(site externe)',
		mailNote: 'Ouvre votre messagerie. Votre adresse sert uniquement à vous répondre.',
		notifyNote: 'Ouvre votre messagerie. Votre adresse sert uniquement à vous prévenir de cette sortie.',
		dev: {
			title: 'Essayez Brume sur votre schéma',
			text: 'Installation en deux étapes, lecture seule sur votre base source.',
			primary: 'Démarrer',
			secondary: 'Voir le code sur GitHub',
		},
		dpo: {
			title: 'Vous êtes DPO ou RSSI ?',
			text: 'Vérifiez en 5 minutes ce qu’il faut encadrer avant de copier la production en recette.',
			primary: 'Lire la checklist DPO',
			secondary: 'Échanger 20 min avec le fondateur',
		},
		compare: {
			title: 'Comparez sur vos propres données',
			text: '<code>brume scan</code> propose des règles à partir de votre schéma, sans rien écrire sur la base source.',
			primary: 'Démarrer',
			secondary: 'Vous migrez depuis un autre outil ? Écrivez-nous',
		},
		enterprise: {
			title: 'Déployer Brume dans votre organisation',
			text: 'Support avec engagement de délai, règles sur mesure, accompagnement.',
			primary: 'Voir l’offre Enterprise',
			secondary: 'Devenir partenaire de lancement',
		},
		follow: {
			title: 'Suivre le projet',
			text: 'Être prévenu des nouvelles versions, sans inscription.',
			primary: 'Mettre une étoile sur GitHub',
			secondary: 'Flux des versions (RSS)',
		},
		roadmap: {
			title: 'Ce chantier vous intéresse ?',
			text: 'Dites-le nous : la demande aide à fixer les priorités.',
			textWithIssue: 'Votez sur GitHub (ajoutez un 👍 à l’issue) : la demande aide à fixer les priorités.',
			vote: 'Voter pour ce chantier',
			notify: 'Être prévenu de sa sortie',
			feed: 'Flux des versions (RSS)',
		},
		lines: {
			enterpriseRefresh: {
				lead: 'Besoin d’un rafraîchissement automatisé et supporté pour plusieurs équipes ?',
				label: 'Voir l’offre Enterprise',
			},
			enterpriseDocs: {
				lead: 'Support avec engagement de délai et règles sur mesure :',
				label: 'voir l’offre Enterprise',
			},
			kanon: { lead: 'Présenter ce rapport à votre DPO ?', label: 'Écrivez-nous' },
			otherDb: { lead: 'Une autre base que PostgreSQL ?', label: 'Dites-nous laquelle' },
			checklist: { lead: 'Une question sur un point de cette checklist ?', label: 'Écrire à Frederik' },
		},
	},
	en: {
		externalSite: '(external site)',
		mailNote: 'Opens your email app. Your address is only used to reply to you.',
		notifyNote: 'Opens your email app. Your address is only used to tell you when this ships.',
		dev: {
			title: 'Try Brume on your schema',
			text: 'Two-step install, read-only on your source database.',
			primary: 'Get started',
			secondary: 'View the code on GitHub',
		},
		dpo: {
			title: 'Are you a DPO or CISO?',
			text: 'Check in 5 minutes what needs to be in place before copying production to a test environment.',
			primary: 'Read the DPO checklist',
			secondary: 'Talk to the founder for 20 min',
		},
		compare: {
			title: 'Compare on your own data',
			text: '<code>brume scan</code> drafts rules from your schema, without writing anything to the source database.',
			primary: 'Get started',
			secondary: 'Migrating from another tool? Write to us',
		},
		enterprise: {
			title: 'Roll out Brume across your organization',
			text: 'Support with a response-time commitment, custom rules, hands-on onboarding.',
			primary: 'See the Enterprise offer',
			secondary: 'Become a launch partner',
		},
		follow: {
			title: 'Follow the project',
			text: 'Hear about new releases, no sign-up.',
			primary: 'Star on GitHub',
			secondary: 'Release feed (RSS)',
		},
		roadmap: {
			title: 'Interested in this item?',
			text: 'Let us know: demand helps set priorities.',
			textWithIssue: 'Vote on GitHub (add a 👍 to the issue): demand helps set priorities.',
			vote: 'Vote for this item',
			notify: 'Get notified when it ships',
			feed: 'Release feed (RSS)',
		},
		lines: {
			enterpriseRefresh: {
				lead: 'Need an automated, supported refresh for several teams?',
				label: 'See the Enterprise offer',
			},
			enterpriseDocs: {
				lead: 'Support with a response-time commitment and custom rules:',
				label: 'see the Enterprise offer',
			},
			kanon: { lead: 'Presenting this report to your DPO?', label: 'Write to us' },
			otherDb: { lead: 'A database other than PostgreSQL?', label: 'Tell us which one' },
			checklist: { lead: 'A question about an item on this checklist?', label: 'Write to Frederik' },
		},
	},
} satisfies Record<Lang, unknown>;

export type CtaLineKey = keyof (typeof ctaTexts)['fr']['lines'];

/** Where each one-line call points: an internal page, or a mail intent. */
export const ctaLineTargets: Record<CtaLineKey, { path?: keyof ReturnType<typeof paths>; mail?: MailIntent }> = {
	enterpriseRefresh: { path: 'enterprise' },
	enterpriseDocs: { path: 'enterprise' },
	kanon: { mail: 'kanon' },
	otherDb: { mail: 'otherDb' },
	checklist: { mail: 'checklist' },
};
