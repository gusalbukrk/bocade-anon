import React from 'react';
import { createRoot } from 'react-dom/client';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

import Dashboard from './components/Dashboard.js';

const vscode = acquireVsCodeApi();

const App = () => {
  function handleButtonClick() {
    vscode.postMessage({
      command: 'howdy',
      text: 'Hey there partner! 👋',
    });
  }

  return (
    <>
      <h2>Hello, world!</h2>
      <VSCodeButton id="howdy" onClick={handleButtonClick}>
        Howdy!
      </VSCodeButton>
      <Dashboard vscode={vscode} />
    </>
  );
};

const rootElement = document.getElementById('root');
if (rootElement !== null) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

window.addEventListener('load', () => {
  console.log('loaded');
  vscode.postMessage({ command: 'loaded' });
});
