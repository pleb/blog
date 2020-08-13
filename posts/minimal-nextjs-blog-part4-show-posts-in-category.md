---
title: Minimal Next.js Blog (Part 4 - Show posts in category)
slug: minimal-nextjs-blog-part4-show-posts-in-category
date: August 11, 2020
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multi-part series. If you haven't read the previous posts, I'd suggest you start at [part 1](/posts/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue on from each other and are not individual units.*

---

Part 4, Again - Welcome. In this part, I will be rendering a list of all posts within a category. The logic to do this is essentially a mix of that which I used in the `pages/index.tsx` and `blog\[slug].tsx` pages.

To start with, I'll do a little refactor of the functionality I want to share between these pages, then after that I'll lay down the required code to render a list of blog posts within the selected category.

## Refactor time

I'll move the logic to create a collection of blog metadata out of the `pages/index.tsx` page and into the shared files `/shared/posts.ts` or `/shared/build-time/posts.ts`. So this:

```ts
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

to this:

```ts
export const getStaticProps: GetStaticProps = async (): Promise<{ props: IIndexProps }> => {
  const blogs = await getBlogMetadata()
  return {
    props: { blogs }
  }
}
```

The newly created function `getBlogMetadata` looks like this:

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

Did you notice I've also added an optional param to filter the returned collection by a category? Yes 🎉

I'll also need a share the logic to get a collection of distinct categories and sorted posts. Which changes my `IndexPage` component from:

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

to:

```ts
const IndexPage = (props: IIndexProps) => {
  const distinctCategories = getDistinctCategories(props.blogs)
  const sortedPosts = sortBlogMetaDescending(props.blogs)
 
  // TSX Code
```

with `getDistinctCategories` and `sortBlogMetaDescending` simply becoming this in the `shared/posts.ts` file: 

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

Having perfect hindsight would be great. However, sadly it is also impossible. Truth be told, I've already gone back and made a number of adjustments to the code and previous posts to fix things, although they have mostly been minor. My next change, however, is a good one to leave in, as I feel it's a) good to show that you can't make the perfect solution, and b) refactoring/adjusting or correcting plain inaccuracies is just part of the software development process. 

The problem. I'm going to be using categories as the route slug, and obviously, not all characters play nicely in the URL. I figure if I replace any characters that's not alphanumeric or a hyphen with a hyphen, then it's a pretty easy way to solve this problem. That's my thoughts about it for the moment, and I guess time will tell. Now, that leaves me with another problem. Because I'm adjusting the category text I either need to settle with the text and the slug looking the same, yuk, or I change categories from simple string collection `string[]` to a complex type, such as, `{ name: string, slug: string}`. The complex type seems like a good solution, so I'll going with that one for now.

First, I'll create my sanitiseCategory function:

```ts
const sanitiseCategory = (category: string): string => category.replace(/([^a-z0-9\-])+/gi, '-').toLowerCase()
```

Then I'll update the `extractBlogMeta` function to be:

```ts
export const extractBlogMeta = (data: { [key: string]: any }): IBlogMetadata => ({
  title: data['title'],
  snippet: data['snippet'] ?? '',
  slug: data['slug'],
  categories: (data['categories'] ?? []).map((c: string) => ({ name: c, slug: sanitiseCategory(c) }))
  date: data['date']
})
```

Of course my `IBlogMetadata` type defined in the `/pages/index.tsx` file needs to also reflect this change, so it changes from:

```ts
export interface IBlogMetadata {
  title: string
  snippet: string
  slug: string
  categories: string[]
  date: string
}
```

to:

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

And, now where I render categories to the screen in the `/pages/index.tsx` file changes from:

```jsx
<h2>Categories</h2>
  {distinctCategories.map((category) => (
  <ul key={category}>
    <Link href={`/blog-category/${category}`}>
      <a>{category}</a>
    </Link>
   </ul>
))}
```

to:

```jsx
<h2>Categories</h2>
  {distinctCategories.map((category) => (
  <ul key={category.slug}>
    <Link href={`/blog-category/${category.slug}`}>
      <a>{category.name}</a>
    </Link>
   </ul>
))}
```

I'll need to update my `getBlogMetadata` function in the `/shared/build-time/posts.ts` file from: 

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

to:

```ts
export const getBlogMetadata = async (filterCategorySlug?: string): Promise<IBlogMetadata[]> => {
  const postFileNames = await getPostsMarkdownFileNames()
  const blogMetadata = postFileNames.map((fileName: string) => {
    const { data } = matter(readPostFile(fileName))
    return extractBlogMeta(data)
  })
  return !filterCategory
  return !filterCategorySlug
    ? blogMetadata
    : blogMetadata.filter((blogMetadata) => blogMetadata.categories.some((c) => c.slug === filterCategorySlug))
}
```

I'm nearly there, one last adjust is the `getDistinctCategories` function in the `/shared/posts.ts` file, which goes from:

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

Even though I'm thinking the new version of `getDistinctCategories` could do with some optimisations, I won't worry about it because it's only used at build (pack) time. If I notice a slow down at some point in the future, I'll revisit it, and other parts, then.

Now I have both human and url friendly categories and category slugs.

My categories now look like this:

![Updated category view](/minimal-nextjs-blog-part4-show-posts-in-category/categories-updated.png)


And, the category URLs are slug friendly, like so `http://localhost:3000/blog-category/aws-codedeploy`
 
## Showing blogs posts within a category

Thankfully, the refactoring and fixing the category verse category slug change was the hardest part of the showing blogs posts in a category. 
