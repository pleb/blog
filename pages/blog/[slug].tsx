import React from 'react'
import html from 'remark-html'
import highlight from 'remark-highlight.js'
import unified from 'unified'
import markdown from 'remark-parse'
import matter from 'gray-matter'
import { IBlogMetadata } from '../index'
import { GetStaticProps, GetStaticPaths, GetStaticPropsContext } from 'next'
import { extractBlogMeta } from '../../shared/posts'
import { getPostsMarkdownFileNames, readPostFile } from '../../shared/build-time/posts'

interface IBlogPostProps {
  blogMeta: IBlogMetadata
  content: string
}

const BlogPostPage = (props: IBlogPostProps) => {
  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <h1>{props.blogMeta.title}</h1>
        <section dangerouslySetInnerHTML={{ __html: props.content }}></section>
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

  const result = await unified().use(markdown).use(highlight).use(html).process(content)

  return {
    props: {
      blogMeta,
      content: result.toString()
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
