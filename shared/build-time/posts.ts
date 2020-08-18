import matter from 'gray-matter'
import { IBlogMetadata } from '../../pages'
import { extractBlogMeta } from '../posts'
import { getMarkdownFileNames, readFile } from './utilities'

export const getPostsMarkdownFileNames = async (): Promise<string[]> => getMarkdownFileNames('posts')

export const readPostFile = (fileName: string): Buffer => readFile('posts', fileName)

export const getBlogMetadata = async (filterCategorySlug?: string): Promise<IBlogMetadata[]> => {
  const postFileNames = await getPostsMarkdownFileNames()
  const blogMetadata = postFileNames.map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return !filterCategorySlug
    ? blogMetadata
    : blogMetadata.filter((blogMetadata) => blogMetadata.categories.some((c) => c.slug === filterCategorySlug))
}
