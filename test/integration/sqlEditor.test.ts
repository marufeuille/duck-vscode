import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('SQL Editor Integration Tests', () => {
  const testFilePath = path.resolve(__dirname, 'test.sql');
  const csvFilePath = path.resolve(__dirname, 'data/sample.csv');
  const csvContent = 'id,name\n1,John Doe\n2,Jane Doe';

  suiteSetup(() => {
    // テスト用のCSVファイルを作成
    fs.mkdirSync(path.dirname(csvFilePath), { recursive: true });
    fs.writeFileSync(csvFilePath, csvContent, 'utf8');

    // 絶対パスを使用してSQLファイルを作成
    const testContent = `SELECT * FROM '${csvFilePath.replace(/\\/g, '\\\\')}';`;
    fs.writeFileSync(testFilePath, testContent, 'utf8');
  });

  suiteTeardown(() => {
    // テスト用のSQLファイルとCSVファイルを削除
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(csvFilePath)) {
      fs.unlinkSync(csvFilePath);
    }
  });

  test('Should open and read an existing SQL file', async () => {
    const document = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(document);

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Editor should be active');
    assert.strictEqual(editor.document.getText(), `SELECT * FROM '${csvFilePath.replace(/\\/g, '\\\\')}';`, 'File content should match');
  });
// FIXME
//  test('Should execute SQL correctly using extension command', async () => {
//    console.log(testFilePath);
//    let document: vscode.TextDocument;
//
//    try {
//        document = await vscode.workspace.openTextDocument(testFilePath);
//        console.log('Document opened:', document);
//    } catch (error) {
//        console.error('Error opening document:', error);
//        return;
//    }
//
//    try {
//        await vscode.window.showTextDocument(document);
//        console.log('Document shown:', document);
//    } catch (error) {
//        console.error('Error showing document:', error);
//        return;
//    }
//
//    // コマンドを使用してSQLを実行
//    const result = await vscode.commands.executeCommand('extension.runSqlFileInDuckDB', document.uri);
//    console.log('SQL execution result:', result);
//    assert.ok(result, 'SQL execution should return a result');
//    // 結果の検証
//    // ここで、拡張機能が返す結果を検証します。
//    // 例えば、結果が期待通りの行数や内容であることを確認します。
//    // 具体的な検証は、モックされたデータや実際のデータを使用して行います。
//  });

  test('Should save the edited SQL file', async () => {
    const document = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(document);

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Editor should be active');

    const newContent = "SELECT * FROM 'data/another_sample.csv';";
    await editor.edit(editBuilder => {
      editBuilder.replace(new vscode.Range(0, 0, editor.document.lineCount, 0), newContent);
    });

    await document.save();

    const savedContent = fs.readFileSync(testFilePath, 'utf8');
    assert.strictEqual(savedContent, newContent, 'File content should be updated');
  });
});
