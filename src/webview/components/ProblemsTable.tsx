import React from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
} from '@vscode/webview-ui-toolkit/react';

import { problems } from '../../utils/getData.js';

function ProblemsTable({
  problems,
  handleDownloadLinkClick,
}: {
  problems: problems;
  handleDownloadLinkClick: (
    e: React.MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement },
  ) => void;
}) {
  return problems.length === 0 ? (
    <p>No problems available yet.</p>
  ) : (
    <VSCodeDataGrid>
      <VSCodeDataGridRow
        rowType="header"
        style={{ textTransform: 'capitalize' }}
      >
        {['balloon', 'name', 'basename', 'fullname', 'descfile'].map(
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

      {problems.map((problem) => (
        <VSCodeDataGridRow>
          <VSCodeDataGridCell gridColumn="1">
            <img
              width="20"
              src={problem.balloon ?? ''}
              alt={problem.color ?? ''}
            />
          </VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="2">{problem.name}</VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="3">
            {problem.basename}
          </VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="4">
            {problem.fullname}
          </VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="5">
            <a
              href={problem.descfile.href ?? ''}
              onClick={handleDownloadLinkClick}
            >
              {problem.descfile.name}
            </a>
          </VSCodeDataGridCell>
        </VSCodeDataGridRow>
      ))}
    </VSCodeDataGrid>
  );
}

export default ProblemsTable;
