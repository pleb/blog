import React from 'react'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import { getDistinctCategories, sortBlogMetaDescending } from '../shared/posts'
import { getBlogMetadata } from '../shared/build-time/posts'

export interface IBlogMetadata {
  title: string
  snippet: string
  slug: string
  categories: IBlogCategory[]
  date: string
}

export interface IBlogCategory { name: string; slug: string }

interface IIndexProps {
  blogs: IBlogMetadata[]
}

const IndexPage = (props: IIndexProps) => {
  const distinctCategories = getDistinctCategories(props.blogs)
  const sortedPosts = sortBlogMetaDescending(props.blogs)

  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <h1>Home page</h1>
        <section>
          <h2>Posts</h2>
          {sortedPosts.map((blogMetadata) => (
            <article key={blogMetadata.slug}>
              <Link href={`/blog/${blogMetadata.slug}`}>
                <a>{blogMetadata.title}</a>
              </Link>
              <details>{blogMetadata.snippet}</details>
            </article>
          ))}
        </section>
        <section>
          <h2>Categories</h2>
          {distinctCategories.map((category) => (
            <ul key={category.slug}>
              <Link href={`/blog-category/${category.slug}`}>
                <a>{category.name}</a>
              </Link>
            </ul>
          ))}
        </section>
      </main>
      <footer>
        <p>Author: Wade Baglin</p>
      </footer>
    </>
  )
}

export default IndexPage

export const getStaticProps: GetStaticProps = async (): Promise<{ props: IIndexProps }> => {
  const blogs = await getBlogMetadata()
  return {
    props: { blogs }
  }
}
