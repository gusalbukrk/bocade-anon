import * as vscode from 'vscode';
import BocaTeamDashboard from './panels/BocaTeamDashboard';

export async function activate(context: vscode.ExtensionContext) {
  const openCommand = vscode.commands.registerCommand(
    'boca-team-dashboard.open',
    () => {
      BocaTeamDashboard.render(context.extensionUri, context.secrets);
    },
  );
  context.subscriptions.push(openCommand);

  const organizeCommand = vscode.commands.registerCommand(
    'boca-team-dashboard.organize',
    async () => {
      await vscode.commands.executeCommand('workbench.action.joinAllGroups');

      // if there's no or only one editor, no need to organize
      // (also, `workbench.action.moveEditorToRightGroup` command won't work if there's only one
      // editor because empty editor groups are automatically removed)
      if (vscode.window.tabGroups.activeTabGroup.tabs.length <= 1) {
        return;
      }

      // navigate to the leftmost editor
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const leftMostEditorLabel =
          vscode.window.tabGroups.activeTabGroup.tabs[0].label;
        const currentEditorLabel =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          vscode.window.tabGroups.activeTabGroup.activeTab!.label;

        if (leftMostEditorLabel === currentEditorLabel) {
          break;
        }

        await vscode.commands.executeCommand('workbench.action.previousEditor');
      }

      // place the Boca Team Dashboard and PDFs on the right editor group,
      // anything else goes on the left editor group
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const currentEditorLabel =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          vscode.window.tabGroups.activeTabGroup.activeTab!.label;

        if (
          currentEditorLabel === 'BOCA Team Dashboard' ||
          /\.pdf$/.test(currentEditorLabel)
        ) {
          await vscode.commands.executeCommand(
            'workbench.action.moveEditorToRightGroup',
          );

          // if condition is true, it means that the previous command moved the last editor on the
          // left editor group to the right editor group; the left group editor consequently became
          // empty and it was removed (which is the default behavior for empty editor groups)
          if (vscode.window.tabGroups.all.length === 1) {
            break;
          }

          await vscode.commands.executeCommand(
            'workbench.action.focusLeftGroup',
          );

          if (vscode.window.tabGroups.activeTabGroup.activeTab === undefined) {
            break;
          }
        } else {
          const rightMostEditorGroupLabel =
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            vscode.window.tabGroups.activeTabGroup.tabs.at(-1)!.label;

          if (currentEditorLabel === rightMostEditorGroupLabel) {
            break;
          }

          await vscode.commands.executeCommand('workbench.action.nextEditor');
        }
      }
    },
  );
  context.subscriptions.push(organizeCommand);

  await vscode.commands.executeCommand('boca-team-dashboard.open');

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    -100, // lower means more to the right
  );
  statusBarItem.text = '$(split-horizontal)  Organize';
  statusBarItem.name = 'BOCA Team Dashboard – Organize tabs';
  statusBarItem.command = 'boca-team-dashboard.organize';
  statusBarItem.tooltip = 'BOCA Team Dashboard – Organize tabs';
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    'statusBarItem.warningBackground',
  );
  statusBarItem.show();
}

export function deactivate() {}
