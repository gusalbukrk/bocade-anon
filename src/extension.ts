import * as vscode from 'vscode';
import BocaTeamDashboard from './panels/BocaTeamDashboard';

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand(
    'boca-team-dashboard.open',
    () => {
      BocaTeamDashboard.render(context.extensionUri, context.secrets);
    },
  );

  context.subscriptions.push(command);
}

export function deactivate() {}
