import React from 'react'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import matter from 'gray-matter'
import { extractBlogMeta, getPostsMarkdownFileNames, readPostFile } from '../shared/posts'

export interface IBlogMeta {
  title: string
  snippet: string
  slug: string
  categories: string[]
  date: string
}

interface IIndexProps {
  blogs: IBlogMeta[]
}

const IndexPage = (props: IIndexProps) => {
  const distinctCategories = props.blogs
    .map((blog) => blog.categories)
    .reduce((acc, val) => [...acc, ...val])
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((catA: string, catB: string) => catA.localeCompare(catB))

  const sortedPosts = props.blogs.sort((blogA, blogB) => new Date(blogB.date).getTime() - new Date(blogA.date).getTime())

  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <h1>Home page</h1>
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
        <section>
          <h2>Categories</h2>
          {distinctCategories.map((category) => (
            <ul key={category}>
              <Link href={`/category/${category}`}>
                <a>{category}</a>
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
  const postFileNames = await getPostsMarkdownFileNames()
  const blogs = postFileNames.map((fileName: string) => {
    const { data, content } = matter(readPostFile(fileName))
    return extractBlogMeta(data, content)
  })
  return {
    props: { blogs }
  }
}
