
import * as vscode from 'vscode';
import { AirCommitsViewProvider } from './AirCommitsView';

export function activate(context: vscode.ExtensionContext) {

	console.log(`AirCommits extension activated.`);

	const provider = new AirCommitsViewProvider(context.extensionUri);

	console.log(`Registering webview view provider with ID: ${AirCommitsViewProvider.viewType}`);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(AirCommitsViewProvider.viewType, provider));

	context.subscriptions.push(vscode.commands.registerCommand('aircommits.login', async () => {
		// The webview will send a message to trigger this
		vscode.env.openExternal(vscode.Uri.parse('http://localhost:3001/auth/github'));
	}));

	

	context.subscriptions.push(vscode.window.registerUriHandler({
		handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
			console.log('received url', uri)
			if (uri.path === '/auth/callback') {
				const query = new URLSearchParams(uri.query);
				const token = query.get('token');
				if (token) {
					// Store the token securely
					context.secrets.store('aircommits.token', token);
					vscode.window.showInformationMessage('Successfully logged in!');
					provider.postMessage({ type: 'loggedIn' });
				} else {
					vscode.window.showErrorMessage('Failed to log in.');
				}
			}
		}
	}));

	// Listen for messages from the webview
	provider.onDidReceiveMessage((message: any) => {
		switch (message.type) {
			case 'login':
				vscode.commands.executeCommand('aircommits.login');
				return;
		}
	});
}

export function deactivate() {}
