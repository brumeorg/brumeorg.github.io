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

/** Detect the section a sidebar entry belongs to from the first link it contains. */
function entrySection(entry: SidebarEntry): string | null {
	if (entry.type === 'link') {
		for (const [prefix, name] of Object.entries(SECTIONS)) {
			if (entry.href.startsWith(prefix + '/') || entry.href === prefix + '/') {
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
	for (const [prefix, name] of Object.entries(SECTIONS)) {
		if (pathname === prefix + '/' || pathname.startsWith(prefix + '/')) {
			return name;
		}
	}
	return null;
}

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	if (!route?.sidebar) return;

	const section = currentSection(new URL(context.request.url).pathname);
	if (!section) return; // Landing or 404 — leave sidebar untouched.

	// Roadmap pages have no left sidebar at all.
	if (section === 'roadmap') {
		route.sidebar = [];
		route.hasSidebar = false;
		return;
	}

	route.sidebar = route.sidebar.filter((entry) => entrySection(entry) === section);
});
