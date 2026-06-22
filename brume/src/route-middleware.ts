import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import type { SidebarEntry } from '@astrojs/starlight/types';

/**
 * Map URL prefixes to a logical "section" name. The sidebar is filtered so
 * that each section sees only its own groups — no shared sidebar between
 * Docs, Roadmap and Support.
 */
const SECTIONS: Record<string, string> = {
	'/docs': 'docs',
	'/roadmap': 'roadmap',
	'/support': 'support',
};

/** Strip the `/fr` locale prefix so the same section logic works in both locales. */
function stripLocale(pathname: string): { path: string; isFrench: boolean } {
	if (pathname === '/fr' || pathname.startsWith('/fr/')) {
		return { path: pathname.replace(/^\/fr/, '') || '/', isFrench: true };
	}
	return { path: pathname, isFrench: false };
}

/** Detect the section a sidebar entry belongs to from the first link it contains. */
function entrySection(entry: SidebarEntry): string | null {
	if (entry.type === 'link') {
		const { path } = stripLocale(new URL(entry.href, 'http://x').pathname);
		for (const [prefix, name] of Object.entries(SECTIONS)) {
			if (path.startsWith(prefix + '/') || path === prefix + '/') {
				return name;
			}
		}
		return null;
	}
	// Group: look at first child that returns a section.
	for (const child of entry.entries) {
		const found = entrySection(child);
		if (found) return found;
	}
	return null;
}

/** Detect the current section from the request URL. */
function currentSection(pathname: string): string | null {
	const { path } = stripLocale(pathname);
	for (const [prefix, name] of Object.entries(SECTIONS)) {
		if (path === prefix + '/' || path.startsWith(prefix + '/')) {
			return name;
		}
	}
	return null;
}

const KEYWORDS: Record<string, string> = {
	en: 'postgresql, pseudonymization, GDPR, foreign keys, fake data, format-preserving encryption, test data, anonymization, postgres, database masking',
	fr: 'postgresql, pseudonymisation, RGPD, clés étrangères, fausses données, chiffrement préservant le format, données de test, anonymisation, postgres, masquage de base de données',
};

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	if (!route) return;

	const pathname = new URL(context.request.url).pathname;
	const { isFrench } = stripLocale(pathname);

	// Inject locale-specific SEO keywords (the global head only carries shared tags).
	const lang = isFrench ? 'fr' : 'en';
	(route.head ?? (route.head = [])).push({
		tag: 'meta',
		attrs: { name: 'keywords', content: KEYWORDS[lang] },
	});

	if (!route.sidebar) return;
	const section = currentSection(pathname);
	if (!section) return; // Landing or 404 — leave sidebar untouched.

	// Roadmap pages have no left sidebar at all.
	if (section === 'roadmap') {
		route.sidebar = [];
		route.hasSidebar = false;
		return;
	}

	route.sidebar = route.sidebar.filter((entry) => entrySection(entry) === section);
});
