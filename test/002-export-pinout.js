import FS from 'fs';

import Fzpz from '../src/fritzing/fzpz';

import SVGView from '../src/view/svg';

import {DOMParser, XMLSerializer} from 'xmldom';

describe ("002-export-pinout", function () {
	it ("from fritzing", async function () {
		var fzpz = await Fzpz.readFromFile ('test/JDY-08.fzpz');
		
		/*
		console.log (Object.keys (fzpz));
		console.log (Object.keys (fzpz.files));
		console.log (Object.keys (fzpz.files.breadboard));
		*/
		
		SVGView.css = FS.readFileSync ('./assets/pinout.sass');
		
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
			'./test/002-JDY-08-breadboard.svg',
			fzpz.files.breadboard.contents
		);
		
		var pinoutSvg = pinoutView.export ();
		
		FS.writeFileSync ('./test/002-JDY-08-pinout.svg', pinoutSvg);
		
		// console.log (pinoutSvg);
	});
})
