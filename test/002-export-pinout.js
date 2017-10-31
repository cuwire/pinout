import Fzpz from '../src/fritzing/fzpz';

import SVGView from '../src/view/svg';

describe ("002-export-pinout", function () {
	it ("from fritzing", async function () {
		var fzpz = await Fzpz.readFromFile ('test/JDY-08.fzpz');
		
		/*
		console.log (Object.keys (fzpz));
		console.log (Object.keys (fzpz.files));
		console.log (Object.keys (fzpz.files.breadboard));
		*/
		
		var pinoutView = new SVGView (fzpz);
		
		var pinoutSvg = pinoutView.serialize ();
		
		console.log (pinoutSvg);
	});
})
