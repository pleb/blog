---
title: Minimal Next.js Blog (Part 5 - Miscellaneous pages)
slug: minimal-nextjs-blog-part5-miscellaneous-pages
date: August 17, 2020
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multi-part series. If you haven't read the previous posts, I'd suggest you start at [part 1](/posts/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue on from each other and are not individual units.*

---

Part 5, Welcome. In this part, I'll be adding support for miscellaneous pages, such as about me etc. I figure if Markdown is good enough for blogging, then it's good enough to be used for a miscellaneous page. 

Before I start, I've decided that the markdown files for miscellaneous pages will live under the folder `miscellaneous`. The primary reason of this is that the Next.js framework has taken the folder `pages`, so I can't use that one. If you recall, blog posts use the route `/blog/{post-slug}`. For miscellaneous pages, I've decided to use the top-level route, so for example `/{page-slug}`. I like this, as I always strive for clean looking URLs, and because this is only going to be a basic blog, I don't envisage any regret later on by taking the top-level route for this purpose. Well, fingers crossed anyway.   

## Refactor time

Refactoring is good, as sharing logic and only having one place to update code is great for maintainability. It is however, not great for blogging, as I am finding out. That said..... I just can't not do it! Sigh.

To begin I'll add a `utilities.ts` file the `build-time` directory. The full path is `/shared/build-time/utilities.ts`.

I'll add a shared method to convert Markdown to Html. 

```ts
export const covertMarkdownToHtml = async (content: string): Promise<string> =>
  (await unified().use(markdown).use(highlight).use(html).process(content)).toString()
```

Then I'll update the `[slug].tsx` file that renders blog pages to the browser screen. The full path is `/pages/blog/[slug].tsx`. 

Changing

```ts
const html = await unified().use(markdown).use(highlight).use(html).process(content)
```

to

```ts
const html = await covertMarkdownToHtml(content)
```

Next, I'll add a function to convert get markdown files and read a markdown file.

```ts
export const getMarkdownFileNames = async (subPath: string): Promise<string[]> =>
  (await readdir(`${process.cwd()}/${subPath}`)).filter((fn: string) => fn.endsWith('.md'))

export const readFile = (subPath: string, fileName: string): Buffer => readFileSync(`${process.cwd()}/${subPath}/${fileName}`)
```

Then I'll update the functions in the `posts.ts` file to make use of these. The full path is `/shared/build-time/posts.ts`.

`getPostsMarkdownFileNames` changes from

```ts
export const getPostsMarkdownFileNames = async (): Promise<string[]> =>
  (await readdir(`${process.cwd()}/posts`)).filter((fn: string) => fn.endsWith('.md'))
```

to

```ts
export const getPostsMarkdownFileNames = async (): Promise<string[]> => getMarkdownFileNames('posts')
````

And, `readPostFile` changes from

```ts
export const readPostFile = (fileName: string): Buffer => readFileSync(`${process.cwd()}/posts/${fileName}`)
```

to

```ts
export const readPostFile = (fileName: string): Buffer => readFile('posts', fileName)
```

## My first miscellaneous page

I'll add a simple first page, as I'm going to need one for testing. I'll create a `about.md` file in the `miscellaneous` directory. The full path is `/miscellaneous/about.md`. Then I'll add a small amount of markdown.

```md
# About me

I am me. Who am I? Me. That is all.
```  

See, I told you it was small 😂

## Showing a miscellaneous page

I'll start my adding my `[slug].tsx` file. The full path is `/pages/[slug].tsx`. Then I'll define my props type for a new `MiscellaneousPage` component.

```ts
interface IMiscellaneousPage {
  html: string
}
```

Like all the other pages I've added so far, this page will have minimal content. Therefore, my component is rather simple - as planned.

```tsx
const MiscellaneousPage = (props: IMiscellaneousPage) => {
  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <section dangerouslySetInnerHTML={{ __html: props.html }}></section>
      </main>
      <footer>
        <p>Author: Wade Baglin</p>
      </footer>
    </>
  )
}
```

I'll need to define the `getStaticPaths` and `getStaticProps` functions so that the Next.js can display the pages. I won't go into the detail of what these functions do, as I have covered this in previous posts in this series. Additionally, I won't go into detail of how I've implemented them, as again, it was covered previously, and I'd likely bore you if I did.

```ts
export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext): Promise<{ props: IMiscellaneousPage }> => {
  const slug = context.params!.slug
  const { content } = matter(readFile('miscellaneous', `${slug}.md`))
  const html = await covertMarkdownToHtml(content)

  return {
    props: {
      html
    }
  }
}

