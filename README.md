# Vite's Dev Server returns wrong module for given ETag

## Steps to reproduce

1. Clone this repository

   ```sh
   git clone https://github.com/maxpatiiuk/vite-etag-bug/
   ```

2. Install `vite`

   ```sh
   npm install
   ```

3. Start the dev server

   ```sh
   npx vite
   ```

4. Open the browser console, and see "last script" printed once (EXPECTED).
   Important: make sure caching is NOT disabled in your browser dev tools

5. Stop the dev server, and start it again with the following command:

   ```sh
   MODE=include_first_script npx vite
   ```

6. EXPECTED to see "first script" and "last script" in the console. INSTEAD, saw
   "last script" printed twice.

   - Disabling browser cache and reloading the page shows "first script" and
     "last script" as expected.

## Why this is happening

Scripts injected into `index.html` are turned by Vite into separate files, that
are requested via a URL like `/index.html?html-proxy&index=0.js` and
`/index.html?html-proxy&index=1.js`.

Vite
[computes ETag](https://github.com/vitejs/vite/blob/8ce86833f2eccb8a845f87e2fba20abf5dfecd6b/packages/vite/src/node/server/send.ts#L40)
for these scripts based on **content only**.

When you start Vite dev server with the `npm run dev` command. The "last script"
is the only to be included in index.html - it's content gets hashed and ETag is
saved in the browser.

The 2nd time you start the dev server with `npm run dev:include_first_script`,
index.html includes both "first script" and "last script". The browser makes a
request for the first script using the ETag from the previous dev server run
(when only "last script" was included).

Here is
[where the issue occurs](https://github.com/vitejs/vite/blob/8ce86833f2eccb8a845f87e2fba20abf5dfecd6b/packages/vite/src/node/server/middlewares/transform.ts#L54-L55):
Vite resolves the ETag the browser sends in the "if-none-match" header. Except
since the ETag matches the "last script" content, Vite returns "304 Not
Modified", causing browser to use the old content ("last script") when it should
have used the new content ("first script").

Then the browser makes the request for "last script" and gets the actual "last
script" content.

## Solution

These
[two lines are problematic](https://github.com/vitejs/vite/blob/8ce86833f2eccb8a845f87e2fba20abf5dfecd6b/packages/vite/src/node/server/middlewares/transform.ts#L54-L55).

Vite is basically checking if "any file at all matches the provided ETag", and
if so, returns 304. This is dangerous. Vite should consider the URL path too.

For example, in the above `viteCachedTransformMiddleware()` function, in the
case when the bug occurs, the `moduleByEtag.url` is
`/index.html?html-proxy&index=3.js`, where as `req.url` is
`/index.html?html-proxy&index=2.js`.

## How I found the bug

While this seems like a bit convoluted reproduction case, I found this bug by
having multiple Vite projects, where the same script was inserted into
index.html at the last position, but the number of preceding scripts inserted
varied between the projects (depending on the number of dependencies).
