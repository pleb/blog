---
title: Minimal Next.js Blog (Part 4 - Show posts in category)
slug: minimal-nextjs-blog-part4-show-posts-in-category
date: May 4, 2022
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multipart series. If you haven't read the previous post, I'd suggest you start at [part 1](/posts/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue on from each other and likely won't make sense as individual units.*

---

Part 4, Welcome. In this part, I render a list of all posts within a category. The logic is essentially a mix of what I used in the `pages/index.tsx` and `blog\[slug].tsx` pages.

To start with, I do a minor refactoring of the functionality I want to share between these pages; then, I lay down the required code to render a list of blog posts within the selected category.

## Refactor time

I move the logic to create a collection of blog metadata out of the `pages/index.tsx` page and into the shared file `/shared/posts.ts`, so I change

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

to this

```ts
export const getStaticProps: GetStaticProps = async (): Promise<{ props: IIndexProps }> => {
  const blogs = await getBlogMetadata()
  return {
    props: { blogs }
  }
}
```

The newly created function `getBlogMetadata` is placed in the `/shared/build-time/posts.ts` file.

```ts
export const getBlogMetadata = async (filterCategory?: string): Promise<IBlogMetadata[]> => {
  const postFileNames = await getPostsMarkdownFileNames()
  const blogMetadata = postFileNames.map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return !filterCategory
    ? blogMetadata
    : blogMetadata.filter((blogMetadata) => blogMetadata.categories.some((c) => c.toLowerCase() == filterCategory.toLowerCase()))
}
``` 

Did you notice I added an optional param to filter the returned collection by a category? Yes 🎉

I also need a share the logic to get a collection of distinct categories and sorted posts. Which changes my `IndexPage` component from

```ts
const IndexPage = (props: IIndexProps) => {
  const distinctCategories = props.blogs
    .map((blogMetadata) => blogMetadata.categories)
    .reduce((acc, val) => [...acc, ...val])
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((catA: string, catB: string) => catA.localeCompare(catB))

  const sortedPosts = props.blogs.sort((blogA, blogB) => new Date(blogB.date).getTime() - new Date(blogA.date).getTime())

  // TSX Code
}
```

to

```ts
const IndexPage = (props: IIndexProps) => {
  const distinctCategories = getDistinctCategories(props.blogs)
  const sortedPosts = sortBlogMetaDescending(props.blogs)
 
  // TSX Code
```

with `getDistinctCategories` and `sortBlogMetaDescending` simply becoming this in the `./shared/posts.ts` file

```ts
export const getDistinctCategories = (blogMetadata: IBlogMetadata[]): string[] =>
  blogMetadata
    .map((blogMetadata) => blogMetadata.categories)
    .reduce((acc, val) => [...acc, ...val])
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((catA: string, catB: string) => catA.localeCompare(catB))

export const sortBlogMetaDescending = (meta: IBlogMetadata[]): IBlogMetadata[] =>
  meta.sort((blogA, blogB) => new Date(blogB.date).getTime() - new Date(blogA.date).getTime())
```

## Sanitised categories

Wouldn't having perfect hindsight would be great?

The problem. I'm using categories as the route slug, and obviously, not all characters play nicely in the URL. I figure if I replace any characters that are not alphanumeric or a hyphen with a hyphen, then it's a pretty easy way to solve this problem. That's my thoughts about it for the moment, and I guess time will tell. Though, that leaves me with another problem. Because I adjust the category text, I either use the modified category as the category text, yuk, or change categories from a simple string collection `string[]` to a complex type. I opt for the complex type as it seems like a good solution, and I end up using the structure `{ name: string, slug: string}`.

First, I create my sanitiseCategory function, placing it in the `/shared/posts.ts` file.

```ts
const sanitiseCategory = (category: string): string => category.replace(/([^a-z0-9\-])+/gi, '-').toLowerCase()
```

Then I update the existing `extractBlogMeta` function to build the complex type.

```ts
export const extractBlogMeta = (data: { [key: string]: any }): IBlogMetadata => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: (data['categories'] ?? []).map((c: string) => ({ name: c, slug: sanitiseCategory(c) })),
  date: data['date']
})
```

Of course, my `IBlogMetadata` type defined in the `/pages/index.tsx` file needs a small refactor too, so I change it from

```ts
export interface IBlogMetadata {
  title: string
  snippet: string
  slug: string
  categories: string[]
  date: string
}
```

to

```ts
export interface IBlogCategory { name: string; slug: string }

export interface IBlogMetadata {
  title: string
  snippet: string
  slug: string
  categories: IBlogCategory[]
  date: string
}
```

Now I alter where I render categories to the screen in the `/pages/index.tsx`, which changes it from

```tsx
<h2>Categories</h2>
  {distinctCategories.map((category) => (
  <ul key={category}>
    <Link href={`/blog-category/${category}`}>
      <a>{category}</a>
    </Link>
   </ul>
))}
```

to

```tsx
<h2>Categories</h2>
  {distinctCategories.map((category) => (
  <ul key={category.slug}>
    <Link href={`/blog-category/${category.slug}`}>
      <a>{category.name}</a>
    </Link>
   </ul>
))}
```

My newly created function `getBlogMetadata` in the `/shared/build-time/posts.ts` needs a slight change, meaning it goes from

```ts
export const getBlogMetadata = async (filterCategory?: string): Promise<IBlogMetadata[]> => {
  const postFileNames = await getPostsMarkdownFileNames()
  const blogMetadata = postFileNames.map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return !filterCategory
  return !filterCategorySlug
    ? blogMetadata
    : blogMetadata.filter((blogMetadata) => blogMetadata.categories.some((c) => c.toLowerCase() == filterCategory.toLowerCase()))
}
```

to

```ts
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

Nearly there. One last adjustment I do in the'getDistinctCategories' function changes it from

```ts
export const getDistinctCategories = (blogMetadata: IBlogMetadata[]): string[] =>
  blogMetadata
    .map((blogMetadata) => blogMetadata.categories)
    .reduce((acc, val) => [...acc, ...val])
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((catA: string, catB: string) => catA.localeCompare(catB))
```

to

```ts
export const getDistinctCategories = (blogMetadata: IBlogMetadata[]): IBlogCategory[] =>
  blogMetadata
    .map((blogMetadata) => blogMetadata.categories)
    .reduce((acc, val) => [...acc, ...val])
    .filter((value, index, self) => self.findIndex(bc => bc.slug === value.slug) === index)
    .sort((catA: IBlogCategory, catB: IBlogCategory) => catA.slug.localeCompare(catB.slug))
```

I notice that the updated version of `getDistinctCategories` could perhaps be optimised. I don't worry about it for now. Being only used at build time, I decide it's not worth the time and effort. However, my view may change if the build time duration starts increasing.

Now I have both human and URL friendly categories and category slugs.

The categories look like they always have, but my category URLs are slug-friendly. For example, `http://localhost:3000/blog-category/aws-codedeploy`.

## Showing blogs posts within a category

Thankfully, refactoring and fixing the category URL is the hardest part of showing blog posts in a category. As I stated earlier, this page's functionality is a mix-up of the `/pages/index.tsx` and the `/pages/blog/[slug].tsx`.

I add my `BlogCategory` component. As you have likely already guessed, it's a new component with new props and minimal output to the screen.

```tsx
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
```

Next, I define the `getStaticPaths` function, which, as you might remember, is a way for me to tell Next.js all the static paths that exist for this slug. This component is a one-to-one mapping of the different categories.

```ts
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
```

With the refactoring I did beforehand, this is now pretty straightforward.

Static paths are only half of the puzzle, so I define the `getStaticProps` function next.

```ts
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
```

Done. The function takes a category and returns the props (a list of blogs for the selected category), which is used by the`BlogCategory` component to render the blogs within a category to the screen. Nice 👍

## Demo

When I fire up the dev server and point my browser to it, I can see all the blog posts within a category.

![demo of showing blog posts within a category](/minimal-nextjs-blog-part4-show-posts-in-category/demo.gif)

---

In [part 5](/posts/minimal-nextjs-blog-part5-miscellaneous-pages) I support for miscellaneous pages. Like this part, it's amazing (Self Certified).

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

**The full source for /pages/blog-category/[slug].tsx**

```tsx
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
```

**The full source for /shared/posts.ts**

```ts
import { IBlogCategory, IBlogMetadata } from '../pages'

export const extractBlogMeta = (data: { [key: string]: any }): IBlogMetadata => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: (data['categories'] ?? []).map((c: string) => ({ name: c, slug: sanitiseCategory(c) })),
  date: data['date']
})

export const getDistinctCategories = (blogMetadata: IBlogMetadata[]): IBlogCategory[] =>
  blogMetadata
    .map((blogMetadata) => blogMetadata.categories)
    .reduce((acc, val) => [...acc, ...val])
    .filter((value, index, self) => self.findIndex((bc) => bc.slug === value.slug) === index)
    .sort((catA: IBlogCategory, catB: IBlogCategory) => catA.slug.localeCompare(catB.slug))

export const sortBlogMetaDescending = (meta: IBlogMetadata[]): IBlogMetadata[] =>
  meta.sort((blogA, blogB) => new Date(blogB.date).getTime() - new Date(blogA.date).getTime())

export const sanitiseCategory = (category: string): string => category.replace(/([^a-z0-9\-])+/gi, '-').toLowerCase()
```

**The full source for /shared/build-time/posts.ts**

```ts
import { readdir, readFileSync } from 'fs-extra'
import matter from 'gray-matter'
import { IBlogMetadata } from '../../pages'
import { extractBlogMeta } from '../posts'

export const getPostsMarkdownFileNames = async (): Promise<string[]> =>
  (await readdir(`${process.cwd()}/posts`)).filter((fn: string) => fn.endsWith('.md'))

export const readPostFile = (fileName: string): Buffer => readFileSync(`${process.cwd()}/posts/${fileName}`)

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
