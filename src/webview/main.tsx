import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
} from '@vscode/webview-ui-toolkit';

provideVSCodeDesignSystem().register(vsCodeButton());

const App = () => {
  return (
    <div>
      <h2>Hello, world!</h2>
      <vscode-button id="howdy" onClick={handleButtonClick}>
        Howdy!
      </vscode-button>
    </div>
  );
};

const vscode = acquireVsCodeApi();
console.log(vscode);

function handleButtonClick() {
  vscode.postMessage({
    command: 'howdy',
    text: 'Hey there partner! 👋',
  });
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// await new Promise((res) =>
//   setTimeout(() => {
//     console.log('awaited');
//     res(true);
//   }, 5000),
// );

window.addEventListener('load', () => {
  console.log('loaded');
  vscode.postMessage({ command: 'loaded' });
});

window.addEventListener('message', (event) => {
  const data = event.data;

  if (data.command === 'loaded') {
    document.querySelector('h2')!.innerText = data.text;
  }
});
