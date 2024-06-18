import React, { useEffect, useState } from 'react';
import {
  VSCodeButton,
  VSCodeLink,
  VSCodePanelTab,
  VSCodePanelView,
  VSCodePanels,
  VSCodeProgressRing,
} from '@vscode/webview-ui-toolkit/react';

import { credentials } from '../../backend/getCredentials.js';
import {
  problems,
  runs,
  clarifications,
  score,
  allowedProgrammingLanguages,
  problemsIds,
} from '../../backend/getData.js';
import LoginForm from './LoginForm.js';
import ProblemsSection from './ProblemsSection.js';
import RunsSection from './RunsSection.js';
import ClarificationsSection from './ClarificationsSection.js';
import ScoreSection from './ScoreSection.js';

type updateDataMessage = {
  command: 'update-data';
  credentials: credentials;
  contestRemainingTime?: string;
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

const ContestantInterface = ({
  vscode,
}: {
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) => {
  const [credentials, setCredentials] = useState<credentials>();
  const [contestRemainingTime, setContestRemainingTime] = useState<string>();
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
      }, 60000);
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
      setContestRemainingTime(message.contestRemainingTime);
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
      filename: e.target.textContent,
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
          <h1>BOCADE</h1>
          <h2>BOCA Development Environment</h2>
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
            <p>
              Logged in as <strong>{credentials.username}</strong>
            </p>
            <p>
              <span
                dangerouslySetInnerHTML={{
                  // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-non-null-assertion
                  __html: contestRemainingTime!.replace(
                    /(.*) (to start|left|of extra time)/,
                    '<strong>$1</strong> $2',
                  ),
                }}
              ></span>
              <span className="fa-hourglass"></span>
            </p>
            <p>
              <VSCodeLink href={`http://${credentials.ip}/boca`}>
                Go to BOCA web interface
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
          <VSCodePanels>
            <VSCodePanelTab id="tab-1">
              <h2>Problems</h2>
            </VSCodePanelTab>
            <VSCodePanelTab id="tab-2">
              <h2>Runs</h2>
            </VSCodePanelTab>
            <VSCodePanelTab id="tab-3">
              <h2>Clarifications</h2>
            </VSCodePanelTab>
            <VSCodePanelTab id="tab-4">
              <h2>Score</h2>
            </VSCodePanelTab>

            <VSCodePanelView id="view-1">
              <ProblemsSection
                problems={problems ?? []}
                handleDownloadLinkClick={handleDownloadLinkClick}
              />
            </VSCodePanelView>
            <VSCodePanelView id="view-2">
              <RunsSection
                runs={runs ?? []}
                problemsIds={problemsIds ?? []}
                allowedProgrammingLanguages={allowedProgrammingLanguages ?? []}
                handleDownloadLinkClick={handleDownloadLinkClick}
                vscode={vscode}
                setIsReloading={setIsReloading}
              />
            </VSCodePanelView>
            <VSCodePanelView id="view-3">
              <ClarificationsSection
                clarifications={clarifications ?? []}
                problemsIds={problemsIds ?? []}
                vscode={vscode}
                setIsReloading={setIsReloading}
              />
            </VSCodePanelView>
            <VSCodePanelView id="view-4">
              <ScoreSection
                problemsNames={(problems ?? []).map((p) => p.name)}
                score={score ?? []}
              />
            </VSCodePanelView>
          </VSCodePanels>
        )}
      </main>
      <footer>
        <p>
          <VSCodeLink href="https://github.com/gusalbukrk">
            gusalbukrk
          </VSCodeLink>{' '}
          @ IF Goiano – 2024
        </p>
      </footer>
    </>
  );
};

export default ContestantInterface;
