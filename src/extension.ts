import * as vscode from 'vscode';
import BocaTeamDashboard from './panels/BocaTeamDashboard';

export async function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand(
    'boca-team-dashboard.open',
    () => {
      BocaTeamDashboard.render(context.extensionUri, context.secrets);
    },
  );

  context.subscriptions.push(command);

  await vscode.commands.executeCommand('boca-team-dashboard.open');
}

export function deactivate() {}
