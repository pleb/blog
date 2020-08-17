import React from 'react'
import Link from 'next/link'
import { IBlogMetadata } from '../index'
import { GetStaticProps, GetStaticPaths, GetStaticPropsContext } from 'next'
import { getDistinctCategories, sortBlogMetaDescending } from '../../shared/posts'
import { getBlogMetadata } from '../../shared/build-time/posts'

interface IBlogCategoryProps {
  category: string
  blogs: IBlogMetadata[]
}

const BlogCategory = (props: IBlogCategoryProps) => {
  const sortedPosts = sortBlogMetaDescending(props.blogs)

  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <h1>Category {props.category}</h1>
        <section>
          <h2>Posts</h2>
          {sortedPosts.map((blog) => (
            <article key={blog.slug}>
              <Link href={`/blog/${blog.slug}`}>
                <a>{blog.title}</a>
              </Link>
              <details>{blog.snippet}</details>
            </article>
          ))}
        </section>
      </main>
      <footer>
        <p>Author: Wade Baglin</p>
      </footer>
    </>
  )
}

export default BlogCategory

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext): Promise<{ props: IBlogCategoryProps }> => {
  const category = context.params!.slug as string
  const blogMetadata = await getBlogMetadata(category)

  return {
    props: {
      category,
      blogs: blogMetadata
    }
  }
}

export const getStaticPaths: GetStaticPaths = async (): Promise<{
  paths: Array<string | { params: { slug: string } }>
  fallback: boolean
}> => {
  const blogMetadata = await getBlogMetadata()
  const distinctCategories = getDistinctCategories(blogMetadata)

  return {
    paths: distinctCategories.map((category) => {
      return {
        params: {
          slug: category.slug
        }
      }
    }),
    fallback: false
  }
}
