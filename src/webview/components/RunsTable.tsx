import React, { useEffect } from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeButton,
} from '@vscode/webview-ui-toolkit/react';

import { allowedProgrammingLanguages, runs } from '../../utils/getData.js';

function RunsTable({
  runs,
  problemsNames,
  allowedProgrammingLanguages,
  handleDownloadLinkClick,
  vscode,
}: {
  runs: runs;
  problemsNames: string[];
  allowedProgrammingLanguages: allowedProgrammingLanguages;
  handleDownloadLinkClick: (
    e: React.MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement },
  ) => void;
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) {
  const [selectedFilePath, setSelectedFilePath] = React.useState<string>();

  useEffect(() => {
    window.addEventListener('message', (e) => {
      const message = e.data as { command: string; path: string };
      if (message.command === 'picked-file') {
        setSelectedFilePath(message.path);
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

    const form = e.target as HTMLFormElement;
    const problem = form
      .querySelector('#problemsDropdown')
      ?.getAttribute('current-value');
    const language = form
      .querySelector('#languagesDropdown')
      ?.getAttribute('current-value');
    const filePath = selectedFilePath;

    vscode.postMessage({
      command: 'runs-submit',
      problem,
      language,
      filePath,
    });
  }

  return (
    <>
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
            <VSCodeDataGridCell gridColumn="5">{run.answer}</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="6">
              <a href={run.file.href ?? ''} onClick={handleDownloadLinkClick}>
                {run.file.name}
              </a>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>
        ))}
      </VSCodeDataGrid>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="problemsDropdown">Problem:</label>
          <VSCodeDropdown id="problemsDropdown">
            <VSCodeOption value="-1">--</VSCodeOption>
            {problemsNames.map((problem, i) => (
              <VSCodeOption value={(i + 1).toString()}>{problem}</VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>

        <div>
          <label htmlFor="languagesDropdown">Language:</label>
          <VSCodeDropdown id="languagesDropdown">
            {allowedProgrammingLanguages.map((language) => (
              <VSCodeOption value={language.id ?? ''}>
                {language.name}
              </VSCodeOption>
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
    </>
  );
}

export default RunsTable;
