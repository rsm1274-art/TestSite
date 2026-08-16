Tailwind build setup (local)

1) Install dev dependencies (run in a shell that allows npm scripts; if PowerShell blocks scripts try CMD or change execution policy):

   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p

2) Build production CSS:

   npm run build:css

3) During development (watch mode):

   npm run dev:css

Notes:
- The project currently uses an inline CDN in `index.html` for quick demos. Replace it with `dist/styles.css` by building Tailwind as above (I've already updated `index.html` to reference `dist/styles.css`).
- If you run into PowerShell execution policy errors, you can open an elevated PowerShell and run:

   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

  or run the npm commands in CMD (cmd.exe) instead.

Security note:
- This scaffolding does not include active authentication. If you add testing credentials during development, remove them before deployment.

Content pattern recommendation (performance) ⚠️
- Tailwind scans files listed in the `content` array of `tailwind.config.js`. Avoid overly-broad globs (for example, patterns that match `./**/*.js`) because they can accidentally match `node_modules` and cause very slow builds.
- Recommended: limit scanning to your source folders, e.g.:

```js
content: [
  './*.html',
  './**/*.html',
  './src/**/*.{js,ts,jsx,tsx}',
  './assets/**/*.{js,ts}'
]
```

- I updated `tailwind.config.js` to use narrow globs to improve performance and avoid warnings; adjust these globs if you add new source folders.

For details and best practices, see: https://tailwindcss.com/docs/content-configuration#pattern-recommendations
