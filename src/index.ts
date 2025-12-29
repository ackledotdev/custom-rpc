import { Client } from '@xhayper/discord-rpc';
import { watch } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'jsonc-parser';

const ConfigPath = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'config.jsonc'
);

let Config: Cfg | null = await readConfig();

if (Config === null) {
	console.log(
		'Configuration file is missing or empty. Startup config must exist.'
	);
	process.exit(1);
}

if (!Config.applicationId) {
	console.log('Application ID is missing in the configuration file.');
	process.exit(1);
}

let paused = false;
let connected = false;

const client = new Client({
	transport: { type: 'ipc' },
	clientId: Config.applicationId,
});

if (process.argv.includes('watch')) {
	watch(ConfigPath, refreshConfig)
		.on('error', (err) => console.log('File watcher error:', err))
		.on('close', () => console.log('File watcher closed.'));
	console.log('Watching configuration file for changes...');
}

await client.login();
connected = true;
console.log('Logged in');

let lastRefreshTime = Math.floor(Date.now() / 1000);

if (Config !== null)
	await client.user!.setActivity({
		...Config,
		startTimestamp:
			Config.manualTime ??
			(Config.manualDuration
				? lastRefreshTime - Config.manualDuration
				: lastRefreshTime),
	});

//#region all the signal handlers, because why not
process.on('SIGABRT', exit);
process.on('SIGALRM', exit);
process.on('SIGBREAK', exit);
process.on('SIGBUS', exit);

process.on('SIGCONT', resume);

process.on('SIGEMT', exit);
process.on('SIGFPE', exit);
process.on('SIGHUP', exit);
process.on('SIGILL', exit);
process.on('SIGINFO', exit);
process.on('SIGINT', exit);
process.on('SIGIO', exit);
process.on('SIGIOT', exit);
// process.on('SIGKILL', exit); // cannot be caught
process.on('SIGLOST', exit);
process.on('SIGPIPE', exit);
process.on('SIGPOLL', exit);
process.on('SIGPROF', exit);
process.on('SIGPWR', exit);
process.on('SIGQUIT', exit);
process.on('SIGSEGV', exit);
process.on('SIGSTKFLT', exit);

// process.on('SIGSTOP', pause); // cannot be caught
process.on('SIGTSTP', pause);

process.on('SIGSYS', exit);
process.on('SIGTERM', exit);
process.on('SIGTRAP', exit);

process.on('SIGTTIN', pause);
process.on('SIGTTOU', pause);

process.on('SIGUNUSED', exit);
process.on('SIGUSR1', exit);
process.on('SIGUSR2', exit);
process.on('SIGVTALRM', exit);
process.on('SIGWINCH', exit);
process.on('SIGXCPU', exit);
process.on('SIGXFSZ', exit);
//#endregion

process.stdin.resume();
console.log('Process is running. Press Ctrl+C to exit.');

async function exit() {
	await client.destroy();
	connected = false;
	console.log('\nDisconnected');
	process.exit(0);
}

async function pause() {
	paused = true;
	if (connected) {
		await client.destroy();
		connected = false;
	}
	console.log('Disconnected and paused.');
}

async function resume() {
	if (Config !== null) {
		if (!connected) {
			await client.connect();
			connected = true;
		}
		await client.user!.setActivity({
			...Config,
			startTimestamp:
				Config.manualTime ??
				(Config.manualDuration
					? Math.floor(Date.now() / 1000) - Config.manualDuration
					: lastRefreshTime),
		});
	}
	console.log('Activity restored. Resumed.');
	paused = false;
}

async function refreshConfig() {
	console.log('Configuration file changed. Reloading...');

	if (paused) return console.log('Currently paused. Skipping activity update.');

	Config = await readConfig();

	if (Config === null || Object.keys(Config).length === 0) {
		console.log(
			'Failed to read new configuration, or it is empty. Disconnecting.'
		);
		if (connected) {
			await client.destroy();
			connected = false;
		}
		return;
	}

	if (Config.refreshTime) lastRefreshTime = Math.floor(Date.now() / 1000);

	if (!connected) {
		await client.connect();
		connected = true;
	}

	await client.user!.setActivity({
		...Config,
		startTimestamp:
			Config.manualTime ??
			(Config.manualDuration
				? Math.floor(Date.now() / 1000) - Config.manualDuration
				: Config.refreshTime
					? Math.floor(Date.now() / 1000)
					: lastRefreshTime),
	});
	console.log('Configuration reloaded and activity updated.');
}

interface Cfg {
	applicationId: string;

	type?: number;
	name: string;
	details?: string;
	state?: string;

	largeImageKey?: string;
	largeImageText?: string;
	smallImageKey?: string;
	smallImageText?: string;

	refreshTime: boolean;
	manualTime?: number;
	manualDuration?: number;
}

async function readConfig(): Promise<Cfg | null> {
	const data = await readFile(ConfigPath, 'utf-8').catch((err) => {
		console.log(`Error reading config file at ${ConfigPath}:`, err);
		return null;
	});
	if (data === null) return null;
	// Intentional use of ||
	const parsed = parse(data || '{}', undefined, {
		allowEmptyContent: true,
		allowTrailingComma: true,
		disallowComments: false,
	}) as Cfg;
	return parsed && Object.keys(parsed).length > 0
		? ({ ...parsed, refreshTime: parsed.refreshTime ?? true } as Cfg)
		: null;
}
