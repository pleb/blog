---
title: Minimal Next.js Blog (Part 2 - Post Link)
slug: minimal-nextjs-blog-part2-post-links
date: May 2, 2022
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multipart series. If you haven't read the previous post, I'd suggest you start at [part 1](/blog/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue from each other and likely won't make sense as individual units.*

---

Part 2, Welcome. In this part, I render a list of links to posts on the browser screen. Although you might initially think, "Hey, that's not very hard", keep in mind that I'm building a static site with no actual backend. Due to the static nature, the links are produced at build (webpack) time. This is one of the reasons I've chosen [Next.js](https://nextjs.org) for my blog.

## Static Props (Pre-work)

What are static props? The official docs for static props can be read [here](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation). To explain how I use it, I use static props to gather data at build time by reading and processing the files from the file system.

To do this, I add a getStaticProps function to the `index.tsx` file. Although before I do that, I define a few types and update my IndexPage component to render both a list of post links and post categories.

A blog page needs some metadata to describe the content. That's a given, right? Well, for this, I define a type `IBlogMetadata`, and it looks like this:

```ts
export interface IBlogMetadata {
  title: string
  snippet: string
  slug: string
  categories: string[]
  date: string
}
```

If you're wondering why I use a `string` for my date, well, because the data returned by `getStaticProps` must be JSON serialisable, and because JSON has never had a suitable answer for the `Date` type - it's not allowed.

Although categories are kind of optional, I won't denote it as such, aka `?`. I represent such a situation as an empty array. Making collections empty verse undefined saves checking whether the collection is defined and makes code easier to read.

Ah, I need some props for my `IndexPage` component, and as most would have guessed by now, it contains a collection of blog post metadata and looks like this:

```ts
interface IIndexProps {
  blogs: IBlogMetadata[]
}
```

Now I update my `IndexPage` component to render posts and categories, but this won't be the final version, as my aim is simply to show "stuff" on the screen:

```tsx
const IndexPage = (props: IIndexProps) => {
  const distinctCategories = props.blogs
    .map((blogMetadata) => blogMetadata.categories)
    .reduce((acc, val) => ([...acc, ...val]))
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
```

As you can see, I take the input and create two collections, one for a distinct list of categories, and the other is for the posts ordered descending by their date. Then I simply render it to the screen. I'm not going to lie, it's not going to be pretty 😀, but it will be functional. I do all the UI work in one step, later on, once I have everything working.

## Static Props

Before I add the static get static props function, I add the [gray-matter](https://www.npmjs.com/package/gray-matter) and [fs-extra](https://www.npmjs.com/package/fs-extra) packages. Although I can use promises in version >= 12 of node, it's still a PITA, so I'll continue to use fs-extra till I don't have to use import workarounds. Gray matter is how I store my blog metadata along with the blog content. You can read more about this great package on their [GitHub page](https://github.com/jonschlinkert/gray-matter).

```powershell
npm install gray-matter fs-extra @types/fs-extra --save-dev
```

Essentially, my getStaticProps function finds and reads the metadata from my blog post markdown files. Sounds pretty easy, right? Well, actually, it is. See:

```ts
export const getStaticProps: GetStaticProps = async (): Promise<{ props: IIndexProps }> => {
  const files = await readdir(`${process.cwd()}/posts`)
  const blogs = files
    .filter((fileName: string) => fileName.endsWith('.md'))
    .map((fileName: string) => {
      const path = `${process.cwd()}/posts/${fileName}`
      const { data } = matter(readFileSync(path))
      return { title: data['title'], snippet: data['snippet'] ?? '', slug: data['slug'], categories: data['categories'] ?? [], date: data['date']  }
    })
  return {
    props: { blogs }
  }
}
```

In this function, I simply query the file system for all files under the `./posts` directory and then parse the metadata content to create the props object. There's nothing here that's all that complex, but as you can see getStaticProps is a powerful feature. 

I add a few sample blog posts for the purposes of testing.

```text
---
title: My blog post title
slug: my-blog-post-slug
date: August 7, 2020
snippet: This is a blog post snippet (optional)
categories:
  - cat 1
  - cat 2
---
# My Blog Post

Some markdown blog post

 - One
 - Two
 - Three

A [link](#)
```

With all this combined, when I run the dev server and refresh my browser page, it now looks like this.

![web screenshot](/minimal-nextjs-blog-part2-post-links/web-screenshot.png)

## How does this work

When processing the files found under the `/posts` directory, I use Gray Matter to parse the files into Metadata and Content.

```ts
const { data, content } = matter(readFileSync(path))
```

To specify the metadata, I define at the top of each blog post file. For example, here's the metadata from my sample blog post.

```text
---
title: My blog post title
slug: my-blog-post-slug
date: August 7, 2020
snippet: This is a blog post snippet (optional)
categories:
  - cat 1
  - cat 2
---
```

And the rest of the post is the content, in the format of markdown.

That's it, such a simple way of writing a blog post - no database required.

---

In [part 3](/blog/minimal-nextjs-blog-part3-show-post) I render a single blog post to the screen. Like this part, it's amazing (Self Certified).

## Source

**The full source for /pages/index.tsx**

```tsx
import React from 'react'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import { readdir, readFileSync } from 'fs-extra'
import matter from 'gray-matter'

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
  const files = await readdir(`${process.cwd()}/posts`)
  const blogs = files
    .filter((fileName: string) => fileName.endsWith('.md'))
    .map((fileName: string) => {
      const path = `${process.cwd()}/posts/${fileName}`
      const { data } = matter(readFileSync(path))
      return {
        title: data['title'],
        snippet: data['snippet'] ?? '',
        slug: data['slug'],
        categories: data['categories'] ?? [],
        date: data['date']
      }
    })
  return {
    props: { blogs }
  }
}
```
