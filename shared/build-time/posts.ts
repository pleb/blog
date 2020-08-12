import { readdir, readFileSync } from 'fs-extra'
import { IBlogMetadata } from '../../pages'
import matter from 'gray-matter'
import { extractBlogMeta } from "../posts";

export const getPostsMarkdownFileNames = async (): Promise<string[]> =>
  (await readdir(`${process.cwd()}/posts`)).filter((fn: string) => fn.endsWith('.md'))

export const readPostFile = (fileName: string): Buffer => readFileSync(`${process.cwd()}/posts/${fileName}`)

export const getBlogMetadata = async (filterCategory?: string): Promise<IBlogMetadata[]> => {
  const postFileNames = await getPostsMarkdownFileNames()
  const blogMetadata = postFileNames.map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return !filterCategory
    ? blogMetadata
    : blogMetadata.filter((blogMetadata) => blogMetadata.categories.some((c) => c.toLowerCase() == filterCategory.toLowerCase()))
}