export const getStaticPaths: GetStaticPaths = async (): Promise<{
  paths: Array<string | { params: { slug: string } }>
  fallback: boolean
}> => {
  const markdownFileNames = await getMarkdownFileNames('miscellaneous')
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
```

And lastly, I'll add a link to my miscellaneous page in the `index.tsx` component. The full path is `/pages/index.tsx`

```tsx
<section>
  <h2>Pages</h2>
  <Link href="/about">
    <a>About</a>
  </Link>
</section>
```

## Demo
 
When I start the dev server and load the index page, I now see a link to my miscellaneous page. Nice 👍

![Screenshot of page links](/minimal-nextjs-blog-part5-miscellaneous-pages/pages-link.png)

And when I click the link I'm shown my about page. Again - Nice 👍

![Screenshot of about page](/minimal-nextjs-blog-part5-miscellaneous-pages/about-page.png)

---

In [part 6](/posts/minimal-nextjs-blog-part6-azure-hosting) I'll be deploying and hosting my blog in Azure. Like this part, it's going to be amazing (Again, Self Certified).

## Source

**The full source for /pages/index.tsx**

```tsx
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

export interface IBlogCategory {
  name: string
  slug: string
}

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
          <h2>Pages</h2>
          <Link href="/about">
            <a>About</a>
          </Link>
        </section>
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
```

**The full source for /pages/blog/[slug].tsx**

```tsx
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

```

**The full source for /pages/[slug].tsx**

```tsx
import React from 'react'
import matter from 'gray-matter'
import { GetStaticProps, GetStaticPaths, GetStaticPropsContext } from 'next'
import { covertMarkdownToHtml, getMarkdownFileNames, readFile } from '../shared/build-time/utilities'

interface IMiscellaneousPage {
  html: string
}

const MiscellaneousPage = (props: IMiscellaneousPage) => {
  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <section dangerouslySetInnerHTML={{ __html: props.html }}></section>
      </main>
      <footer>
        <p>Author: Wade Baglin</p>
      </footer>
    </>
  )
}

export default MiscellaneousPage

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext): Promise<{ props: IMiscellaneousPage }> => {
  const slug = context.params!.slug
  const { content } = matter(readFile('miscellaneous', `${slug}.md`))
  const html = await covertMarkdownToHtml(content)

  return {
    props: {
      html
    }
  }
}

export const getStaticPaths: GetStaticPaths = async (): Promise<{
  paths: Array<string | { params: { slug: string } }>
  fallback: boolean
}> => {
  const markdownFileNames = await getMarkdownFileNames('miscellaneous')
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
```

**The full source for /shared/build-time/posts.ts**

```ts
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
```

**The full source for /shared/build-time/utilities.ts**

```ts
import unified from 'unified'
import markdown from 'remark-parse'
import highlight from 'remark-highlight.js'
import html from 'remark-html'
import { readdir, readFileSync } from 'fs-extra'

export const covertMarkdownToHtml = async (content: string): Promise<string> =>
  (await unified().use(markdown).use(highlight).use(html).process(content)).toString()

export const getMarkdownFileNames = async (subPath: string): Promise<string[]> =>
  (await readdir(`${process.cwd()}/${subPath}`)).filter((fn: string) => fn.endsWith('.md'))

export const readFile = (subPath: string, fileName: string): Buffer => readFileSync(`${process.cwd()}/${subPath}/${fileName}`)
```


