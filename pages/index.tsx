import React from 'react'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import { readFileSync, readdir } from 'fs-extra'
import matter from 'gray-matter'

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
    .reduce((acc, val) => ([...acc, ...val]))
    .filter((value, index, self) => self.indexOf(value) === index)

  distinctCategories.sort((catA: string, catB: string) => catA.localeCompare(catB))

  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <h1>Home page</h1>
        <section>
          <h2>Posts</h2>
          {props.blogs.map((blog) => (
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
  const files = await readdir(`${process.cwd()}/posts`)
  const blogs = files
    .filter((fn: string) => fn.endsWith('.md'))
    .map((fn: string) => {
      const path = `${process.cwd()}/posts/${fn}`
      const { data, content } = matter(readFileSync(path))
      const snippet = data['snippet'] ?? content.substr(0, 200)
      return { title: data['title'], snippet, slug: data['slug'], categories: data['categories'] ?? [], date: data['date']  }
    })
    .sort((blogA, blogB) => new Date(blogB.date).getTime() - new Date(blogA.date).getTime())
  return {
    props: { blogs }
  }
}
