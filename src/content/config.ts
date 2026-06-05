import { defineCollection, z } from "astro:content";

const postsCollection: ReturnType<typeof defineCollection> = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const specCollection: ReturnType<typeof defineCollection> = defineCollection({
	schema: z.object({
		title: z.string().optional(),
		published: z.date().optional(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
	}),
});

const assetsCollection: ReturnType<typeof defineCollection> = defineCollection({
	loader: () => [],
	schema: z.object({}),
});

const devlogsCollection: ReturnType<typeof defineCollection> = defineCollection(
	{
		schema: z.object({
			title: z.string(),
			published: z.date(),
			project: z.string(), // 项目ID，如 'xueliangyun' 或 'endfield-yunzai'
			summary: z.string().optional().default(""),
		}),
	},
);

export const collections: Record<
	string,
	ReturnType<typeof defineCollection>
> = {
	posts: postsCollection,
	spec: specCollection,
	assets: assetsCollection,
	devlogs: devlogsCollection,
};
