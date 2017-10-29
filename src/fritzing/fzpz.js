import * as JSZip from 'jszip';
import Fzp from './fzp';

import {promisify} from '../common';

import FS from 'fs';

export default class FritzingFzpz {

	constructor (data) {
		Object.assign (this, data);
	}

	static handleFiles (url, archiveData, cb) {

		// console.info (Object.keys (archiveData.files));
		var filenames = Object.keys (archiveData.files).filter (filename => !archiveData.files[filename].dir);

		// non optimal, but readable
		var fzpName = filenames.filter (file => file.match (/^part\..*fzp$/))[0];
		var breadboardName = filenames.filter (file => file.match (/(?:^svg\.breadboard\.|breadboard\.svg$)/))[0];
		// breadboardName = breadboardName.replace (/^(?:svg\.breadboard\.)?/, '');

		return Promise.all (filenames.map (filename => archiveData.files [filename].async ("text"))).then (contents => {

			var files = {
				part: null,
				pcb: null,
				icon: null,
				breadboard: null,
				schematic: null,
			};

			filenames.forEach ((filename, idx) => {
				var nameMatch = filename.match (/^(svg\.(?:pcb|icon|breadboard|schematic)|part)\..*\.(fzp|svg)$/);

				if (!nameMatch)
					return;

				var [, type, format] = nameMatch;
				files[type.replace ('svg.', '')] = {
					filename,
					format,
					contents: contents[idx],
				}
			});

			var fzpContents = files.part.contents;

			var fzp = Fzp.parseFromString (fzpContents);

			if (breadboardName && fzp.breadboardViewFilename !== breadboardName) {
				// TODO: do something
				console.error (`breadboard file names in fzp (${breadboardName}) and fzpz file (${fzp.breadboardViewFilename}) doesn't match`);
			}

			// TODO: show notification when breadboardName is not defined
			// decompress it

			var breadboardSvg = files.breadboard.contents;

			var fzpz = new FritzingFzpz ({
				url,
				meta:  fzp,
				files: files,
			});

			cb && cb (null, fzpz);

			return fzpz;

			//console.log (breadboardContents);

			// load data url into the object
			try {
				// var dataUrl = encodeOptimizedSVGDataUri (breadboardContents);
				var dataUrl = svgBlob (breadboardSvg);
			} catch (e) {
				console.log (e);
			}

			// console.log (dataUrl);

			cb && cb (dataUrl);


		})

	}
	static loadFromUrl (url, cb) {

		if (!cb)
			return promisify (FritzingFzpz.loadFromUrl, FritzingFzpz)(url);

		JSZipUtils.getBinaryContent (url, function (err, data) {
			if (err) {
				throw err; // TODO: handle err
			}

			// TODO: catch error
			return JSZip.loadAsync (data).then (function (archiveData) {
				return FritzingFzpz.handleFiles (url, archiveData, cb);
			});
		});
	}

	static readFromFile (filename, cb) {

		if (!cb)
			return promisify (FritzingFzpz.readFromFile, FritzingFzpz)(filename);

		return promisify (FS.readFile, FS)(filename).then (function (data) {
			// TODO: catch error
			return JSZip.loadAsync (data).then (function (archiveData) {
				return FritzingFzpz.handleFiles (filename, archiveData, cb);
			});
		}, function (err) {
			return Promise.reject (err);
		});
	}
}

