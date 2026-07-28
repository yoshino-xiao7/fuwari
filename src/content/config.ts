import { type CollectionConfig, defineCollection, z } from "astro:content";

type PostsSchema = z.ZodObject<{
	title: z.ZodString;
	published: z.ZodDate;
	updated: z.ZodOptional<z.ZodDate>;
	draft: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
	description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
	image: z.ZodDefault<z.ZodOptional<z.ZodString>>;
	tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
	category: z.ZodDefault<z.ZodOptional<z.ZodString>>;
	lang: z.ZodDefault<z.ZodOptional<z.ZodString>>;
	pinned: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
	prevTitle: z.ZodDefault<z.ZodString>;
	prevSlug: z.ZodDefault<z.ZodString>;
	nextTitle: z.ZodDefault<z.ZodString>;
	nextSlug: z.ZodDefault<z.ZodString>;
}>;

type SpecSchema = z.ZodObject<{
	title: z.ZodOptional<z.ZodString>;
	published: z.ZodOptional<z.ZodDate>;
	updated: z.ZodOptional<z.ZodDate>;
	draft: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}>;

type AssetsSchema = z.ZodObject<Record<string, never>>;

type DevlogsSchema = z.ZodObject<{
	title: z.ZodString;
	published: z.ZodDate;
	project: z.ZodString;
	summary: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}>;

const postsCollection: CollectionConfig<PostsSchema> = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().default(""),
		lang: z.string().optional().default(""),
		pinned: z.boolean().optional().default(false),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const specCollection: CollectionConfig<SpecSchema> = defineCollection({
	schema: z.object({
		title: z.string().optional(),
		published: z.date().optional(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
	}),
});

const assetsCollection: CollectionConfig<AssetsSchema> = defineCollection({
	loader: () => [],
	schema: z.object({}),
});

const devlogsCollection: CollectionConfig<DevlogsSchema> = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		project: z.string(), // 项目ID，如 'xueliangyun' 或 'endfield-yunzai'
		summary: z.string().optional().default(""),
	}),
});

export const collections: {
	posts: typeof postsCollection;
	spec: typeof specCollection;
	assets: typeof assetsCollection;
	devlogs: typeof devlogsCollection;
} = {
	posts: postsCollection,
	spec: specCollection,
	assets: assetsCollection,
	devlogs: devlogsCollection,
};
