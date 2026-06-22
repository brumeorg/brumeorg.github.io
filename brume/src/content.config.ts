import { defineCollection, z } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				roadmap: z
					.object({
						group: z.enum(['Packaging', 'Engine']),
						status: z.enum(['Planned', 'Exploration']),
						order: z.number().default(0),
					})
					.optional(),
			}),
		}),
	}),
	i18n: defineCollection({
		loader: i18nLoader(),
		schema: i18nSchema({
			extend: z.object({
				'header.docs': z.string().optional(),
				'header.roadmap': z.string().optional(),
				'header.support': z.string().optional(),
				'header.enterprise': z.string().optional(),
				'header.quickstart': z.string().optional(),
				'header.menuOpen': z.string().optional(),
				'header.menuClose': z.string().optional(),
				'theme.toggle': z.string().optional(),
				'enterprise.form.name': z.string().optional(),
				'enterprise.form.namePlaceholder': z.string().optional(),
				'enterprise.form.email': z.string().optional(),
				'enterprise.form.company': z.string().optional(),
				'enterprise.form.companyPlaceholder': z.string().optional(),
				'enterprise.form.teamSize': z.string().optional(),
				'enterprise.form.teamSizeSelect': z.string().optional(),
				'enterprise.form.message': z.string().optional(),
				'enterprise.form.messagePlaceholder': z.string().optional(),
				'enterprise.form.submit': z.string().optional(),
				'enterprise.form.note': z.string().optional(),
				'enterprise.form.noteOr': z.string().optional(),
				'enterprise.form.subjectPrefix': z.string().optional(),
				'enterprise.form.subjectFallback': z.string().optional(),
				'enterprise.form.labelName': z.string().optional(),
				'enterprise.form.labelEmail': z.string().optional(),
				'enterprise.form.labelCompany': z.string().optional(),
				'enterprise.form.labelTeam': z.string().optional(),
				'enterprise.form.sentVia': z.string().optional(),
				'roadmap.packaging.blurb': z.string().optional(),
				'roadmap.engine.blurb': z.string().optional(),
				'roadmap.status.planned': z.string().optional(),
				'roadmap.status.exploration': z.string().optional(),
				'install.label.debian': z.string().optional(),
				'install.label.rhel': z.string().optional(),
				'install.label.macos': z.string().optional(),
			}),
		}),
	}),
};
