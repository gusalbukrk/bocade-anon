export type testCases = {
  input: string;
  expectedOutput: string;
  output: string;
  error: string;
}[];

export const sourceCodeExtensions = [
  'c',
  'cpp',
  'cc',
  'java',
  'py',
  'py2',
  'py3',
  'js',
  'cjs',
  'mjs',
] as const;

export type sourceCodeExtension = (typeof sourceCodeExtensions)[number];
