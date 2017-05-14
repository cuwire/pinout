export function promisify (fn) {
	return new Promise (function (resolve, reject) {
		function done (err, ...args) {
			if (err) return reject (err);
			return resolve.apply (this, args);
		}
		fn (done);
	})
}
