import * as vscode from 'vscode';

/**
 * There're 3 possible values for the credentials:
 * - undefined: during initial React render when state hasn't been set yet
 * - null: user is not logged in (secrets.get('credentials') === undefined)
 * - object: user is logged in
 */
type credentials =
  | undefined
  | null
  | {
      ip: string;
      username: string;
      password: string;
    };

/**
 *
 * @param throwError must be set to true if the credentials are expected to be stored
 */
async function getCredentials(
  secrets: vscode.SecretStorage,
  throwError?: true,
): Promise<NonNullable<credentials>>;
async function getCredentials(
  secrets: vscode.SecretStorage,
  throwError: false,
): Promise<NonNullable<credentials> | null>;
async function getCredentials(
  secrets: vscode.SecretStorage,
  throwError: boolean = true,
) {
  const credentialsStr = (await secrets.get('credentials')) ?? null;

  if (throwError && credentialsStr === null) {
    throw new Error("there're no credentials stored");
  }

  const credentials =
    credentialsStr !== null
      ? (JSON.parse(credentialsStr) as credentials)
      : null;

  return credentials;
}

export default getCredentials;
export { credentials };
