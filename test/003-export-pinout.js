import FS from 'fs';

import Fzpz from '../src/fritzing/fzpz';
import SVGnJSON from '../src/svg-and-json';

import SVGView from '../src/view/svg';
SVGView.css = FS.readFileSync ('./assets/pinout.sass');

import {DOMParser, XMLSerializer} from 'xmldom';

describe ("002-export-pinout", function () {
	it ("from fritzing", async function () {
		var fzpz = await Fzpz.readFromFile ('test/JDY-08.fzpz');

		/*
		console.log (Object.keys (fzpz));
		console.log (Object.keys (fzpz.files));
		console.log (Object.keys (fzpz.files.breadboard));
		*/

		var pinoutView = new SVGView (fzpz);

		/*{

		var doc = pinoutView.document = pinoutView.parse ();
		var root = doc.documentElement;

		while (root.childNodes.length) {
			root.removeChild (root.childNodes[root.childNodes.length - 1]);
		}

		// console.log (pinoutSvg);

		}*/

		FS.writeFileSync (
			'./test/003-JDY-08-breadboard.svg',
			fzpz.files.breadboard.contents
		);

		var pinoutSvg = pinoutView.export ();

		FS.writeFileSync ('./test/003-JDY-08-pinout.svg', pinoutSvg);

		// console.log (pinoutSvg);
	});

	it ('from svg', async function () {
		var svg = await SVGnJSON.readFromFile ('boards/lpmsp430g2553.svg');
		// assert (svg.pins, 'no pins read');
		//assert (svg.svgString.length, 'no svg contents');

		var pinoutView = new SVGView (svg);

		FS.writeFileSync (
			'./test/003-lpmsp430g2553.svg',
			svg.svgString
		);

		var pinoutSvg = pinoutView.export ();

		FS.writeFileSync ('./test/003-lpmsp430g2553-pinout.svg', pinoutSvg);

		return svg;
	})
})
