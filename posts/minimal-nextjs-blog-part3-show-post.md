---
title: Minimal Next.js Blog (Part 3 - Show Post)
slug: minimal-nextjs-blog-part3-show-post
date: August 10, 2020
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multi-part series. If you haven't read the previous posts, I'd suggest you start at [part 1](/posts/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue on from each other and are not individual units.*

---

Part 3, Welcome. In this part, we will be rendering a single blog post to the screen. To do this I'll need to add infrastructure to support handling each blog post page route, and the conversion of markdown to HTML.

## Third-party Libraries

Although parsing and converting markdown to HTML sounds like a fun exercise, I will resist my temptation to go off on a tangent and instead focus on the task at hand, aka this blog series about creating a blog. Blogception if you will 😀. Anyway, to help keep me on the correct path I will be using the package [unified](https://github.com/unifiedjs/unified), an interface for processing text using syntax trees, and the following unified plugins:

 - [remark-parse](https://github.com/remarkjs/remark/tree/main/packages/remark-parse) -  Parses Markdown to mdast syntax trees
 - [remark-highlight.js](https://github.com/remarkjs/remark-highlight.js#readme) - Highlight code blocks with highlight.js (via lowlight)
 - [remark-html](https://github.com/remarkjs/remark-html) - Serialize Markdown as HTML
    
Adding these libraries is pretty easy, as you can imagine:

```powershell
npm install unified remark-parse remark-highlight.js remark-html --save-dev
```

However, there is one catch. Because I'm not allowing implicit any `"noImplicitAny": true` in my TS code and because the package `remark-highlight.js` doesn't come with types and no types can be found on [https://definitelytyped.org/](https://definitelytyped.org/) I'm going to need to add a definition myself.

## Definition for remark-highlight.js 

There are a few easy ways to go about adding definitions in TS. I won't cover these, but the one I usually settle on is my own mini @types folder, very much like the `/nodes_modules/@types` one.

I'll add the folder `types` and the package folder `remark-highlight.js` and the types file `index.d.ts`, or altogether `/types/remark-highlight.js/index.d.ts`

![types folder](/minimal-nextjs-blog-part3-show-post/types-folder.png)

Then in the types file, I'll add the following, which is just enough to stop the error. If I decided to use more of the package, later on, I'll continue to build out its types.

```ts
declare module 'remark-highlight.js' {
  import { Plugin } from 'unified'
  interface highlightJs extends Plugin {}
  const highlight: highlightJs
  export = highlight
}
```

## Blog page routing/display

Now I've installed the libraries I'll need to display a blog page. I'll add the page to handle routes to a blog post. To do this, I'll be making use of [dynamic route segments](https://nextjs.org/docs/routing/introduction#dynamic-route-segments). Essentially, this feature allows me to build all pages that will reside under the /blogs/* segment at build (webpack) time. Note: As this is a static website, I'm not capturing the route, but rather, I'm building out the known pages under this route dynamically.

First, I'll add the specially named file `[slug].tsx` under the folder `blog` in the `pages` directory. The path looks like this: `./pages/blog/[slug].tsx`

### Page component

A blog page, of course, will be a new React component, so I'll define that first. I'll start with my props type which looks like this:

```jsx
interface IBlogPostProps {
  blogMeta: IBlogMetadata
  content: string
}
```

There's not much too it, and I've even reused the `IBlogMetadata` type defined in my `index.tsx` file. Nice 👍

Then I'll define a component to render the blog to the browser screen. I won't do anything fancy yet, as like in the index page, my aim is to simply render the content to the screen as I'm planning a UI styling step once the blog is feature complete. Accordingly, my component looks like this:

```jsx
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
```

Which, if I were to display the sample blog post from [part 2](/posts/minimal-nextjs-blog-part2-post-links) on the screen, it would look like this:

![screenshot of sample blog post](/minimal-nextjs-blog-part3-show-post/sample-blog-post-screenshot.png)

As you can see, it's very much not fancy 🤣.

### Mini refactor

Before I start adding the Next.js functions which power the `[slug].tsx` page, I'll do a mini refactor of the getStaticProps function in the `index.tsx` file so that I can reuse some of its logic (DRY).

I'll change it from

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

Now, because webpack is now a little confused and is trying to reference node's FS for the web side of the build, I'll move these shared functions to their own files under the new paths `./shared/posts.ts` and `./shared/build-time/posts.ts`. Using a separate folder for my TS files which hold shared code that is used at build time allows me to split the code nicely, and the pathing should (hopefully) act as a reminder for me to think about where my shared code should live. This also allows webpack to optimise away the code and should a) stop the errors I'm getting about webpack trying to pack node packages into my web build, and b) make for a more efficient build product. So with that in mind, I now have the following: 

**/pages/Index.tsx**

```ts
import React from 'react'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import matter from 'gray-matter'
import { extractBlogMeta } from "../shared/posts";
import { getPostsMarkdownFileNames, readPostFile } from "../shared/build-time/posts";

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
          {sortedPosts.map((blogMeta) => (
            <article key={blogMeta.slug}>
              <Link href={`/blog/${blogMeta.slug}`}>
                <a>{blogMeta.title}</a>
              </Link>
              <details>{blogMeta.snippet}</details>
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
  const postFileNames = await getPostsMarkdownFileNames()
  const blogs = postFileNames.map((fileName: string) => {
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

Next.js needs a way to know how many pages exist for this slug, as in order to build a static website, all pages will need to be known about at build (webpack) time. To do this, I'll define the `getStaticPaths` helper function. It looks like so:

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

This returns information which denotes all the paths under the `blog/*` slug that will need to be handled statically.

### Page content

Now I've told Next.js how many pages exist under the `blog/*` slug route, I need to tell it what each page's props look like, as Next.js will pass the props to the page component to render the page for the given route. Thankfully, this is, again, pretty easy to do. I'll define my getStaticProps function like so:

```ts
export const getStaticProps: GetStaticProps = async (context): Promise<{ props: IBlogPostProps }> => {
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
```

## Demo

Now when I click a post link, I can see the post. Pretty neat, huh? 🎉

![demo of showing blog posts](/minimal-nextjs-blog-part3-show-post/demo.gif)

---

In [part 4](/posts/minimal-nextjs-blog-part4-show-category-list) I'll be rendering a list of posts within a category, and like this part, it's going to be amazing (Again, Self Certified)

## Source

**The full source for /pages/index.tsx**

```jsx
import React from 'react'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import matter from 'gray-matter'
import { extractBlogMeta } from "../shared/posts";
import { getPostsMarkdownFileNames, readPostFile } from "../shared/build-time/posts";

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
  const postFileNames = await getPostsMarkdownFileNames()
  const blogs = postFileNames.map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return {
    props: { blogs }
  }
}
```

**The full source for /pages/blog/[slug].tsx**

```jsx
import React from 'react'
import { IBlogMetadata } from '../index'
import html from 'remark-html'
import highlight from 'remark-highlight.js'
import unified from 'unified'
import markdown from 'remark-parse'
import matter from 'gray-matter'
import { GetStaticProps, GetStaticPaths } from 'next'
import { extractBlogMeta } from "../../shared/posts";
import { getPostsMarkdownFileNames, readPostFile } from "../../shared/build-time/posts";

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

export const getStaticProps: GetStaticProps = async (context): Promise<{ props: IBlogPostProps }> => {
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
```

**The full source for /shared/posts.ts**

```ts
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
