import React from 'react'
import matter from 'gray-matter'
import { GetStaticProps, GetStaticPaths, GetStaticPropsContext } from 'next'
import { covertMarkdownToHtml, getMarkdownFileNames, readFile } from '../shared/build-time/utilities'

interface IMiscellaneousPage {
  html: string
}

const MiscellaneousPage = (props: IMiscellaneousPage) => {
  return (
    <>
      <header>
        <p>My Blog</p>
      </header>
      <main>
        <section dangerouslySetInnerHTML={{ __html: props.html }}></section>
      </main>
      <footer>
        <p>Author: Wade Baglin</p>
      </footer>
    </>
  )
}

export default MiscellaneousPage

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext): Promise<{ props: IMiscellaneousPage }> => {
  const slug = context.params!.slug
  const { content } = matter(readFile('miscellaneous', `${slug}.md`))
  const html = await covertMarkdownToHtml(content)

  return {
    props: {
      html
    }
  }
}

export const getStaticPaths: GetStaticPaths = async (): Promise<{
  paths: Array<string | { params: { slug: string } }>
  fallback: boolean
}> => {
  const markdownFileNames = await getMarkdownFileNames('miscellaneous')
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
