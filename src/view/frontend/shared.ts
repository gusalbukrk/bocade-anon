import { testCases } from '../shared.js';

export const generateWarning = (testCases: testCases) =>
  testCases.length === 0
    ? undefined
    : `${testCases.filter((tc) => tc.error === '' && tc.expectedOutput === tc.output).length}/${testCases.length} tests passed`;
