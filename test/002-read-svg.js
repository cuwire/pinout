import assert from 'assert';

import SVGnJSON from '../src/svg-and-json';

describe ("002-read-svg", function () {
	it ("can be read", async function () {
		var svgPinout = await SVGnJSON.readFromFile ('boards/lpmsp430g2553.svg');
		assert (svgPinout.pins, 'no pins read');
		assert (svgPinout.svgString.length, 'no svg contents');
	});
})
