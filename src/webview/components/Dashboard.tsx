import React, { useEffect, useState } from 'react';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

import { credentials } from '../../utils/getCredentials.js';
import { getProblems } from '../../utils/getData.js';
import LoginForm from './LoginForm.js';

type downloadLinks = { name: string; url: string }[];

type problems = Awaited<ReturnType<typeof getProblems>>;

type updateUIMessage = {
  command: string;
  credentials: credentials;
  content?: string;
  downloadLinks?: downloadLinks;
  problems?: problems;
};

const Dashboard = ({
  vscode,
}: {
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) => {
  const [credentials, setCredentials] = useState<credentials>();
  const [sectionContent, setSectionContent] = useState<string>();
  const [downloadLinks, setDownloadLinks] = useState<downloadLinks>();
  const [problems, setProblems] = useState<problems>();

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data as updateUIMessage;

      if (message.command === 'update-ui') {
        setCredentials(message.credentials);

        if (message.credentials !== null) {
          setSectionContent(message.content);
          setDownloadLinks(message.downloadLinks);
          setProblems(message.problems);
        }
      }
    });
  }, []);

  function handleLogoutButtonClick() {
    vscode.postMessage({
      command: 'logout',
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

  return (
    <>
      {credentials !== undefined &&
        (credentials === null ? (
          <LoginForm vscode={vscode} />
        ) : (
          <>
            <VSCodeButton onClick={handleLogoutButtonClick}>
              Log Out
            </VSCodeButton>
            <section
              dangerouslySetInnerHTML={{ __html: sectionContent ?? '' }}
            ></section>
            {(downloadLinks ?? []).map(({ name, url }) => {
              return (
                <p>
                  <a href={url} onClick={handleDownloadLinkClick}>
                    {name}
                  </a>
                </p>
              );
            })}
            <table>
              {(problems ?? []).map((problem) => (
                <tr>
                  <td>{problem.name}</td>
                </tr>
              ))}
            </table>
          </>
        ))}
    </>
  );
};

export default Dashboard;
