import { readdir, readFileSync } from 'fs-extra'

export const getPostsMarkdownFileNames = async () => (await readdir(`${process.cwd()}/posts`)).filter((fn: string) => fn.endsWith('.md'))

export const readPostFile = (fileName: string) => readFileSync(`${process.cwd()}/posts/${fileName}`)

export const extractBlogMeta = (data: { [key: string]: any }) => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: data['categories'] ?? [],
  date: data['date']
})
