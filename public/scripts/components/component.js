const fs = require('fs');

console.clear();

// Component tag name
const tag = process.argv[2];

if (!tag) {
	console.log('Usage: npm run new:component <tag>');
	process.exit(1);
}

// Component class name
const class_name = tag
	.split('-')
	.map(word => word.charAt(0).toUpperCase() + word.slice(1))
	.join('');

// Colors for console
const red = '\033[31m';
const cyan = '\033[36m';
const yellow = '\033[33m';
const reset = '\033[0m';

console.log(`Creating component ${cyan}<${red}${tag}${cyan}>${reset} from ${yellow}${class_name}${reset} class`);

// Create empty scss file
fs.writeFileSync(`public/styles/scss/${tag}.scss`, '');

// Add scss file to index.html
let index_html = fs.readFileSync('public/index.html', 'utf8');
let anchor = '\n\t\t<!-- Libraries -->';
index_html = index_html.replace(anchor, `\t\t<link rel="stylesheet" href="./styles/css/${tag}.css">\n${anchor}`);

// Component JavaScript code with basic custom element
const component_js = `
class ${class_name} extends HTMLElement {
	constructor() {
		super();
	}
}

customElements.define('${tag}', ${class_name});
`;

// Create file with component js
fs.writeFileSync(`public/scripts/components/${tag}.js`, component_js);

// Add js file to index.html
anchor = '\n\t\t<!-- Scripts -->';
index_html = index_html.replace(anchor, `\t\t<script src="./scripts/components/${tag}.js"></script>\n${anchor}`);

// Write index.html
fs.writeFileSync('public/index.html', index_html);
