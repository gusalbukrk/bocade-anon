import React from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
} from '@vscode/webview-ui-toolkit/react';

import { clarifications } from '../../utils/getData.js';

function ClarificationsTable({
  clarifications,
}: {
  clarifications: clarifications;
}) {
  return clarifications.length === 0 ? (
    <p>No clarifications available.</p>
  ) : (
    <VSCodeDataGrid>
      <VSCodeDataGridRow
        rowType="header"
        style={{ textTransform: 'capitalize' }}
      >
        {['time', 'problem', 'question', 'answer'].map((column, i) => (
          <VSCodeDataGridCell
            cellType="columnheader"
            gridColumn={(i + 1).toString()}
          >
            {column}
          </VSCodeDataGridCell>
        ))}
      </VSCodeDataGridRow>

      {clarifications.map((clarification) => (
        <VSCodeDataGridRow>
          <VSCodeDataGridCell gridColumn="1">
            {clarification.time}
          </VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="2">
            {clarification.problem}
          </VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="3">
            {clarification.question}
          </VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="4">
            {clarification.answer}
          </VSCodeDataGridCell>
        </VSCodeDataGridRow>
      ))}
    </VSCodeDataGrid>
  );
}

export default ClarificationsTable;
