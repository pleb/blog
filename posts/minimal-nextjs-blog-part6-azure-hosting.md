---
title: Minimal Next.js Blog (Part 6 - Azure hosting)
slug: minimal-nextjs-blog-part6-azure-hosting
date: August 18, 2020
categories:
  - Next.js
  - Blogging
  - React
---

*This is a multi-part series. If you haven't read the previous posts, I'd suggest you start at [part 1](/posts/minimal-nextjs-blog-part1-hello-world), as all subsequent parts continue on from each other and are not individual units.*

---

Part 5, Welcome. In this part, I'll be setting up hosting on Azure. I'll be making use of [Static Web Apps (Preview)](https://docs.microsoft.com/en-us/azure/static-web-apps/overview). Originally, I was planning on using the static hosting via [Azure Storage](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website) & Azure CDN. However, Static Web Apps caught my eye, and wow, does it make this part easy - as you will see.

## Next.Js Static HTML

Next.Js supports exporting an app to static HTML, which was my plan on how I was going to use it all along. However, time as come to put this is action. As per the Next.Js [docs](https://nextjs.org/docs/advanced-features/static-html-export) "The exported app supports almost every feature of Next.js, including dynamic routes, prefetching, preloading and dynamic imports.". To enable this I'll slightly tweak the build script command in the `package.json` file and add a call to export. 

The current build task of 

```json
"scripts": {
  "build": "next build
}
```

becomes

```json
"scripts": {
  "build": "next build && next export"
}
```

When I run the `build` command

```ps
npm run build
```

I now have a static website generated in the `/out` directory.

![Out directory screenshot](/minimal-nextjs-blog-part6-azure-hosting/next-js-out.png)

Another great feature is the size of the payload. Bear in mind my site does not have any styling what so ever, however when I view the network tab I get the following figures:

   0 requests
   82.6 kB transferred
   195 kB resources

As you can imagine the site loads fast (AU -> US West). About 1 second without cache and about 1/4 of a second with cache. 

Nice 👍

## Static Web Apps

Thankfully, as per the Azure norm, setting up a Static Web App was surprisingly easy. I won't lie, my first go ended in an error which came down to me entering `/out` as the path to collect the Github actions artifact from instead of `out` without the leading slash. Everything else though, just worked. WOW!

To create the Static Web App, I used the [Azure Portal](https://portal.azure.com/) interface.

![Azure portal static web app](/minimal-nextjs-blog-part6-azure-hosting/azure-create-static-web-apps.png)

Then I entered details as requested by Azure for this site. Nothing out of the ordinary here. Lucky for me, Static Web Apps will integrate with Github using [Github actions](https://github.com/features/actions), and again lucky for me, it will sort all of this out without me doing anything 🤯. To do this I simply allowed Azure access to my Github data via an authorised OAuth App.

![Azure portal static web app](/minimal-nextjs-blog-part6-azure-hosting/azure-create-static-web-apps-2.png)

Next I entered the build information, making sure I enter `out` without a leading slash as the `App artifact location`. I also cleared the `Api location` as I won't be using a backend of any sort. However, this option is for wiring up a backend using the [Azure functions (serverless)](https://azure.microsoft.com/en-au/services/functions) which I found interesting 🤔.

![Azure portal static web app](/minimal-nextjs-blog-part6-azure-hosting/azure-create-static-web-apps-3.png)

I skipped over the tags creation as I have no need for tags. Maybe one day...

The review and create screen is a summary screen. With everything looking in order, I hit create.

![Azure portal static web app](/minimal-nextjs-blog-part6-azure-hosting/azure-create-static-web-apps-4.png)

I'm then redirected to the overview screen.

![Azure static web app overview screen](/minimal-nextjs-blog-part6-azure-hosting/azure-create-static-web-apps-5.png)

Once the deployment is complete, if I look at my repo, I see that Azure has added the file needed for the Github Action.

![Azure portal static web app](/minimal-nextjs-blog-part6-azure-hosting/github-azure-actions.png)

When I go to view the actions I can see that a job has been queued.

![Azure portal static web app](/minimal-nextjs-blog-part6-azure-hosting/github-action-queued.png)

After a few minutes I get an email saying my site is ready... It is 🎉.

![My blog running on an Azure hosted static web app](/minimal-nextjs-blog-part6-azure-hosting/azure-hosted-blog.png)

See I told you it was easy. The best part is that whenever I commit to the main branch, the Github Action will run and publish the new version to my Azure Static Web App. I was even able to point a custom domain to it and surprisingly SSL came included too.

![My blog running on an Azure hosted static web app accessed via a custom domain](/minimal-nextjs-blog-part6-azure-hosting/custom-domain.png)

But wait! There's more. When I make a PR in Github to the main branch, guess what? That's right, the friendly github-actions bot deploys a staging site with the changes from my PR 🤯.

![Github actions pr bot](/minimal-nextjs-blog-part6-azure-hosting/github-actions-pr-bot.png)

---

In [part 7](/posts/minimal-nextjs-blog-part6-react-components) I'll be updating the UI getting it ready for styling. Like this part, it's going to be amazing (Again, Self Certified).
