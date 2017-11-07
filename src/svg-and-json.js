import {promisify} from './common';

import {DOMParser} from 'xmldom';

import FS from 'fs';
import Path from 'path'

export default class SVGAndJSON {

	constructor (data) {
		Object.assign (this, data);
	}

	get pins () {
		return this.meta.connectors;
	}

	/*
	get svgString () {
		return this.svgString;
	}
	*/

	static handleFiles (url, options, cb) {

		// svgString = new DOMParser().parseFromString (fileData.breadboard, 'text/xml');
		var svgString = options.breadboardSvg;
		var svgUrl = options.svgUrl;
		var connectors;

		try {
			connectors = JSON.parse (options.metaJSON);
			connectors = Object.keys (connectors).reduce ((acc, connId) => {
				var connMeta = convertJsonMeta (connId, connectors[connId])
				if (connMeta) acc[connId] = connMeta;
				return acc;
			}, {})
		} catch (e) {

		}

		var svgPinout = new SVGAndJSON ({
			url,
			svgUrl,
			meta:  {
				connectors: connectors
			},
			svgString,
			options,
		});

		cb && cb (null, svgPinout);

		return svgPinout;
	}

	static loadFromUrl (url) {

		// we don't need to download svg in the browser.
		// browser will do it itself when we set `<object @data>`

		var jsonUrl = url.replace (/\.svg(?:$|\?)/, '.json');

		var myHeaders = new Headers ();
		// myHeaders.append('Content-Type', 'image/jpeg');

		var init = {
			method: 'GET',
			headers: myHeaders,
			mode:  'cors',
			cache: 'default'
		};

		var req = new Request (jsonUrl);

		return fetch (req, init).then (res => {
			var body;
			var contentType = res.headers.get("content-type");
			//if (contentType && contentType.includes("application/json")) {
			//	body = await res.json();
			//} else {
			return res.text();
			//}

		}).then (body => {

			var result = {
				svgUrl: url,
				jsonUrl,
				breadboardSvg: null,
				metaJSON: body
			};

			return SVGAndJSON.handleFiles (url, result);
		});
	}

	static async readFromFile (filename) {

		var svgFilename  = filename;
		var jsonFilename = Path.join (
			Path.dirname (filename),
			Path.basename (filename, Path.extname (filename)) + '.json'
		);

		var result = {
			svgFilename,
			jsonFilename,
			breadboardSvg: null,
			metaJSON: null
		};

		var svgData = await promisify (FS.readFile, FS)(svgFilename);
		result.breadboardSvg = svgData.toString();

		var jsonData = await promisify (FS.readFile, FS)(jsonFilename);
		result.metaJSON = jsonData.toString();

		return SVGAndJSON.handleFiles (filename, result);
	}

}

async function fetchFromUrl (url) {

	var myHeaders = new Headers ();
	// myHeaders.append('Content-Type', 'image/jpeg');

	var init = {
		method: 'GET',
		headers: myHeaders,
		mode:  'cors',
		cache: 'default'
	};

	var req = new Request (url);

	var res = await fetch (req, init);

	var body;
	var contentType = res.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {
		body = await res.json();
	} else {
		body = await res.text();
	}

	return body;
}

function convertJsonMeta (pinId, pinMeta) {
	if (pinId === 'cuwire') {
		return;
	}

	var fn = pinMeta.fn;
	var fnList = [];

	Object.keys (fn).forEach ((fnName) => {

		// console.log (fnName, fn[fnName]);

		var pinData = {
			group: fnName.toLowerCase(),
			name: fn[fnName],
			groupNum: null,
			alt: false,
			hidden: false,
		};

		if (fnName.match(/^x\-/i)) {
			pinData.hidden = true;
			fnName = fnName.replace (/^x\-/, '');
		}

		var complex = fnName.toLowerCase().match (/^(alt-)?([^\-]+)-([^\-]+)?$/i);
		// usually this is [alt-]uart-1
		if (complex) {
			if (complex[2] === 'alt') { /// ?
				complex.shift();
			}
			pinData.group = complex[2];
			if (complex[1]) {
				pinData.alt = true;
			}
			if (complex[3]) {
				pinData.groupNum = complex[3];
			}
		}

		fnList.push (pinData);
	});

	Object.keys (pinMeta.flags || {}).forEach ((flag) => {
		var pinData = {
			group: flag.toLowerCase(),
			name: null,
			groupNum: null,
			alt: false,
			hidden: false,
		}

		fnList.push (pinData);
	})

	/*
	if (pinMeta.flags) {
		if (pinMeta.flags["5v"]) {
			fnList.push ({"class": "5v flag", title: "➄", flag: true});
		}
		if (pinMeta.flags.touch) {
			fnList.push ({"class": "touch flag", title: "☟", flag: true});
		}
	}
	*/

	return {fn: fnList};
}
