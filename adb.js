const { exec } = require('child_process');
const rl = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

const adb_path = 'C:/Users/nicol/OneDrive/dev/platform-tools';

function cmd(c) {
	return new Promise((res, err) => {
		exec(c, (error, stdout) => {
			if (error) err(error);
			else res(stdout);
		});
	});
}

function wait(ms) {
	return new Promise(res => setTimeout(res, ms));
}

async function selectIP() {
	console.clear();

	// Use given IP if provided
	if (process.argv[2]) return process.argv[2];

	let device_ips = (await cmd(`${adb_path}/adb shell ifconfig`))
		.match(/inet\s+addr:(\d+\.\d+\.\d+\.\d+)/g)
		.map(ip => ip.split(':')[1].trim())
		.filter(ip => ip !== '127.0.0.1');

	if (!device_ips.length) return console.error('No IP found, please check your device internet connection');

	// Multiple IPs
	if (device_ips.length > 1) {
		console.log('Please select the IP address you want to use:');
		for (const i in device_ips) {
			console.log(`${parseInt(i) + 1}: ${device_ips[i]}`);
		}

		let ip_index = await new Promise(res => {
			rl.question('\nip:', answer => res(parseInt(answer)));
		});

		return device_ips[ip_index - 1];
	}

	// Single IP
	else return device_ips[0];
}

async function connect() {
	console.clear();

	// Kill adb server
	console.log('Killing adb server');
	await cmd(`${adb_path}/adb kill-server`);

	// Wait for device
	console.log('Waiting for device...');
	await cmd(`${adb_path}/adb wait-for-device`);

	// Device name
	let device_name = await cmd(`${adb_path}/adb shell getprop ro.product.model`);
	device_name = device_name.trim();

	// Device IP
	let device_ip = await selectIP();

	// Set tcp port
	console.log('Starting adb server');
	await cmd(`${adb_path}/adb tcpip 5555`);

	// console.log('Please unplug your device and plug it back in to initiate connection...');
	await wait(2000);
	// await cmd(`${adb_path}/adb wait-for-device`);

	// Connect to device
	console.log(`Connecting to ${device_name} (${device_ip})`);
	await cmd(`${adb_path}/adb connect ${device_ip}:5555`);

	console.clear();

	console.log(`Connected to ${device_name} (${device_ip})`);
	process.exit();
}

connect();
