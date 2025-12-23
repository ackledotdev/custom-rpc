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

process.on('SIGINT', exit);
process.on('SIGTERM', exit);

async function exit() {
	await client.destroy();
	console.log('\nDisconnected');
	process.exit(0);
}

async function refreshConfig() {
	console.log('Configuration file changed. Reloading...');
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
