import React from 'react';
import { createRoot } from 'react-dom/client';

import './index.scss';
import TestCases from './components/TestCases.js';

const vscode = acquireVsCodeApi();

const rootElement = document.getElementById('root');
if (rootElement !== null) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <TestCases vscode={vscode} />
    </React.StrictMode>,
  );
}
