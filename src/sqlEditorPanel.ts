import * as vscode from 'vscode';
import { DuckDBClient } from './duckdbClient';

export class SqlEditorPanel {
    public static currentPanel: SqlEditorPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    // ここで実際に SQL を実行
    public async runQuery(sql: string) {
        const client = new DuckDBClient();
        try {
            const result = await client.execute(sql);
            // 実行結果を Webview に送信
            this._panel.webview.postMessage({ command: 'queryResult', result });
        } catch (err: any) {
            this._panel.webview.postMessage({ command: 'queryError', message: err.message });
        }
    }

    public static createOrShow(extensionUri: vscode.Uri, initialQuery?: string) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // 既にパネルが存在する場合
        if (SqlEditorPanel.currentPanel) {
            SqlEditorPanel.currentPanel._panel.reveal(column);
            // initialQuery があれば実行
            if (initialQuery) {
                SqlEditorPanel.currentPanel.runQuery(initialQuery);
            }
            return;
        }

        // 新しいパネルを作成
        const panel = vscode.window.createWebviewPanel(
            'sqlEditor',
            'DuckDB SQL Editor',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        SqlEditorPanel.currentPanel = new SqlEditorPanel(panel, extensionUri);

        // パネル生成直後にもクエリを実行したい場合
        if (initialQuery) {
			SqlEditorPanel.currentPanel.setEditorValue(initialQuery);
            SqlEditorPanel.currentPanel.runQuery(initialQuery);
        }
    }
	
    public setEditorValue(sql: string) {
        // Webview に対して「エディタの内容を更新」メッセージを送る
        this._panel.webview.postMessage({ command: 'setEditorValue', sql });
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // WebviewのHTML
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

        // Webviewからのメッセージ受信（ユーザーがエディタから実行ボタンを押した場合）
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'executeQuery':
                        const sql = message.sql;
                        this.runQuery(sql);
                        break;
                }
            },
            undefined,
            this._disposables
        );

        // パネルのdispose時のクリーンアップ
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public dispose() {
        SqlEditorPanel.currentPanel = undefined;

        // すべてのディスポーザブルを破棄
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // シンプルなHTMLを返す
        return /* html */ `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>DuckDB SQL Editor</title>
  <!-- CodeMirror のCSS -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.css" />
  <style>
    body { font-family: sans-serif; margin: 0; padding: 10px; }
    #editor { height: 150px; border: 1px solid #ccc; }
    #result { margin-top: 20px; }
    /* CodeMirror の生成するエディタに下部の余白を追加 */
    .CodeMirror { 
    	height: auto;
    	min-height: 150px;
	}
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
    button { margin-top: 10px; padding: 5px 10px; }
  </style>
</head>
<body>
  <h2>DuckDB SQL Editor</h2>
  <div id="editor"></div>
  <button id="executeBtn">実行</button>
  <div id="result"></div>

  <!-- CodeMirror 本体 -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/codemirror.min.js"></script>
  <!-- SQL用モード -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.5/mode/sql/sql.min.js"></script>
  <script>
    const vscode = acquireVsCodeApi();
    // クエリ実行関数
    function executeQuery() {
      const sql = editor.getValue();
      vscode.postMessage({ command: 'executeQuery', sql });
    }

    // CodeMirrorエディタの初期化、extraKeysでCmd+Enter/Ctrl+Enterを設定
    const editor = CodeMirror(document.getElementById('editor'), {
      mode: 'text/x-sql',
      lineNumbers: true,
      value: "select * from 'data/sample.csv';",
      extraKeys: {
        "Cmd-Enter": executeQuery,
        "Ctrl-Enter": executeQuery
      }
    });

    document.getElementById('executeBtn').addEventListener('click', executeQuery);

	window.addEventListener('message', event => {
		const message = event.data;
		const resultDiv = document.getElementById('result');
		switch (message.command) {
			case 'queryResult':
				const result = message.result;
				let html = '<h3>クエリ結果</h3>';
				html += '<table>';
				html += '<tr>' + result.columns.map(col => '<th>' + col + '</th>').join('') + '</tr>';
				result.rows.forEach(row => {
					html += '<tr>' + row.map(cell => '<td>' + cell + '</td>').join('') + '</tr>';
				});
				html += '</table>';
				resultDiv.innerHTML = html;
				break;
			case 'queryError':
				resultDiv.innerHTML = '<span style="color:red;">' + message.message + '</span>';
				break;
			case 'setEditorValue':
				// エディタの内容を更新
				editor.setValue(message.sql);
				break;
		}
	});
  </script>
</body>
</html>
        `;
    }
}