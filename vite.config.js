export default {
  server: {
    open: true,
    port: 9999,
  },
  plugins: [
    {
      name: 'etag-bug-reproduction',
      transformIndexHtml: {
        // Add imports to index.html before Vite starts resolving imports
        order: 'pre',
        handler: () => [
          ...(process.env.MODE === 'include_first_script'
            ? [
                {
                  tag: 'script',
                  attrs: {
                    type: 'module',
                  },
                  children: "console.log('first script');",
                },
              ]
            : []),
          {
            tag: 'script',
            attrs: {
              type: 'module',
            },
            children: "console.log('last script');",
          },
        ],
      },
    },
  ],
};
