import * as fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/frameworks/hello-world-react-vite/webview-ui/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['vscode'],
      input: {
        webview: resolve(__dirname, 'src/webview/frontend/webview.html'),
        view: resolve(__dirname, 'src/view/frontend/view.html'),
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
    },
    modulePreload: {
      // no need for module preloading because it's not loading files from the internet
      polyfill: false,
    },
    sourcemap: true,
    outDir: 'out',
    // target: 'es2022',
  },
  plugins: [
    react(),

    // https://vitejs.dev/guide/api-plugin.html
    // refer to the comments in `./index.html` for additional context
    {
      name: 'delete-index-html',
      writeBundle() {
        [
          './out/src/view/frontend/view.html',
          './out/src/webview/frontend/webview.html',
        ].map((file) => {
          fs.unlink(file, (err) => {
            if (err) {
              throw err;
            }
          });
        });
      },
    },
  ],
});
