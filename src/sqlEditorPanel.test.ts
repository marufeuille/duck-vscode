import { SqlEditorPanel } from './sqlEditorPanel';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

describe('SqlEditorPanel', () => {
    let createWebviewPanelStub: sinon.SinonStub;

    beforeEach(() => {
        createWebviewPanelStub = sinon.stub(vscode.window, 'createWebviewPanel').returns({
            webview: {
                onDidReceiveMessage: sinon.stub(), // モックするメソッド
                postMessage: sinon.stub(), // 必要に応じて他のメソッドもモック
            },
            reveal: sinon.stub(),
            onDidDispose: sinon.stub(),
            dispose: sinon.stub()
        } as any);
    });

    afterEach(() => {
        createWebviewPanelStub.restore();
    });

    it('should create a new webview panel', () => {
        SqlEditorPanel.createOrShow(vscode.Uri.parse('file://test'));
        sinon.assert.calledOnce(createWebviewPanelStub);
    });

    // 他のテストケースを追加
});
