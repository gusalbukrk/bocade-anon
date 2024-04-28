import * as vscode from 'vscode';

const organize = async () => {
  await vscode.commands.executeCommand('testCasesView.focus');

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

      await vscode.commands.executeCommand('workbench.action.focusLeftGroup');

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
};

export default organize;
