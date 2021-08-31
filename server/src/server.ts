/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection, TextDocuments, ProposedFeatures, TextDocumentSyncKind, Diagnostic
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { CompilationResult, compileFile, executeScript, getCompletion, getTokenInfo } from './bridge';


// Creates the LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create a manager for open text documents
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// The workspace folder this server is operating on
let workspaceFolder: string | null;

connection.onInitialize((params) => {
	workspaceFolder = params.rootUri;
	connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Started and initialize received`);
	return {
		capabilities: {
			textDocumentSync: {
				openClose: true,
				change: TextDocumentSyncKind.Full
			},
			completionProvider: {
				triggerCharacters: ['.',',','\n','(','!','[',':']
			},
			hoverProvider: true,
			definitionProvider: true
		}
	};
});


documents.onDidOpen((event) => {
	connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Document opened: ${event.document.uri}`);
});

const compiled: {[uri: string]: CompilationResult} = {}

documents.onDidChangeContent(e=>{
	connection.console.log('compiling script ' + e.document.uri)
	let diagnostics: Diagnostic[] = []
	let res = compileFile(e.document, diagnostics);
	compiled[e.document.uri] = res
	connection.console.log(diagnostics.length + ' errors found')
	connection.sendDiagnostics({uri: e.document.uri, diagnostics})
});

documents.listen(connection);

connection.onCompletion((params)=>{
	connection.console.log('completing')
	let doc = documents.get(params.textDocument.uri)
	return getCompletion(params.position, doc)
});

connection.onHover((params)=>{
	let res = compiled[params.textDocument.uri]
	if (res) {
		let info = getTokenInfo(params.position, res);
		return info?.hover
	}
})

connection.onDefinition((params)=>{
	let res = compiled[params.textDocument.uri]
	if (res) {
		let info = getTokenInfo(params.position, res);
		return info?.definition
	}
})

connection.onNotification('execute-script',(uri)=>{
	let res = compiled[uri]
	if (res) {
		if (res.ast.valid) {
			let start = new Date()
			executeScript(res.ast)
			let elapsed = new Date().getTime() - start.getTime()
			connection.window.showInformationMessage('Done execution in ' + elapsed + 'ms')
		} else {
			connection.window.showErrorMessage('Cannot execute a script with errors!')
		}
	} else {
		connection.window.showErrorMessage('document ' + uri + ' not found!')
	}
})

connection.listen();