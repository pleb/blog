import { IBlogMetadata } from '../pages'

export const extractBlogMeta = (data: { [key: string]: any }): IBlogMetadata => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: (data['categories'] ?? []).map(sanitiseCategory),
  date: data['date']
})

export const getDistinctCategories = (blogMetadata: IBlogMetadata[]): string[] =>
  blogMetadata
    .map((blogMetadata) => blogMetadata.categories)
    .reduce((acc, val) => [...acc, ...val])
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((catA: string, catB: string) => catA.localeCompare(catB))

export const sortBlogMetaDescending = (meta: IBlogMetadata[]): IBlogMetadata[] =>
  meta.sort((blogA, blogB) => new Date(blogB.date).getTime() - new Date(blogA.date).getTime())

export const sanitiseCategory = (category: string): string => category.replace(/([^a-z0-9\-])+/gi, '-').toLowerCase()
