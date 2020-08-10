---
title: Minimal Next.js Blog (Part 2 - Post Link)
slug: minimal-nextjs-blog-part2-post-links
date: "07-08-2020"
categories:
  - next.js
  - blogging
  - react
---

In part 1 I covered setting up Next.js to the bare minimum of rendering "hello world" to the screen. I then added a few other items, such as prettier, but nothing too fancy. If you haven't read through [part 1 yet](/posts/minimal-nextjs-blog-part1-hello-world), I would recommend it as the place to start.

Part 2 is about rendering a list of links to posts to the browser screen. Although initially, you might be thinking - hey that's not very hard - bare in mind that I'm building a static site with no real backend, all this is decided at build (webpack) time. Such is the power of [Next.js](https://nextjs.org).

## Static Props (Pre-work)

What exactly are static props? The official docs can be read [here](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) but to summerise it, I can use static props to gather data at build/pack time, which in the case of this blog will be reading and processing of files from the file system. However, if you weren't building a blog, this could be querying a database or API etc.

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

If you're wondering why I'm using a `string` for my date, well it's because the data returned by `getStaticProps` must be JSON serialisable, and because JSON has never had a right answer for the `Date` type - it's not allowed.

Although categories are somewhat optional, I won't denote it as such, aka `?`, and I'll represent such a situation as an empty array. This saves checking whether categories exist and generally makes code easier to read.

Ah, I need some props for my `IndexPage` component, and as most would have guessed by now, it's going to contain a collection of blog posts in the form of `IBlogMeta[]`. This will do it:

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
```

As you can see, I take the input and create two collections, one being a distinct list of categories. And, the other is all the posts order by date descending. Then I simply render it to the screen. I'm not going to lie, it's not going to be pretty 😀, but it will be functional and I'll do all the UI work in one step once I have everything working.

## Static Props

Next, I'll add my static get static props function, but before I do I'll add the [gray-matter](https://www.npmjs.com/package/gray-matter) and [fs-extra](https://www.npmjs.com/package/fs-extra) packages. Although one can use promises now since version 12 of node, it's still a PITA, so I'll continue to use fs-extra till I don't have to use import workarounds. Gray matter is how I'll store my blog metadata along with the blog content. You can read more about this great package on their [GitHub page](https://github.com/jonschlinkert/gray-matter).

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
  return {
    props: { blogs }
  }
}
```

In this function, I simply query the file system for all files under the `/posts` directory and then parse their meta content to create the props object. There's nothing here that's all that complex, but as you can see getStaticProps is a powerful feature. 

With all this combined, my browser page now looks like this:

![web screenshot](/minimal-nextjs-blog-part2-post-links/web-screenshot.png)

## How does this work

When processing the files found under the `/posts` directory, we use Gray Matter to parse the files into Meta and Content. 

```ts
const { data, content } = matter(readFileSync(path))
```

And to supply the meta we define it in the top of each blog post file. For example, here's a sample blog post.

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

And that's it, such a simple way of writing a blog post - no database required.

---

In [part 3](/posts/minimal-nextjs-blog-part3-show-post) I'll be rendering a single blog post to the screen, and like this part, it's going to be amazing (Again, Self Certified)
