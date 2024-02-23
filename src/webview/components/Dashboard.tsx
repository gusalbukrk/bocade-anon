import React, { useEffect, useState } from 'react';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';

import { credentials } from '../../utils/getCredentials.js';
import { problems, runs, clarifications, score } from '../../utils/getData.js';
import LoginForm from './LoginForm.js';
import ProblemsTable from './ProblemsTable.js';
import RunsTable from './RunsTable.js';
import ClarificationsTable from './ClarificationsTable.js';
import ScoreTable from './ScoreTable.js';

type updateUIMessage = {
  command: string;
  credentials: credentials;
  problems?: problems;
  runs?: runs;
  clarifications?: clarifications;
  score?: score;
};

const Dashboard = ({
  vscode,
}: {
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) => {
  const [credentials, setCredentials] = useState<credentials>();
  const [problems, setProblems] = useState<problems>();
  const [runs, setRuns] = useState<runs>();
  const [clarifications, setClarifications] = useState<clarifications>();
  const [score, setScore] = useState<score>();

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data as updateUIMessage;

      if (message.command === 'update-ui') {
        setCredentials(message.credentials);

        if (message.credentials !== null) {
          setProblems(message.problems);
          setRuns(message.runs);
          setClarifications(message.clarifications);
          setScore(message.score);
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

            <ProblemsTable
              problems={problems ?? []}
              handleDownloadLinkClick={handleDownloadLinkClick}
            />

            <RunsTable
              runs={runs ?? []}
              handleDownloadLinkClick={handleDownloadLinkClick}
            />

            <ClarificationsTable clarifications={clarifications ?? []} />

            <ScoreTable
              problemsNames={(problems ?? []).map((p) => p.name ?? '')}
              score={score ?? []}
            />
          </>
        ))}
    </>
  );
};

export default Dashboard;
