import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writing = defineCollection({
	loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			publishDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			category: z.string(),
			tags: z.array(z.string()).default([]),
			featured: z.boolean().default(false),
			draft: z.boolean().default(false),
			placeholder: z.boolean().default(false),
			coverImage: z.optional(image()),
			coverImageAlt: z.string().optional(),
			canonicalURL: z.string().url().optional(),
		}).refine((data) => !data.coverImage || Boolean(data.coverImageAlt?.trim()), {
			message: 'coverImageAlt is required when coverImage is set',
			path: ['coverImageAlt'],
		}),
});

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			status: z.enum(['active', 'exploring', 'archived', 'placeholder']).default('exploring'),
			publishedDate: z.coerce.date().optional(),
			updatedDate: z.coerce.date().optional(),
			technologies: z.array(z.string()).default([]),
			featured: z.boolean().default(false),
			draft: z.boolean().default(false),
			placeholder: z.boolean().default(false),
			coverImage: z.optional(image()),
			coverImageAlt: z.string().optional(),
			links: z
				.array(z.object({ label: z.string(), href: z.string().url() }))
				.default([]),
		}).refine((data) => !data.coverImage || Boolean(data.coverImageAlt?.trim()), {
			message: 'coverImageAlt is required when coverImage is set',
			path: ['coverImageAlt'],
		}),
});

export const collections = { writing, projects };
