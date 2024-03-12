import React, { useEffect, useState } from 'react';
import {
  VSCodeButton,
  VSCodeLink,
  VSCodeProgressRing,
} from '@vscode/webview-ui-toolkit/react';

import { credentials } from '../../utils/getCredentials.js';
import {
  problems,
  runs,
  clarifications,
  score,
  allowedProgrammingLanguages,
  problemsIds,
} from '../../utils/getData.js';
import LoginForm from './LoginForm.js';
import ProblemsSection from './ProblemsSection.js';
import RunsSection from './RunsSection.js';
import ClarificationsSection from './ClarificationsSection.js';
import ScoreSection from './ScoreSection.js';

type updateUiMessage = {
  command: string;
  credentials: credentials;
  problems?: problems;
  runs?: runs;
  clarifications?: clarifications;
  score?: score;
  allowedProgrammingLanguages?: allowedProgrammingLanguages;
  problemsIds: problemsIds;
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
  const [allowedProgrammingLanguages, setAllowedProgrammingLanguages] =
    useState<allowedProgrammingLanguages>();
  const [problemsIds, setProblemsIds] = useState<problemsIds>();

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data as updateUiMessage;

      if (message.command === 'update-ui') {
        setCredentials(message.credentials);

        if (message.credentials !== null) {
          setProblems(message.problems);
          setRuns(message.runs);
          setClarifications(message.clarifications);
          setScore(message.score);
          setAllowedProgrammingLanguages(message.allowedProgrammingLanguages);
          setProblemsIds(message.problemsIds);
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
      <header>
        <h1>BOCA Team Dashboard</h1>
        {credentials?.username !== undefined && (
          <>
            <h3>
              Logged in as{' '}
              <span style={{ textDecoration: 'underline' }}>
                {credentials.username}
              </span>
              !
            </h3>
            <p>
              <VSCodeLink href={`http://${credentials.ip}/boca`}>
                Go to BOCA web dashboard
              </VSCodeLink>
            </p>
            <VSCodeButton
              appearance="secondary"
              onClick={handleLogoutButtonClick}
            >
              Log Out
            </VSCodeButton>
          </>
        )}
      </header>
      <main>
        {/* if credentials are undefined, they've not been retrieved yet;
        if null, user isn't logged in */}
        {credentials === undefined ? (
          <VSCodeProgressRing></VSCodeProgressRing>
        ) : credentials === null ? (
          <LoginForm vscode={vscode} />
        ) : (
          <>
            <ProblemsSection
              problems={problems ?? []}
              handleDownloadLinkClick={handleDownloadLinkClick}
            />

            <RunsSection
              runs={runs ?? []}
              problemsIds={problemsIds ?? []}
              allowedProgrammingLanguages={allowedProgrammingLanguages ?? []}
              handleDownloadLinkClick={handleDownloadLinkClick}
              vscode={vscode}
            />

            <ClarificationsSection
              clarifications={clarifications ?? []}
              problemsIds={problemsIds ?? []}
              vscode={vscode}
            />

            <ScoreSection
              problemsNames={(problems ?? []).map((p) => p.name)}
              score={score ?? []}
            />
          </>
        )}
      </main>
      <footer>
        <p>
          <VSCodeLink href="https://github.com/gusalbukrk">
            gusalbukrk
          </VSCodeLink>{' '}
          @ IF Goiano
        </p>
      </footer>
    </>
  );
};

export default Dashboard;
