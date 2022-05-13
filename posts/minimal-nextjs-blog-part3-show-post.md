---
title: Minimal Next.js Blog (Part 3 - Show Post)
slug: minimal-nextjs-blog-part3-show-post
date: May 1, 2022
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multipart series. If you haven't read the previous post, I'd suggest you start at [part 1](/posts/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue on from each other and likely won't make sense as individual units.*

---

Part 3, Welcome. In this part, I render a single blog post to the screen. I add the infrastructure to support handling each blog post page route and the conversion from markdown to HTML.

## Third-party Libraries

Although parsing and converting markdown to HTML sounds like a fun exercise, I must resist the temptation to write this myself 😀. I use the package [unified](https://github.com/unifiedjs/unified). Unified is an interface for processing text using syntax trees, and I use the following unified plugins:

- [remark-parse](https://github.com/remarkjs/remark/tree/main/packages/remark-parse) -  Parses Markdown to mdast syntax trees
- [remark-highlight.js](https://github.com/remarkjs/remark-highlight.js#readme) - Highlight code blocks with highlight.js (via lowlight)
- [remark-html](https://github.com/remarkjs/remark-html) - Serialize Markdown as HTML

I add these using the following NPM command:

```powershell
npm install unified remark-parse remark-highlight.js remark-html --save-dev
```

However, there is one catch. Because I'm not allowing implicit any `"noImplicitAny": true` in my TS code and because the package `remark-highlight.js` doesn't come with types, and I can't find types on [https://definitelytyped.org/](https://definitelytyped.org/), I had to make them myself.

## Definition for remark-highlight.js

There are a few easy ways to go about adding definitions in TS. I won't cover these, but the one I usually opt for is the mini @types folder, very similar to the familiar `/nodes_modules/@types`.

I add the folder `types` and the package folder `remark-highlight.js`, and the types file `index.d.ts`.

![types folder](/minimal-nextjs-blog-part3-show-post/types-folder.png)

Then, I add the following in the types file, which is just enough to stop the error and give me the small sub-set of API types I need.

```ts
declare module 'remark-highlight.js' {
  import { Plugin } from 'unified'
  interface highlightJs extends Plugin {}
  const highlight: highlightJs
  export = highlight
}
```

## Blog page routing/display

I can add the file to handle routes to a blog post with the libraries now installed. To do this, I use [dynamic route segments](https://nextjs.org/docs/routing/introduction#dynamic-route-segments). Essentially, this feature allows me to inform Next.js about all the pages that will reside under the /blogs/* segment. Note: As this is a static website, I'm not capturing the route. I'm dynamically building out the known pages under this route at build time.

First, I add the specially named file `[slug].tsx` under the folder `blog` in the `pages` directory.

### Page component

A blog page will be a new React component, so I define that first. I start by describing my prop type.

```ts
interface IBlogPostProps {
  blogMeta: IBlogMetadata
  html: string
}
```

There's not much to it because of the reuse of the `IBlogMetadata` type defined in my `index.tsx` file. Nice 👍

I then define a component to render the blog to the browser screen. I don't do anything fancy yet, like the index page; my objective is to render something simple on the browser page.

```tsx
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
```

### Mini refactor

Before adding the Next.js function that builds the props for each `[slug].tsx` page, I do a mini refactor of the getStaticProps function in the `index.tsx` file. Why might you ask? This is so I may reuse the logic already defined there (DRY).

I change it from

```ts
export const getStaticProps: GetStaticProps = async (): Promise<{ props: IIndexProps }> => {
  const files = await readdir(`${process.cwd()}/posts`)
  const blogs = files
    .filter((fileName: string) => fn.endsWith('.md'))
    .map((fileName: string) => {
      const path = `${process.cwd()}/posts/${fileName}`
      const { data } = matter(readFileSync(path)
      return { title: data['title'], snippet: data['snippet'] ?? '', slug: data['slug'], categories: data['categories'] ?? [], date: data['date']  }
    })
  return {
    props: { blogs }
  }
}
```

to

```ts
export const getPostsMarkdownFileNames = async (): Promise<string[]> =>
  (await readdir(`${process.cwd()}/posts`)).filter((fn: string) => fn.endsWith('.md'))

export const readPostFile = (fileName: string): Buffer => readFileSync(`${process.cwd()}/posts/${fileName}`)

export const extractBlogMeta = (data: { [key: string]: any }): IBlogMetadata => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: data['categories'] ?? [],
  date: data['date']
})

export const getStaticProps: GetStaticProps = async (): Promise<{ props: IIndexProps }> => {
  const blogs = (await getPostsMarkdownFileNames()).map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return {
    props: { blogs }
  }
}
```

Webpack is now a little confused and is trying to reference Node's FS in the web output from the build. To fix this, I move these shared functions to their own files under the new paths `./shared/posts.ts` and `./shared/build-time/posts.ts`. Using a separate folder for my shared code allows me to split the code nicely, and the paths should be a reminder for me to think about where my shared code should live. Doing this also allows webpack to optimise away the code from the build and stop the errors. With that in mind, I now have the following:

**/pages/Index.tsx**

```ts
export const getStaticProps: GetStaticProps = async (): Promise<{ props: IIndexProps }> => {
  const blogs = (await getPostsMarkdownFileNames()).map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return {
    props: { blogs }
  }
}
```

**/shared/posts.ts**

```ts
import { IBlogMetadata } from '../pages'

export const extractBlogMeta = (data: { [key: string]: any }): IBlogMetadata => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: data['categories'] ?? [],
  date: data['date']
})
```

**/shared/build-time/posts.ts**

```ts
import { readdir, readFileSync } from 'fs-extra'

export const getPostsMarkdownFileNames = async (): Promise<string[]> =>
  (await readdir(`${process.cwd()}/posts`)).filter((fn: string) => fn.endsWith('.md'))

export const readPostFile = (fileName: string): Buffer => readFileSync(`${process.cwd()}/posts/${fileName}`)
```

### Page paths

Next.js needs to know all pages that exist for this slug to build a static website. To supply Next.js this information, I define the `getStaticPaths` helper function for my `/pages/blog/[slug].tsx` file. To satisfy the contract for getStaticPaths, I return a collection of all blog slugs. With my recent refactor, my code is succinctly:

```ts
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

### Page content

I've told Next.js about the pages under the `blog/*` slug route. However, I also need to supply Next.js with the `IBlogPostProps` props per page. The props are needed for Next.js to render each page matching the route. To do this, I define the `getStaticProps` function. This function inspects the supplied `context: GetStaticPropsContext` and builds the props data for the matching slug. The logic is as follows:

```ts
export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext): Promise<{ props: IBlogPostProps }> => {
  const slug = context.params!.slug
  const { data, content } = matter(readPostFile(`${slug}.md`))
  const blogMeta = extractBlogMeta(data)

  const result = await unified().use(markdown).use(highlight).use(html).process(content)

  return {
    props: {
      blogMeta,
      html: result.toString()
    }
  }
}
```

## Demo

If I were to display the sample blog post from [part 2](/posts/minimal-nextjs-blog-part2-post-links) on the screen, it would look like:

![screenshot of sample blog post](/minimal-nextjs-blog-part3-show-post/sample-blog-post-screenshot.png)

As you can see, it's not very fancy 🤣, but it's working.

Additionally, here's a little demo of the whole thing in action. Pretty neat, huh? 🎉

![demo of showing blog posts](/minimal-nextjs-blog-part3-show-post/demo.gif)

---

In [part 4](/posts/minimal-nextjs-blog-part4-show-category-list) I render a list of posts within a category. Like this part, it's amazing (Self Certified).

## Source

**The full source for /pages/index.tsx**

```tsx
import React from 'react'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import matter from 'gray-matter'
import { getPostsMarkdownFileNames, readPostFile } from '../shared/build-time/posts'
import { extractBlogMeta } from '../shared/posts'

export interface IBlogMetadata {
  title: string
  snippet: string
  slug: string
  categories: string[]
  date: string
}

interface IIndexProps {
  blogs: IBlogMetadata[]
}

const IndexPage = (props: IIndexProps) => {
  const distinctCategories = props.blogs
    .map((blogMetadata) => blogMetadata.categories)
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
            <ul key={category}>
              <Link href={`/blog-category/${category}`}>
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
  const blogs = (await getPostsMarkdownFileNames()).map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return {
    props: { blogs }
  }
}
```

**The full source for /pages/blog/[slug].tsx**

```tsx
import { IBlogMetadata } from '../index'
import { getPostsMarkdownFileNames, readPostFile } from '../../shared/build-time/posts'
import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next'
import highlight from 'remark-highlight.js'
import { extractBlogMeta } from '../../shared/posts'
import markdown from 'remark-parse'
import matter from 'gray-matter'
import unified from 'unified'
import html from 'remark-html'

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

  const result = await unified().use(markdown).use(highlight).use(html).process(content)

  return {
    props: {
      blogMeta,
      html: result.toString()
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

**The full source for /shared/posts.ts**

```ts
import { IBlogMetadata } from '../pages'

export const extractBlogMeta = (data: { [key: string]: any }): IBlogMetadata => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: data['categories'] ?? [],
  date: data['date']
})
```

**The full source for /shared/build-time/posts.ts**

```ts
import { readdir, readFileSync } from 'fs-extra'

export const getPostsMarkdownFileNames = async (): Promise<string[]> =>
  (await readdir(`${process.cwd()}/posts`)).filter((fn: string) => fn.endsWith('.md'))

export const readPostFile = (fileName: string): Buffer => readFileSync(`${process.cwd()}/posts/${fileName}`)
```

**The full source for /types/remark-highlight.js/index.d.ts**

```ts
declare module 'remark-highlight.js' {
  import { Plugin } from 'unified'
  interface highlightJs extends Plugin {}
  const highlight: highlightJs
  export = highlight
}
```
