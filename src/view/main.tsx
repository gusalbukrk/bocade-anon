import React from 'react';
import { createRoot } from 'react-dom/client';

import './index.scss';
import View from './components/View.js';

const vscode = acquireVsCodeApi();

// window.addEventListener('load', () => {
//   vscode.postMessage({ command: 'loaded' });
// });

const rootElement = document.getElementById('root');
if (rootElement !== null) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <View vscode={vscode} />
    </React.StrictMode>,
  );
}
