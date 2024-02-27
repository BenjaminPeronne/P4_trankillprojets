const express = require('express');

// Route function called by both http and https servers
module.exports = function route(app) {
	// Global
	app.use('/', express.static('public'));

	// 404
	app.get('*', (req, res) => {
		res.status(404).sendFile('404.html', { root: __dirname });
	});
};
