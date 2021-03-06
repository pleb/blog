---
title: Minimal Next.js Blog (Part 2 - Post Link)
slug: minimal-nextjs-blog-part2-post-links
date: August 7, 2020
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multi-part series. If you haven't read the previous posts, I'd suggest you start at [part 1](/posts/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue on from each other and are not individual units.*

---

Part 2, Welcome. In this part I will be rendering a list of links to posts to the browser screen. Although initially, you might be thinking - hey that's not very hard - bear in mind that I'm building a static site with no real backend, all this is decided at build (webpack) time. Such is the power of [Next.js](https://nextjs.org).

## Static Props (Pre-work)

What exactly are static props? The official docs can be read [here](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation), but to summarise it, I can use static props to gather data at build (webpack) time, which in the case of this blog will be reading and processing of files from the file system. However, if I wasn't building a filesystem based blog, this could be querying a database or API etc.

To do this, I'll add a getStaticProps function to the `index.tsx` file. Although before I do that, I'll define a few types, and I'll update my IndexPage component to render both a list of post links and post categories.

A blog page needs some metadata to describe the content, it's a given right? Well, for this I'll define a type `IBlogMetadata` and it'll look like this:

```ts
export interface IBlogMetadata {
  title: string
  snippet: string
  slug: string
  categories: string[]
  date: string
}
```

If you're wondering why I'm using a `string` for my date, well it's because the data returned by `getStaticProps` must be JSON serialisable, and because JSON has never had a right answer for the `Date` type - it's not allowed.

Although categories are somewhat optional, I won't denote it as such, aka `?`, and I'll represent such a situation as an empty array. This saves checking whether categories exist and generally makes code easier to read.

Ah, I need some props for my `IndexPage` component, and as most would have guessed by now, it's going to contain a collection of blog posts in the form of `IBlogMetadata[]`. This will do it:

```ts
interface IIndexProps {
  blogs: IBlogMetadata[]
}
```

Now I'll update my `IndexPage` component to render posts and categories, but as this won't be the final version, as my aim is simply to dump stuff to the screen: 

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

As you can see, I take the input and create two collections, one being a distinct list of categories, and the other is all the posts order by their date descending. Then I simply render it to the screen. I'm not going to lie, it's not going to be pretty 😀, but it will be functional. I'll do all the UI work in one step, later on, once I have everything working.

## Static Props

I'll add my static get static props function, but before I do I'll add the [gray-matter](https://www.npmjs.com/package/gray-matter) and [fs-extra](https://www.npmjs.com/package/fs-extra) packages. Although one can use promises in version >= 12 of node, it's still a PITA, so I'll continue to use fs-extra till I don't have to use import workarounds. Gray matter is how I'll store my blog metadata along with the blog content. You can read more about this great package on their [GitHub page](https://github.com/jonschlinkert/gray-matter).

```powershell
npm install gray-matter fs-extra @types/fs-extra --save-dev
```

Essentially, my getStaticProps function will find and read the metadata from my blog post markdown files. Sounds pretty easy, right? Well, actually, it is. See:

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

I'll quickly add a smaple blog post, as I imagine testing without one will be somewhat hard. So I'll a few of these with different dates for testing purposes.

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

With all this combined, if run the dev server and refresh my browser page, it now looks like this.

![web screenshot](/minimal-nextjs-blog-part2-post-links/web-screenshot.png)

## How does this work

When processing the files found under the `/posts` directory, I use Gray Matter to parse the files into Metadata and Content.

```ts
const { data, content } = matter(readFileSync(path))
```

To supply the metadata I define it in the top of each blog post file. For example, here's the metadata from my sample blog post.

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

In [part 3](/posts/minimal-nextjs-blog-part3-show-post) I'll be rendering a single blog post to the screen. Like this part, it's going to be amazing (Again, Self Certified).

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
