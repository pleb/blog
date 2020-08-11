declare module 'remark-highlight.js' {
  import { Plugin } from 'unified'
  interface highlightJs extends Plugin {}
  const highlight: highlightJs
  export = highlight
}
