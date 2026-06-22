// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import catppuccin from 'starlight-theme-catppuccin';

const SITE_URL = 'https://brumeorg.github.io';
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const DESCRIPTION =
	'Deterministic PostgreSQL pseudonymization with foreign key preservation. Real data shape, GDPR-compliant. For debugging, testing, demos — anywhere but production.';

const softwareJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'SoftwareApplication',
	name: 'Brume',
	description: DESCRIPTION,
	applicationCategory: 'DeveloperApplication',
	operatingSystem: 'Linux, macOS',
	url: SITE_URL,
	downloadUrl: `${SITE_URL}/docs/getting-started/`,
	offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

const organizationJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Organization',
	name: 'Brume',
	url: SITE_URL,
	logo: OG_IMAGE,
	sameAs: ['https://github.com/brumeorg/Brume'],
};

// https://astro.build/config
export default defineConfig({
	site: SITE_URL,
	integrations: [
		starlight({
			title: 'Brume',
			description: DESCRIPTION,
			defaultLocale: 'root',
			locales: {
				root: { label: 'English', lang: 'en' },
				fr: { label: 'Français', lang: 'fr' },
			},
			favicon: '/logo.png',
			plugins: [catppuccin({ dark: 'macchiato-green', light: 'latte-green' })],
			routeMiddleware: './src/route-middleware.ts',
			logo: {
				src: './src/assets/brume.webp',
				replacesTitle: true,
			},
			customCss: ['./src/styles/custom.css'],
			pagefind: false,
			head: [
				{
					tag: 'script',
					content:
						"(function(){try{var p=location.pathname;if(p!=='/'&&p!=='')return;if(localStorage.getItem('brume_lang'))return;var l=(navigator.language||navigator.userLanguage||'').toLowerCase();if(l.indexOf('fr')===0)location.replace('/fr/');}catch(e){}})();",
				},
				{ tag: 'meta', attrs: { property: 'og:image', content: OG_IMAGE } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1536' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '1024' } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: OG_IMAGE } },
				{
					tag: 'script',
					attrs: { type: 'application/ld+json' },
					content: JSON.stringify(softwareJsonLd),
				},
				{
					tag: 'script',
					attrs: { type: 'application/ld+json' },
					content: JSON.stringify(organizationJsonLd),
				},
			],
			components: {
				SocialIcons: './src/components/HeaderTabs.astro',
				ThemeSelect: './src/components/ThemeToggle.astro',
				LanguageSelect: './src/components/QuickstartButton.astro',
				Search: './src/components/MobileMenu.astro',
			},
			sidebar: [
				// --- Documentation section ---
				{
					label: 'Start here',
					translations: { fr: 'Commencer ici' },
					collapsed: false,
					items: [
						{
							label: 'Getting started',
							translations: { fr: 'Démarrage' },
							slug: 'docs/getting-started',
						},
						{
							label: 'Your first pseudonymization',
							translations: { fr: 'Votre première pseudonymisation' },
							slug: 'docs/first-pseudonymization',
						},
					],
				},
				{
					label: 'Concepts',
					translations: { fr: 'Concepts' },
					collapsed: false,
					items: [
						{
							label: 'How Brume works',
							translations: { fr: 'Comment fonctionne Brume' },
							slug: 'docs/how-it-works',
						},
						{
							label: 'Pseudonymization strategies',
							translations: { fr: 'Stratégies de pseudonymisation' },
							slug: 'docs/strategies',
						},
						{
							label: 'Semantic types',
							translations: { fr: 'Types sémantiques' },
							slug: 'docs/semantic-types',
						},
					],
				},
				{
					label: 'Reference',
					translations: { fr: 'Référence' },
					collapsed: false,
					items: [
						{ label: 'brume.yml', slug: 'docs/configuration' },
						{
							label: 'CLI commands',
							translations: { fr: 'Commandes CLI' },
							slug: 'docs/cli',
						},
						{
							label: '.env variables',
							translations: { fr: 'Variables .env' },
							slug: 'docs/env',
						},
					],
				},
				{
					label: 'Use it well',
					translations: { fr: 'Bien l\'utiliser' },
					collapsed: false,
					items: [
						{
							label: 'Recipes',
							translations: { fr: 'Recettes' },
							slug: 'docs/recipes',
						},
						{
							label: 'GDPR & compliance',
							translations: { fr: 'RGPD & conformité' },
							slug: 'docs/gdpr',
						},
						{
							label: 'k-Anonymity audit',
							translations: { fr: 'Audit k-anonymat' },
							slug: 'docs/k-anonymity',
						},
						{
							label: 'Operations & troubleshooting',
							translations: { fr: 'Exploitation & dépannage' },
							slug: 'docs/operations',
						},
					],
				},
				// --- Roadmap section ---
				{
					label: 'Overview',
					translations: { fr: 'Vue d\'ensemble' },
					slug: 'roadmap',
				},
				{
					label: 'Packaging',
					translations: { fr: 'Packaging' },
					collapsed: false,
					items: [
						{
							label: 'Alpine build',
							translations: { fr: 'Build Alpine' },
							slug: 'roadmap/alpine-build',
						},
						{
							label: 'Containerization',
							translations: { fr: 'Conteneurisation' },
							slug: 'roadmap/containerization',
						},
					],
				},
				{
					label: 'Engine',
					translations: { fr: 'Moteur' },
					collapsed: false,
					items: [
						{
							label: 'Merge mode',
							translations: { fr: 'Mode fusion' },
							slug: 'roadmap/merge-mode',
						},
						{
							label: 'Other databases',
							translations: { fr: 'Autres bases de données' },
							slug: 'roadmap/other-databases',
						},
					],
				},
				// --- Support section ---
				{
					label: 'Support',
					translations: { fr: 'Support' },
					collapsed: false,
					items: [
						{
							label: 'Overview',
							translations: { fr: 'Vue d\'ensemble' },
							slug: 'support',
						},
						{ label: 'GitHub', slug: 'support/github' },
						{
							label: 'Talk to the team',
							translations: { fr: 'Parler à l\'équipe' },
							slug: 'support/team',
						},
					],
				},
			],
		}),
	],
});
