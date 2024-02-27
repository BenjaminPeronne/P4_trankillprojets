const channel = new BroadcastChannel('sw-messages');

addEventListener('load', async e => {
	const reg = await navigator.serviceWorker?.register('/service-worker.js');
	Notification.requestPermission();
	console.log('Registered for ' + reg.scope);
});

channel.addEventListener('message', event => {
	console.dir(event.data.action);
});
