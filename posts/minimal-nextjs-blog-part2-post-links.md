---
title: Minimal Next.js Blog (Part 2 - Post Link)
slug: minimal-nextjs-blog-part2-post-links
date: "07-08-2020"
tags: ["next.js", "blogging", "react"]
---

In part 1 I covered setting the next.js to the bare minimum of rendering "hello world" to the screen. I then added a few other items, such as prettier, but nothing too fancy. If you haven't read through [part 1 yet](/posts/minimal-nextjs-blog-part1-hello-world), this is the place to start.

Part 2 is about rendering a list of links to posts to the web browser screen. Although initially, you might be thinking - hey that's not very hard - bare in mind that I'm building a static site with no real backend, all this is decided at build (webpack) time. Such is a power of [next.js](https://nextjs.org).

## Static Props

What exactly are static props? The official docs can be read [here](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) but to summerise, I can use static props to gather data at build time, which in the case of this blog will be reading and processing of files from the file system.

To do this, I'll add my function to the `index.tsx` file. But before I do that, I'll define some types and I'll update my IndexPage component to render both a list of post links and post categories.

A blog page needs some metadata to describe the content, it's a given right? Well, for this I'll define a type `IBlogMeta` and it'll look like this:

```TS
export interface IBlogMeta {
  title: string
  snippet: string
  slug: string
  categories: string[]
  date: string
}
```

Although categories are somewhat optional, I won't denote it as such, aka `?`, and I'll represent such a situation as an empty array. This saves checking whether categories exist and generally makes code easier to read.

Ah, I need some props for my `IndexPage` component and as most would have guess by now, it's going to contain a collection of blog posts in the form of `IBlogMeta[]`. This will do it:

```TS
interface IIndexProps {
  blogs: IBlogMeta[]
}
```

Now I'll update my `IndexPage` component to render posts and categories, but as this won't be the final version, my aim is simply to dump stuff to the screen:

```jsx
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
```

Next, I'll add my static get static props function, but before I do I'll add the [gray-matter](https://www.npmjs.com/package/gray-matter) and [fs-extra](https://www.npmjs.com/package/fs-extra) packages. Although one can use promises now since version 12 of node, it's still a PITA, so I'll continue to use fs-extra till I don't have to use import workarounds. Gray matter is how I'll store my blog metadata along with the blog content. You can read more about this great package on their [GitHub page](https://github.com/jonschlinkert/gray-matter)

```powershell
npm install gray-matter fs-extra @types/fs-extra --save-dev
```

Essentially, my getStaticProps function will find and read the metadata from my blog post markdown files. Sounds pretty easy, right? Well, actually, it is. See:

```ts
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
```

If you're wondering why I'm using a `string` for my date, well it's because the data returned by `getStaticProps` must be JSON serialisable, and because JSON has never had a good answer for the `Date` type - it's not allowed.


## How does this work

When the above is combined with blog post markdown files placed in the `/posts` directory, it looks like this on the screen thanks to the `getStaticProps` function. 

![web screenshot](/minimal-nextjs-blog-part2-post-links/web-screenshot.png)

And here's how a sample blog post would look:

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
```


