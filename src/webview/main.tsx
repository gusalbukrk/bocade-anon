import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
} from '@vscode/webview-ui-toolkit';

provideVSCodeDesignSystem().register(vsCodeButton());

const App = () => {
  const [downloadLinks, setDownloadLinks] = useState<
    { name: string; url: string }[]
  >([]);

  // sometimes is necessary to attach events listeners inside react scope
  // because, for instance, it depends on a state
  // in this case, use `useEffect()` with an empty array of dependencies
  // empty array of deps means effect will only run once, after initial render
  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'update-ui') {
        setDownloadLinks(message.downloadLinks);
      }
    });
  }, []);

  return (
    <div>
      <h2>Hello, world!</h2>
      <vscode-button id="howdy" onClick={handleButtonClick}>
        Howdy!
      </vscode-button>
      <section></section>
      {downloadLinks.map(({ name, url }) => {
        return (
          <p>
            <a href={url} onClick={handleDownloadLinkClick}>
              {name}
            </a>
          </p>
        );
      })}
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

function handleDownloadLinkClick(
  e: React.MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement },
) {
  e.preventDefault();
  e.stopPropagation();

  vscode.postMessage({
    command: 'download',
    name: e.target.textContent,
    url: e.target.href,
  });
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

window.addEventListener('load', () => {
  console.log('loaded');
  vscode.postMessage({ command: 'loaded' });
});

window.addEventListener('message', (event) => {
  const data = event.data;

  if (data.command === 'update-ui') {
    document.querySelector('section')!.innerHTML += data.content;
  }
});
