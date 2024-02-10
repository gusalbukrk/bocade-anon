import * as fs from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://github.com/microsoft/vscode-webview-ui-toolkit-samples/blob/main/frameworks/hello-world-react-vite/webview-ui/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['vscode'],
      output: {
        entryFileNames: `webview.js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
      },
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
        fs.unlink('./out/index.html', (err) => {
          if (err) {
            throw err;
          }
        });
      },
    },
  ],
});
