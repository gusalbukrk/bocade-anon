import React from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
} from '@vscode/webview-ui-toolkit/react';

import { runs } from '../../utils/getData.js';

function RunsTable({
  runs,
  handleDownloadLinkClick,
}: {
  runs: runs;
  handleDownloadLinkClick: (
    e: React.MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement },
  ) => void;
}) {
  return (
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
          <VSCodeDataGridCell gridColumn="3">{run.problem}</VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="4">{run.language}</VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="5">{run.answer}</VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="6">
            <a href={run.file.href ?? ''} onClick={handleDownloadLinkClick}>
              {run.file.name}
            </a>
          </VSCodeDataGridCell>
        </VSCodeDataGridRow>
      ))}
    </VSCodeDataGrid>
  );
}

export default RunsTable;
