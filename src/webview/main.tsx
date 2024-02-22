import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

import { credentials } from '../utils/getCredentials.js';

type downloadLinks = { name: string; url: string }[];

type updateUIMessage = {
  command: string;
  credentials: credentials;
  content?: string;
  downloadLinks?: downloadLinks;
};

type DashboardProps = {
  sectionContent: string;
  downloadLinks: downloadLinks;
};

const App = () => {
  const [credentials, setCredentials] = useState<credentials>();
  const [sectionContent, setSectionContent] = useState<string>();
  const [downloadLinks, setDownloadLinks] = useState<downloadLinks>();

  // sometimes is necessary to attach events listeners inside react scope
  // because, for instance, it depends on a state
  // in this case, use `useEffect()` with an empty array of dependencies
  // empty array of deps means effect will only run once, after initial render
  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data as updateUIMessage;
      if (message.command === 'update-ui') {
        setCredentials(message.credentials);

        if (message.credentials !== null) {
          setSectionContent(message.content);
          setDownloadLinks(message.downloadLinks);
        }
      }
    });
  }, []);

  return (
    <div>
      <h2>Hello, world!</h2>
      <VSCodeButton id="howdy" onClick={handleButtonClick}>
        Howdy!
      </VSCodeButton>

      {credentials !== undefined &&
        (credentials === null ? (
          <LoginForm />
        ) : (
          <Dashboard
            sectionContent={sectionContent ?? ''}
            downloadLinks={downloadLinks ?? []}
          />
        ))}
    </div>
  );
};

const LoginForm = () => {
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data as { command: string };
      if (message.command === 'login-finished') {
        setIsLoginInProgress(false);
      }
    });
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoginInProgress(true);

    const get = (name: string) =>
      (event.currentTarget.elements.namedItem(name) as HTMLInputElement).value;

    const credentials = {
      ip: get('ip'),
      username: get('username'),
      password: get('password'),
    };

    if (Object.values(credentials).every((c) => c !== '')) {
      vscode.postMessage({
        command: 'login',
        credentials,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="ip">IP:</label>
      <input type="text" id="ip" name="ip" />
      <label htmlFor="username">Username:</label>
      <input type="text" id="username" name="username" />
      <label htmlFor="password">Password:</label>
      <input type="password" id="password" name="password" />
      <input type="submit" value="Log in" disabled={isLoginInProgress} />
    </form>
  );
};

const Dashboard = ({ sectionContent, downloadLinks }: DashboardProps) => {
  function handleLogoutButtonClick() {
    vscode.postMessage({
      command: 'logout',
    });
  }

  return (
    <>
      <VSCodeButton onClick={handleLogoutButtonClick}>Log Out</VSCodeButton>
      <section dangerouslySetInnerHTML={{ __html: sectionContent }}></section>
      {downloadLinks.map(({ name, url }) => {
        return (
          <p>
            <a href={url} onClick={handleDownloadLinkClick}>
              {name}
            </a>
          </p>
        );
      })}
    </>
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
