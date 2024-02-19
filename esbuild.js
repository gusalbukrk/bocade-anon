import esbuild, { build } from 'esbuild';

const baseConfig = {
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
};

const extensionConfig = {
  ...baseConfig,
  platform: 'node',
  mainFields: ['module', 'main'],
  format: 'cjs',
  entryPoints: ['./src/extension.ts'],
  outfile: './out/extension.js',
  external: ['vscode'],
};

// https://github.com/evanw/esbuild/blob/main/CHANGELOG.md#0170
const plugins = [
  {
    name: 'my-plugin',
    setup(/** @type {import('esbuild').PluginBuild} */ build) {
      build.onEnd((result) => {
        console.log(result);
      });
    },
  },
];

const webviewConfig = {
  ...baseConfig,
  target: 'es2020',
  format: 'esm',
  entryPoints: ['./src/webview/main.tsx'],
  outfile: './out/webview.js',
};

await (async () => {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--watch')) {
      // Build and watch extension and webview code
      console.log('[watch] build started');
      const extensionCtx = await esbuild.context({
        ...extensionConfig,
        plugins,
      });
      await extensionCtx.watch();
      const webviewCtx = await esbuild.context({ ...webviewConfig, plugins });
      await webviewCtx.watch();
      console.log('[watch] build finished');
    } else {
      // Build extension and webview code
      await build(extensionConfig);
      await build(webviewConfig);
      console.log('build complete');
    }
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();
