import {DOMParser} from 'xmldom';

class FritzingSVG {
	constructor (svg) {
		if (svg instanceof String) {
			new DOMParser().parseFromString (svg, 'text/xml');
		}
	}
}
