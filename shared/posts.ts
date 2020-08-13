import { IBlogCategory, IBlogMetadata } from '../pages'

export const extractBlogMeta = (data: { [key: string]: any }): IBlogMetadata => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: (data['categories'] ?? []).map((c: string) => ({ name: c, slug: sanitiseCategory(c) })),
  date: data['date']
})

export const getDistinctCategories = (blogMetadata: IBlogMetadata[]): IBlogCategory[] =>
  blogMetadata
    .map((blogMetadata) => blogMetadata.categories)
    .reduce((acc, val) => [...acc, ...val])
    .filter((value, index, self) => self.findIndex(bc => bc.slug === value.slug) === index)
    .sort((catA: IBlogCategory, catB: IBlogCategory) => catA.slug.localeCompare(catB.slug))

export const sortBlogMetaDescending = (meta: IBlogMetadata[]): IBlogMetadata[] =>
  meta.sort((blogA, blogB) => new Date(blogB.date).getTime() - new Date(blogA.date).getTime())

export const sanitiseCategory = (category: string): string => category.replace(/([^a-z0-9\-])+/gi, '-').toLowerCase()
