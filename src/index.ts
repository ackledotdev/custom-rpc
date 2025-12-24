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

let Config: Cfg = await readConfig();

let paused = false;

const client = new Client({
	transport: { type: 'ipc' },
	clientId: Config.applicationId,
});

await client.login();
console.log('Logged in');

const firstTime = Math.floor(Date.now() / 1000);

await client.user!.setActivity({
	...Config,
	startTimestamp:
		Config.manualTime ??
		(Config.manualDuration ? firstTime - Config.manualDuration : firstTime),
});

process.stdin.resume();
console.log('Process is running. Press Ctrl+C to exit.');

if (process.argv.includes('watch')) {
	watch(ConfigPath, refreshConfig);
	console.log('Watching configuration file for changes...');
}

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
process.on('SIGKILL', exit);
process.on('SIGLOST', exit);
process.on('SIGPIPE', exit);
process.on('SIGPOLL', exit);
process.on('SIGPROF', exit);
process.on('SIGPWR', exit);
process.on('SIGQUIT', exit);
process.on('SIGSEGV', exit);
process.on('SIGSTKFLT', exit);

process.on('SIGSTOP', pause);
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

async function exit() {
	await client.destroy();
	console.log('\nDisconnected');
	process.exit(0);
}

async function pause() {
	paused = true;
	await client.user!.clearActivity();
	console.log('Activity cleared. Paused.');
}

async function resume() {
	await client.user!.setActivity({
		...Config,
		startTimestamp:
			Config.manualTime ??
			(Config.manualDuration
				? Math.floor(Date.now() / 1000) - Config.manualDuration
				: firstTime),
	});
	console.log('Activity restored. Resumed.');
	paused = false;
}

async function refreshConfig() {
	console.log('Configuration file changed. Reloading...');

	if (paused) {
		console.log('Currently paused. Skipping activity update.');
		return;
	}

	let NewConfig = await readConfig();
	Config = NewConfig as unknown as Cfg;
	client.user!.clearActivity();
	await client.user!.setActivity({
		...Config,
		startTimestamp:
			Config.manualTime ??
			(Config.manualDuration
				? Math.floor(Date.now() / 1000) - Config.manualDuration
				: Config.refreshTime
					? Math.floor(Date.now() / 1000)
					: firstTime),
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

async function readConfig(): Promise<Cfg> {
	const data = await readFile(ConfigPath, 'utf-8');
	const parsed = parse(data, [], {
		allowEmptyContent: true,
		allowTrailingComma: true,
		disallowComments: false,
	}) as Cfg;
	return { ...parsed, refreshTime: parsed.refreshTime ?? true } as Cfg;
}
