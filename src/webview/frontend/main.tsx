import React from 'react';
import { createRoot } from 'react-dom/client';

import Dashboard from './components/Dashboard.js';
import './index.scss';

const vscode = acquireVsCodeApi();

window.addEventListener('load', () => {
  vscode.postMessage({ command: 'loaded' });
});

const rootElement = document.getElementById('root');
if (rootElement !== null) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <Dashboard vscode={vscode} />
    </React.StrictMode>,
  );
}
