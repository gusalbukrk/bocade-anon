import * as vscode from 'vscode';

// there're 3 possible values for the credentials:
// - undefined: during initial React render when state hasn't been set yet
// - null: user is not logged in (globalState.get('credentials') === undefined)
// - object: user is logged
type credentials =
  | undefined
  | null
  | {
      ip: string;
      username: string;
      password: string;
    };

// this function is ran with throwError set to true in
// places where it's expected to have credentials stored
function getCredentials(
  globalState: vscode.Memento,
  throwError: boolean = true,
) {
  const credentials = globalState.get<credentials>('credentials', null);

  if (throwError && credentials === null) {
    throw new Error("there're no credentials stored");
  }

  return credentials;
}

export default getCredentials;
export { credentials };
