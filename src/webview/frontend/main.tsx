import React from 'react';
import { createRoot } from 'react-dom/client';

import BocaContestantInterface from './components/BocaContestantInterface.js';
import './index.scss';

const vscode = acquireVsCodeApi();

window.addEventListener('load', () => {
  vscode.postMessage({ command: 'loaded' });
});

const rootElement = document.getElementById('root');
if (rootElement !== null) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <BocaContestantInterface vscode={vscode} />
    </React.StrictMode>,
  );
}
