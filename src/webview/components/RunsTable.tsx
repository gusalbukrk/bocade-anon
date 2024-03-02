import React, { Component, useEffect } from 'react';
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
} from '../../utils/getData.js';

function RunsTable({
  runs,
  problemsIds,
  allowedProgrammingLanguages,
  handleDownloadLinkClick,
  vscode,
}: {
  runs: runs;
  problemsIds: problemsIds;
  allowedProgrammingLanguages: allowedProgrammingLanguages;
  handleDownloadLinkClick: (
    e: React.MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement },
  ) => void;
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) {
  const [selectedFilePath, setSelectedFilePath] = React.useState<string>();
  const [warning, setWarning] = React.useState('');
  const timeoutIDRef = React.useRef<NodeJS.Timeout>();

  // refs typing doesn't includes all available properties out-of-the-box
  // https://github.com/microsoft/fast/issues/6909
  const problemsDropdownRef = React.useRef<
    Component<typeof VSCodeDropdown> & HTMLElement
  >(null);
  const languagesDropdownRef = React.useRef<
    Component<typeof VSCodeDropdown> & HTMLElement
  >(null);

  useEffect(() => {
    window.addEventListener('message', (e) => {
      const message = e.data as { command: string };
      if (message.command === 'picked-file') {
        setSelectedFilePath(
          (message as typeof message & { path: string }).path,
        );
      } else if (message.command === 'runs-submitted') {
        setWarning('Run submitted successfully.');
        timeoutIDRef.current = setTimeout(() => {
          setWarning('');
        }, 10000);
      }
    });
  }, []);

  function handleFileUploadButtonClick() {
    vscode.postMessage({
      command: 'pick-file',
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (timeoutIDRef.current !== undefined) {
      clearTimeout(timeoutIDRef.current);
    }
    setWarning('');

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const problem = problemsDropdownRef.current!.getAttribute('current-value')!;
    const language =
      languagesDropdownRef.current!.getAttribute('current-value')!;
    const filePath = selectedFilePath;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    if (problem === '-1' || language === '-1' || filePath === undefined) {
      setWarning('All fields are required.');
      timeoutIDRef.current = setTimeout(() => {
        setWarning('');
      }, 10000);
      return;
    }

    vscode.postMessage({
      command: 'runs-submit',
      problem,
      language,
      filePath,
    });
  }

  return (
    <>
      {runs.length === 0 ? (
        <p>No runs available.</p>
      ) : (
        <VSCodeDataGrid>
          <VSCodeDataGridRow
            rowType="header"
            style={{ textTransform: 'capitalize' }}
          >
            {['run', 'time', 'problem', 'language', 'answer', 'file'].map(
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
                {run.answer}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="6">
                <a href={run.file.href} onClick={handleDownloadLinkClick}>
                  {run.file.name}
                </a>
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
          ))}
        </VSCodeDataGrid>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="problemsDropdown">Problem:</label>
          <VSCodeDropdown id="problemsDropdown" ref={problemsDropdownRef}>
            <VSCodeOption value="-1">--</VSCodeOption>
            {problemsIds.map((problem) => (
              <VSCodeOption value={problem.id}>{problem.name}</VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>

        <div>
          <label htmlFor="languagesDropdown">Language:</label>
          <VSCodeDropdown id="languagesDropdown" ref={languagesDropdownRef}>
            <VSCodeOption value="-1">--</VSCodeOption>
            {allowedProgrammingLanguages.map((language) => (
              <VSCodeOption value={language.id}>{language.name}</VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>

        <VSCodeButton
          onClick={handleFileUploadButtonClick}
          style={{ width: '120px' }}
        >
          Choose file
          <span className="codicon codicon-add"></span>
        </VSCodeButton>

        <span>{selectedFilePath ?? 'No file chosen.'}</span>

        <VSCodeButton type="submit">Submit</VSCodeButton>
      </form>

      <p>{warning}</p>
    </>
  );
}

export default RunsTable;
