import React, { useState, useEffect, useRef } from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeButton,
} from '@vscode/webview-ui-toolkit/react';

import {
  allowedProgrammingLanguages,
  problemsIds,
  runs,
} from '../../../webview/backend/getData.js';
import useWarning from '../hooks/useWarning.js';

function RunsSection({
  runs,
  problemsIds,
  allowedProgrammingLanguages,
  handleDownloadLinkClick,
  vscode,
  setIsReloading,
}: {
  runs: runs;
  problemsIds: problemsIds;
  allowedProgrammingLanguages: allowedProgrammingLanguages;
  handleDownloadLinkClick: (
    e: React.MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement },
  ) => void;
  vscode: ReturnType<typeof acquireVsCodeApi>;
  setIsReloading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string>();
  const { Warning, setWarning } = useWarning();

  // using refs instead of state in forms fields (i.e. controlled components) because
  // it's a simpler approach (https://stackoverflow.com/a/34622774)
  //
  // refs typing doesn't includes all available properties out-of-the-box
  // https://github.com/microsoft/fast/issues/6909
  const problemsDropdownRef = useRef<
    React.Component<typeof VSCodeDropdown> & HTMLElement
  >(null);
  const languagesDropdownRef = useRef<
    React.Component<typeof VSCodeDropdown> & HTMLElement
  >(null);

  useEffect(() => {
    window.addEventListener('message', (e) => {
      const message = e.data as { command: string };
      if (message.command === 'file-picked') {
        setSelectedFilePath(
          (message as typeof message & { path: string }).path,
        );
      } else if (message.command === 'run-submitted') {
        setWarning('Run submitted successfully.', false);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        problemsDropdownRef.current!.setAttribute('current-value', '-1');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        languagesDropdownRef.current!.setAttribute('current-value', '-1');
        setSelectedFilePath(undefined);

        setIsSubmitting(false);
        setIsReloading(true);
      }
    });
  }, []);

  function handleFileUploadButtonClick() {
    vscode.postMessage({
      command: 'pick-file',
    });
  }

  function handleSubmit() {
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const problem = problemsDropdownRef.current!.getAttribute('current-value')!;
    const language =
      languagesDropdownRef.current!.getAttribute('current-value')!;
    const filePath = selectedFilePath;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    if (problem === '-1' || language === '-1' || filePath === undefined) {
      setWarning('All fields are required.', true);
      return;
    }

    setIsSubmitting(true);

    vscode.postMessage({
      command: 'submit-run',
      problem,
      language,
      filePath,
    });
  }

  return (
    <section id="runs">
      {runs.length === 0 ? (
        <p>No runs available.</p>
      ) : (
        <VSCodeDataGrid>
          <VSCodeDataGridRow rowType="header">
            {['run #', 'time', 'problem', 'language', 'answer', 'file'].map(
              (column, i) => (
                <VSCodeDataGridCell
                  cellType="columnheader"
                  gridColumn={(i + 1).toString()}
                >
                  {column}
                </VSCodeDataGridCell>
              ),
            )}
          </VSCodeDataGridRow>

          {runs.map((run) => (
            <VSCodeDataGridRow>
              <VSCodeDataGridCell gridColumn="1">{run.run}</VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="2">{run.time}</VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="3">
                {run.problem}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="4">
                {run.language}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="5">
                {run.answer.text}
                {run.answer.balloon !== null && (
                  <img
                    src={run.answer.balloon.url}
                    alt={run.answer.balloon.color}
                    title={run.answer.balloon.color}
                    width="15"
                  />
                )}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="6">
                <a href={run.sourcefile.url} onClick={handleDownloadLinkClick}>
                  {run.sourcefile.name}
                </a>
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
          ))}
        </VSCodeDataGrid>
      )}

      <aside className="form-container">
        <h3>Submit new run</h3>

        <form className={isSubmitting ? 'disabled' : ''}>
          <div>
            <label htmlFor="problemsDropdown">Problem</label>
            <VSCodeDropdown
              id="problemsDropdown"
              ref={problemsDropdownRef}
              disabled={isSubmitting}
            >
              <VSCodeOption value="-1">--</VSCodeOption>
              {problemsIds.map((problem) => (
                <VSCodeOption value={problem.id}>{problem.name}</VSCodeOption>
              ))}
            </VSCodeDropdown>
          </div>

          <div>
            <label htmlFor="languagesDropdown">Language</label>
            <VSCodeDropdown
              id="languagesDropdown"
              ref={languagesDropdownRef}
              disabled={isSubmitting}
            >
              <VSCodeOption value="-1">--</VSCodeOption>
              {allowedProgrammingLanguages.map((language) => (
                <VSCodeOption value={language.id}>{language.name}</VSCodeOption>
              ))}
            </VSCodeDropdown>
          </div>

          <div id="fileUploadDiv">
            <VSCodeButton
              onClick={handleFileUploadButtonClick}
              appearance="secondary"
              disabled={isSubmitting}
            >
              Choose file
              <span className="codicon codicon-add"></span>
            </VSCodeButton>

            <span>{selectedFilePath ?? 'No file chosen.'}</span>
          </div>

          {/* previously, event handler `handleSubmit()` was attached to form's `onSubmit`
        and VSCodeButton had attribute `type` set to `submit`, however this was causing
        2 problems — `enter` key press while focusing on upload file button was triggering submit
        and `enter` key press while focusing on submit button was triggering submit twice — ergo,
        `handleSubmit()` was moved to VSCodeButton's `onClick` */}
          <VSCodeButton onClick={handleSubmit} disabled={isSubmitting}>
            Submit
          </VSCodeButton>
        </form>

        <Warning />
      </aside>
    </section>
  );
}

export default RunsSection;
