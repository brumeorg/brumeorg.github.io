import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

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
};
