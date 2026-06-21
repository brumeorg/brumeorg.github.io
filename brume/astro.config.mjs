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
				{ tag: 'meta', attrs: { property: 'og:image', content: OG_IMAGE } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1536' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '1024' } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: OG_IMAGE } },
				{
					tag: 'meta',
					attrs: {
						name: 'keywords',
						content:
							'postgresql, pseudonymization, GDPR, foreign keys, fake data, format-preserving encryption, test data, anonymization, postgres, database masking',
					},
				},
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
					collapsed: false,
					items: [
						{ label: 'Getting started', slug: 'docs/getting-started' },
						{ label: 'Your first pseudonymization', slug: 'docs/first-pseudonymization' },
					],
				},
				{
					label: 'Concepts',
					collapsed: false,
					items: [
						{ label: 'How Brume works', slug: 'docs/how-it-works' },
						{ label: 'Pseudonymization strategies', slug: 'docs/strategies' },
						{ label: 'Semantic types', slug: 'docs/semantic-types' },
					],
				},
				{
					label: 'Reference',
					collapsed: false,
					items: [
						{ label: 'brume.yml', slug: 'docs/configuration' },
						{ label: 'CLI commands', slug: 'docs/cli' },
						{ label: '.env variables', slug: 'docs/env' },
					],
				},
				{
					label: 'Use it well',
					collapsed: false,
					items: [
						{ label: 'Recipes', slug: 'docs/recipes' },
						{ label: 'GDPR & compliance', slug: 'docs/gdpr' },
						{ label: 'k-Anonymity audit', slug: 'docs/k-anonymity' },
						{ label: 'Operations & troubleshooting', slug: 'docs/operations' },
					],
				},
				// --- Roadmap section ---
				{ label: 'Overview', slug: 'roadmap' },
				{
					label: 'Packaging',
					collapsed: false,
					items: [
						{ label: 'Alpine build', slug: 'roadmap/alpine-build' },
						{ label: 'Containerization', slug: 'roadmap/containerization' },
					],
				},
				{
					label: 'Engine',
					collapsed: false,
					items: [
						{ label: 'Merge mode', slug: 'roadmap/merge-mode' },
						{ label: 'Other databases', slug: 'roadmap/other-databases' },
					],
				},
				// --- Support section ---
				{
					label: 'Support',
					collapsed: false,
					items: [
						{ label: 'Overview', slug: 'support' },
						{ label: 'GitHub', slug: 'support/github' },
						{ label: 'Talk to the team', slug: 'support/team' },
					],
				},
			],
		}),
	],
});
