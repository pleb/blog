import React from 'react'
import matter from 'gray-matter'
import { IBlogMetadata } from '../index'
import { GetStaticProps, GetStaticPaths, GetStaticPropsContext } from 'next'
import { extractBlogMeta } from '../../shared/posts'
import { getPostsMarkdownFileNames, readPostFile } from '../../shared/build-time/posts'
import { covertMarkdownToHtml } from '../../shared/build-time/utilities'

interface IBlogPostProps {
  blogMeta: IBlogMetadata
  html: string
}

const BlogPostPage = (props: IBlogPostProps) => {
  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <h1>{props.blogMeta.title}</h1>
        <section dangerouslySetInnerHTML={{ __html: props.html }}></section>
        <p>Date {props.blogMeta.date}</p>
      </main>
      <footer>
        <p>Author: Wade Baglin</p>
      </footer>
    </>
  )
}

export default BlogPostPage

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext): Promise<{ props: IBlogPostProps }> => {
  const slug = context.params!.slug
  const { data, content } = matter(readPostFile(`${slug}.md`))
  const blogMeta = extractBlogMeta(data)
  const html = await covertMarkdownToHtml(content)

  return {
    props: {
      blogMeta,
      html
    }
  }
}

export const getStaticPaths: GetStaticPaths = async (): Promise<{
  paths: Array<string | { params: { slug: string } }>
  fallback: boolean
}> => {
  const markdownFileNames = await getPostsMarkdownFileNames()
  const markdownFileNamesWithoutExtensions = markdownFileNames.map((fileName) => fileName.replace('.md', ''))

  return {
    paths: markdownFileNamesWithoutExtensions.map((slug) => {
      return {
        params: {
          slug: slug
        }
      }
    }),
    fallback: false
  }
}
