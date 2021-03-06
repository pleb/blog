---
title: Minimal Next.js Blog (Part 1 - Hello World)
slug: minimal-nextjs-blog-part1-hello-world
date: August 6, 2020
snippet: Building a static blog 
categories:
  - Next.js
  - Blogging
  - React
---

When I say minimal, I may be understating the intent somewhat, so allow me to clarify what I mean. 

My current blog is a WordPress site. Yes, a ubiquitous blogging platform and nothing really of note. So why the change? Well, it's never really felt like a good fit for me. As a developer, I want something more akin to what I'm used to. For instance, I'd like to use GIT source control, and I'd love for my blog to update based on my commits to the Main branch; and possibly a Draft (aka dev) branch. Additionally, I want firm control over the process and tech. A WP site is excellent, but I feel it's overkill for a simple blog and due to its popularity it's a big moving target for hackers. Lastly, a simple factor of the matter is I cannot be bothered keeping on top of the maintenance required to keep it safe, therefore it's only a matter of time before it's defaced by an automated bot of some sort - bah.

Ok. So time for me to create an MVP list 🤔...

I'll start with what I want from the current WP site
 - Blog posts (Obviously)
 - Blog tags (View all posts in a category etc.)
 - Miscellaneous pages

and what features I want and currently don't have
 - Static website (No need for a real backend. Safer from hackers due to neglect)
 - Automatically update when I commit to the Main branch (CI/CD)
 - Markdown support

## Project creation

Time for the usual NPM dance to kick the project off

```powershell
npm init --y
npm install next react react-dom
```

Next, I'll add these scripts to the package.json file, as per the [Next.js docs](https://nextjs.org/docs/getting-started). 

```json
"scripts": {
  "dev": "next",
  "build": "next build",
  "start": "next start"
}
```

## TypeScript support

It's pretty easy to add TS support to a project these days. However, for Next.js there's a couple of little tricks, so excuse my somewhat weird way of going about this.

```powershell
npm install typescript @types/react @types/node --save-dev
```

Then I'll add an empty `tsconfig.json` file... to be continued (Wait for it). The full path is `./tsconfig.json`.

## Directory structure

Because I can't run Next.js without the pages directory, I'll add it, and the ones I envisage that I'll need. 

My folder layout will be like so:
 - pages (react pages. *known Next.js directory*)
 - posts (blog posts in markdown format)
 - public (static files, such as screenshots etc. *known Next.js directory*)
   - Note: these files are served from `/`
 - components (react components. *known Next.js directory*)

## Index page

Obviously, when the project is empty there's nothing to serve so next I'll add my IndexPage component. To do this, I'll create an `index.tsx` file under the pages directory. The full path is `/pages/index.tsx`.

```tsx
import React from 'react'

const IndexPage = () => <div>Hello World</div>

export default IndexPage
```

If you didn't already guess, this will render "Hello World" to the browser screen.

## Checkpoint 

Ok, so now I should have everything to get a basic page loading. My project is currently looking like this:

![Project Tree](/minimal-nextjs-blog-part1-hello-world/project-tree.png)

For me to kick off the dev server I need to run the `dev` command I added in the scripts section earlier.

```powershell
npm run dev
```

Yay! Some console output. Looking good.

![Console output](/minimal-nextjs-blog-part1-hello-world/first-run.png)

If I navigate to http://localhost:3000 I should see my IndexPage component rendered on the screen.

![Webpage screenshot](/minimal-nextjs-blog-part1-hello-world/first-page-load.png)

Brilliant! It works.

## Finish line

Finished, right? Well almost. If you look carefully at the console output you'll see the Next.js framework has populated the tsconfig.json file with its default. Ah ha, the continuation point from early. See I told you my weird method of adding TS had a purpose. Next, I'll change a few of the defaults to my own preference.

I'll be setting strict to true. If you want, you can read more about this change on the [TS Website](https://www.typescriptlang.org/tsconfig#Strict_Type_Checking_Options_6173).

```json
"strict": true,
```

To ensure I'm getting the most out of Type Safety, I'll also be enabling no implicit this, no implicit any, and lastly, no implicit return types.

```json
"noImplicitThis": true,
"noImplicitAny": true,
"noImplicitReturns": true,
```

Even the most astute dev leaves unused code lying around sometimes, and well, lucky for me TS allows me to say NO 🙅‍♀️🙅‍♂️⛔ to unused locals, so I'll enable this. Although it won't be the absolute fix to the unused code problem, it sure goes a long way from doing nothing at all.

```json
"noUnusedLocals": true,
```

Nearly there, just one last thing.

[Prettier](https://prettier.io/) - love it or hate it, it has a purpose, and I love the purpose. Although admittedly for my blog, I don't need prettier, I'm used to it and could not be bothered setting up code formatting in my IDE [Webstorm](https://www.jetbrains.com/webstorm/). If you're not familiar with prettier, I'd suggest reading their [why page](https://prettier.io/docs/en/why-prettier.html).

To install prettier I'll simply run this NPM command.

```powershell
npm install prettier --save-dev
```

Then add my configuration to the `.prettierrc.json` file along with my own preferences. The full path is `/.prettierrc.json`.

```json
{
  "semi":  false,
  "trailingComma":  "none",
  "singleQuote":  true,
  "printWidth":  140,
  "tabWidth":  2,
  "endOfLine": "lf"
}
```

[Depending on your editor](https://prettier.io/docs/en/editors.html) depends on how one uses prettier. For webstorm, I'm in the habit of Ctrl+Alt+Shift+P whenever I've made changes to a file, so you won't see any fancy script commands added to the package.json file or any cool way of making Pettier work automatically.

Yay. FINISHED! 

---

In [part 2](/posts/minimal-nextjs-blog-part1-hello-world) I'll be rendering a list of posts and categories to the screen. Don't miss it, as it's going to be amazing (Self Certified).
