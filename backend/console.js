// Console colors
const colors = {
	white: '\033[0m',
	gray: '\033[90m',
	red: '\033[31;1m',
	green: '\033[32m',
	yellow: '\033[33m',
	blue: '\033[34;1m'
};

// Log function allowing line color and same-msg counter
let last_log = null;

function log(msg, color = 'white', unique = false) {
	// Compare to last log to prevent doubles and show counter
	const double = msg === last_log?.msg && color === last_log?.color;

	// New line character only if not double
	const start = double ? '\r' : '\n';

	// Increment count if double, else reset to 1
	const count = double ? last_log.count + 1 : 1;

	// Show count if double
	const end = count > 1 ? ` x${count}` : '';

	// process.stdout.write allows us to re-write the line
	process.stdout.write(`${start}${colors[color]}${msg}${end}${colors.white}`);

	// Save log
	last_log = unique ? null : { msg, color, count };
}

module.exports = { colors, log };
