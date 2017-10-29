import Util from 'util';

export function promisify (fn, _this) {
	
	if (Util.promisify)
		return Util.promisify (_this ? fn.bind (this) : fn);
	
	return function (...args) {
		return new Promise (function (resolve, reject) {
			function done (err, result) {
				if (err)
					return reject (err);
				
				return resolve (result);
			}
			
			fn.apply (_this, args.concat (done));
		})
	}
}
