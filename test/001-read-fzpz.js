import assert from 'assert';

import Fzpz from '../src/fritzing/fzpz';

describe ("001-read-fzpz", function () {
	it ("can be read", async function () {
		var fzpz = await Fzpz.readFromFile ('test/JDY-08.fzpz');
		assert (fzpz.pins, 'no pins read');
		assert (fzpz.svgString.length, 'no svg contents');
	});
})
