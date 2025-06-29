import * as vscode from 'vscode';
import { AirCommitsViewProvider } from './AirCommitsView';
import { AirCommitsService } from './AirCommitsService';
import { SUPABASE_URL } from './config';

export function activate(context: vscode.ExtensionContext) {
	console.log(`AirCommits extension activated.`);

	const service = new AirCommitsService();
	const provider = new AirCommitsViewProvider(context.extensionUri, service);

	// Initialize service
	service.initialize(context);

	console.log(`Registering webview view provider with ID: ${AirCommitsViewProvider.viewType}`);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(AirCommitsViewProvider.viewType, provider));

	// Register commands
	context.subscriptions.push(vscode.commands.registerCommand('aircommits.login', async () => {
		vscode.env.openExternal(vscode.Uri.parse(`${SUPABASE_URL}/functions/v1/auth-github?schema=${vscode.env.uriScheme}`));
	}));

	context.subscriptions.push(vscode.commands.registerCommand('aircommits.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'aircommits');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('aircommits.openFeed', () => {
		vscode.commands.executeCommand('workbench.view.extension.aircommits-sidebar');
	}));

	// Handle file save events to send signals
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(async (document) => {
			// Only send signals for user files, not extension files
			if (document.uri.scheme === 'file' && !document.uri.fsPath.includes('node_modules')) {
				// Check if auto-publish is enabled
				const config = vscode.workspace.getConfiguration('aircommits');
				const autoPublish = config.get('autoPublish', true);
				
				if (!autoPublish) {
					console.log('Auto-publish is disabled, skipping signal');
					return;
				}
				
				try {
					const success = await service.sendSignal();
					if (success) {
						console.log('Signal sent successfully for file save');
						const signals = await service.getSignals();
						provider.postMessage({ type: 'signals', data: signals });
					}
				} catch (error) {
					console.error('Error sending signal on file save:', error);
				}
			}
		})
	);

	// Handle URI callbacks for GitHub OAuth
	context.subscriptions.push(vscode.window.registerUriHandler({
		handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
			if (uri.path === '/auth/callback') {
				const query = new URLSearchParams(uri.query);
				const token = query.get('token');
				if (token) {
					service.setToken(token, context);
					vscode.window.showInformationMessage('Successfully logged in to AirCommits!');
					provider.postMessage({ type: 'loggedIn' });
				} else {
					vscode.window.showErrorMessage('Failed to log in to AirCommits.');
				}
			}
		}
	}));

	// Listen for messages from the webview
	provider.onDidReceiveMessage(async (message: any) => {
		switch (message.type) {
			case 'login':
				vscode.commands.executeCommand('aircommits.login');
				return;
			case 'getSignals':
				const signals = await service.getSignals(message.filters);
				provider.postMessage({ type: 'signals', data: signals });
				return;
			case 'sendSignal':
				const success = await service.sendSignal(message.airport, message.flight, message.message);
				provider.postMessage({ type: 'signalSent', success });
				return;
			case 'getCurrentUser':
				const user = await service.getCurrentUser();
				provider.postMessage({ type: 'currentUser', data: user });
				return;
			case 'searchAirports':
				const airports = await service.searchAirports(message.query);
				provider.postMessage({ type: 'airportSearchResults', data: airports });
				return;
			case 'getCurrentLocation':
				try {
					const location = await service.getLocation();
					if (location) {
						const airport = await service.detectAirport(location);
						provider.postMessage({ 
							type: 'currentLocation', 
							data: { location, airport } 
						});
					} else {
						provider.postMessage({ type: 'currentLocation', data: null });
					}
				} catch (error) {
					console.error('Error getting current location:', error);
					provider.postMessage({ type: 'currentLocation', data: null });
				}
				return;
			case 'saveSettings':
				const config = vscode.workspace.getConfiguration('aircommits');
				await config.update('autoDetectLocation', message.settings.autoDetectLocation, vscode.ConfigurationTarget.Global);
				await config.update('manualAirport', message.settings.manualAirport, vscode.ConfigurationTarget.Global);
				await config.update('manualFlight', message.settings.manualFlight, vscode.ConfigurationTarget.Global);
				await config.update('autoPublish', message.settings.autoPublish, vscode.ConfigurationTarget.Global);
				provider.postMessage({ type: 'settingsSaved' });
				return;
			case 'getSettings':
				const currentConfig = vscode.workspace.getConfiguration('aircommits');
				provider.postMessage({ 
					type: 'settings', 
					data: {
						autoDetectLocation: currentConfig.get('autoDetectLocation', true),
						manualAirport: currentConfig.get('manualAirport', ''),
						manualFlight: currentConfig.get('manualFlight', ''),
						autoPublish: currentConfig.get('autoPublish', true)
					}
				});
				return;
			case 'logout':
				await context.secrets.delete('aircommits.token');
				provider.postMessage({ type: 'loggedOut' });
				vscode.window.showInformationMessage('Logged out from AirCommits');
				return;
			case 'getUserSignals':
				const userSignals = await service.getUserSignals();
				provider.postMessage({ type: 'userSignals', data: userSignals });
				return;
			case 'deleteSignal':
				const deleteSuccess = await service.deleteSignal(message.signalId);
				provider.postMessage({ type: 'signalDeleted', success: deleteSuccess });
				return;
		}
	});
}

export function deactivate() {}
