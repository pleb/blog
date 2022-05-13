---
title: Minimal Next.js Blog (Part 5 - Miscellaneous pages)
slug: minimal-nextjs-blog-part5-miscellaneous-pages
date: May 1, 2022
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multipart series. If you haven't read the previous post, I'd suggest you start at [part 1](/posts/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue on from each other and likely won't make sense as individual units.*

---

Part 5, Welcome. In this part, I add support for miscellaneous pages, such as about me, where I work, etc. If Markdown formatting is good enough for blogging, then I figure it's good enough for miscellaneous pages.

I decide that the markdown files for miscellaneous pages will live under the `miscellaneous` folder. The main reason is that the Next.js framework has taken the folder `pages`, so I can't use that one.

If you recall, blog posts use the route format of `/blog/{post-slug}`. This is a sub-level route, as the blog posts live under the top-level `/blog/` route. For miscellaneous pages, I decide to use the top-level route of `/{page-slug}`. Using a top-level route means cleaner URLs. Additionally, because this is a basic blog site, I assume I'll have only a few miscellaneous pages.

## Refactor time

Refactoring is good, as sharing logic and only having one place to update code is great for maintainability. It is, however, not great for blogging, as I'm finding out. I've come too far to throw caution to the wind, though, so on with a refactor.

First, I add a `utilities.ts` file under the `build-time` directory.

I then add sharable logic to convert Markdown to Html.

```ts
export const covertMarkdownToHtml = async (content: string): Promise<string> =>
  (await unified().use(markdown).use(highlight).use(html).process(content)).toString()
```

With that sharable function declared, I update the `[slug].tsx` file, which renders blog pages to the browser screen.

It changes from:

```ts
const html = await unified().use(markdown).use(highlight).use(html).process(content)
```

to:

```ts
const html = await covertMarkdownToHtml(content)
```

Next, I add sharable logic to get Markdowns files and their content.

```ts
export const getMarkdownFileNames = async (subPath: string): Promise<string[]> =>
  (await readdir(`${process.cwd()}/${subPath}`)).filter((fn: string) => fn.endsWith('.md'))

export const readFile = (subPath: string, fileName: string): Buffer => readFileSync(`${process.cwd()}/${subPath}/${fileName}`)
```

With this sharable logic defined, I update the `build-time/posts.ts` file to use it.

The code  for `getPostsMarkdownFileNames` changes from

```ts
export const getPostsMarkdownFileNames = async (): Promise<string[]> =>
  (await readdir(`${process.cwd()}/posts`)).filter((fn: string) => fn.endsWith('.md'))
```

to

```ts
export const getPostsMarkdownFileNames = async (): Promise<string[]> => getMarkdownFileNames('posts')
````

And, the code for `readPostFile` changes from

```ts
export const readPostFile = (fileName: string): Buffer => readFileSync(`${process.cwd()}/posts/${fileName}`)
```

to

```ts
export const readPostFile = (fileName: string): Buffer => readFile('posts', fileName)
```

## My first miscellaneous page

I add a simple first page as I need one for testing. I create an `about.md` file in the `miscellaneous` directory. Then I add a small amount of markdown.

```md
# About me

I am me. Who am I? Me. That is all.
```  

See, I told you it was small 😂

## Showing a miscellaneous page

I start by adding a `[slug].tsx` file to the `pages` directory. This file handles all the top-level routes, which for the moment, are miscellaneous pages.

I define this props type for the soon-to-be added `MiscellaneousPage` component.

```ts
interface IMiscellaneousPage {
  html: string
}
```
As you can see, the prop is very simple and only takes a string of HTML.

Like the other pages I've added so far, this page will have minimal content. Therefore, my component is relatively simple - as planned.

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

I need to define the `getStaticPaths` and `getStaticProps` functions so that Next.js can display the pages. I won't detail what these functions do, as this is covered in previous posts in this series. Additionally, I won't describe how I've implemented them, as it was covered previously, and I'd likely bore you if I did.

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

And lastly, I add a link to my miscellaneous page in the `index.tsx` component. You'll notice the link to the about page is static. I decided that because there will only every be a handful of miscellaneous pages, the effort to making this links dynamic is not worth it.

```tsx
<section>
  <h2>Pages</h2>
  <Link href="/about">
    <a>About</a>
  </Link>
</section>
```

## Demo

When I start the dev server and load the index page, I see a link to my miscellaneous page. Nice 👍

![Screenshot of page links](/minimal-nextjs-blog-part5-miscellaneous-pages/pages-link.png)

And when I click the link, I'm shown the about page. Again - Nice 👍

![Screenshot of about page](/minimal-nextjs-blog-part5-miscellaneous-pages/about-page.png)

---

In [part 6](/posts/minimal-nextjs-blog-part6-azure-hosting) I deploy and host my blog in Azure. Like this part, it's amazing (Self Certified).

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


