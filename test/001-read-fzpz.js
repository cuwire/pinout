import assert from 'assert';

import FS from 'fs';
import Path from 'path';

import {promisify} from 'util';

import Fzpz from '../src/fritzing/fzpz';
import Fzp  from '../src/fritzing/fzp';

describe ("001-read-fzpz", function () {
	it ("can be read", async function () {
		var fzpz = await Fzpz.readFromFile ('test/JDY-08.fzpz');
		Object.keys (fzpz.pins).forEach (pin => {
			console.log (fzpz.pins[pin].fn[0].name);
		})
		assert (fzpz.pins, 'no pins read');
		assert (fzpz.svgString.length, 'no svg contents');
	});
	it.skip ("read all fritzing files", function () {
		var fritzingCoreDir = "/Applications/devel/Fritzing.app/Contents/MacOS/fritzing-parts/core";

		var pinNames = {};

		promisify (FS.readdir)(fritzingCoreDir).then (filenames => {
			filenames = filenames.filter (filename => filename.match (/\.fzp$/));
			return filenames.reduce (
				(p, filename, idx) => p.then ((fzp) => {
					// console.log (filenames[idx]);
					Object.keys (fzp.pins).forEach (pin => {
						var pinName = fzp.pins[pin].fn[0].name;
						pinNames[pinName] = pinNames[pinName] ? pinNames[pinName] + 1 : 1;
						// console.log ();
					});

					if (idx < filenames.length - 1) {
						return Fzp.parseFromFile (Path.join (fritzingCoreDir, filenames[idx + 1]))
					} else {
						console.log ('done');
						return Promise.resolve ();
					}
				}),
				Fzp.parseFromFile (Path.join (fritzingCoreDir, filenames[0]))
			)
		}).then (done => {
			Object.keys (pinNames).sort(
				(a, b) => a.toLowerCase().localeCompare(b.toLowerCase())
			).filter (
				pinName => !pinName.match (/^pin\d*[a-z]*$/i)
			).forEach (
				pinName => console.log (pinName)
			);
		})
	})
})
