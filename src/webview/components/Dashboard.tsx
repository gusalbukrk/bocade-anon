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

type updateDataMessage = {
  command: 'update-data';
  credentials: credentials;
  problems?: problems;
  runs?: runs;
  clarifications?: clarifications;
  score?: score;
  allowedProgrammingLanguages?: allowedProgrammingLanguages;
  problemsIds: problemsIds;
};

type updateClarificationsDataMessage = {
  command: 'update-clarifications-data';
  clarifications: clarifications;
};

type updateRunsDataMessage = {
  command: 'update-runs-data';
  runs: runs;
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
  const [isReloading, setIsReloading] = useState(false);
  const [showReloadedWarning, setShowReloadedWarning] = useState(false);

  // `setInterval` is being re-set after every `credentials` update to avoid stale closure
  // https://dmitripavlutin.com/react-hooks-stale-closures/
  // dependencies array only contains `credentials`, because
  // it's the only outer variable used inside callback function
  useEffect(() => {
    let id: NodeJS.Timeout;
    if (credentials !== undefined && credentials !== null) {
      id = setInterval(() => {
        setIsReloading(true);
        vscode.postMessage({ command: 'reload' });
      }, 15000);
    }

    return () => {
      clearInterval(id);
    };
  }, [credentials]);

  // event handler is being re-set after every `isReloading` update to avoid stale closure
  // https://dmitripavlutin.com/react-hooks-stale-closures/
  // dependencies array only contains `isReloading`, because
  // it's the only outer variable used inside handler function
  useEffect(() => {
    window.addEventListener('message', messageEventHandler);

    return () => {
      window.removeEventListener('message', messageEventHandler);
    };
  }, [isReloading]);

  useEffect(() => {
    if (showReloadedWarning) {
      setTimeout(() => {
        setShowReloadedWarning(false);
      }, 5000);
    }
  }, [showReloadedWarning]);

  function messageEventHandler(event: MessageEvent) {
    const message = event.data as
      | updateDataMessage
      | updateClarificationsDataMessage
      | updateRunsDataMessage;

    if (message.command === 'update-data') {
      setCredentials(message.credentials);

      // following properties are optional, so they may be undefined
      setProblems(message.problems);
      setRuns(message.runs);
      setClarifications(message.clarifications);
      setScore(message.score);
      setAllowedProgrammingLanguages(message.allowedProgrammingLanguages);
      setProblemsIds(message.problemsIds);

      if (isReloading) {
        // conditional ensures won't run on first load
        setIsReloading(false);
        setShowReloadedWarning(true);
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (message.command === 'update-clarifications-data') {
      setClarifications(message.clarifications);
      setIsReloading(false);
      setShowReloadedWarning(true);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (message.command === 'update-runs-data') {
      setRuns(message.runs);
      setIsReloading(false);
      setShowReloadedWarning(true);
    }
  }

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

  function handleReloadButtonClick() {
    setIsReloading(true);
    vscode.postMessage({
      command: 'reload',
    });
  }

  return (
    <>
      <header>
        <div>
          <h1>BOCA Team Dashboard</h1>
          {problems !== undefined /* indicates that the data has loaded */ && (
            <>
              <VSCodeButton
                appearance="icon"
                onClick={handleReloadButtonClick}
                disabled={isReloading || showReloadedWarning}
              >
                <span
                  className={`codicon codicon-sync ${isReloading ? 'codicon-modifier-spin' : ''}`}
                ></span>
              </VSCodeButton>
              {showReloadedWarning && <span>reloaded</span>}
            </>
          )}
        </div>
        {credentials?.username !== undefined && (
          <>
            <h3>
              Logged in as <span>{credentials.username}</span>!
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
              setIsReloading={setIsReloading}
            />

            <ClarificationsSection
              clarifications={clarifications ?? []}
              problemsIds={problemsIds ?? []}
              vscode={vscode}
              setIsReloading={setIsReloading}
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
