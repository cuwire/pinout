import svgdom from 'svgdom';

import {DOMParser, XMLSerializer} from 'xmldom';

import {
	convertDOM,
	NS,
	svgToBlob,
	nodeCentralPoint,
	viewportConvert,
	// createSVGPoint,
	showWholeSVG,
	elementDepth
} from '../svg-tools'

/*
if (!window.DOMParser) {

	import sax from 'sax';

	window.DOMParser = class DOMParser function(str, el) {



		var currentTag = el;
		var ownerDocument = el.ownerDocument;

		var parser = sax.parser(true)
		parser.ontext = t => this.currentTag.appendChild(new window.TextNode('#text', {
			data: t,
			ownerDocument: ownerDocument
		}))
		parser.onopentag = node => {
			var newSvgElement = new window.SVGElement(node.name, {
				attrs: node.attributes,
				ownerDocument: ownerDocument,
			})
			this.currentTag.appendChild(newSvgElement)
			this.currentTag = newSvgElement
		}
		parser.onclosetag = node => this.currentTag = this.currentTag.parentNode

		parser.write(str)
	}
}

*/

/*
window
	// your font directory
	.setFontDir('./fonts')
	// map the font-family to the file
	.setFontFamilyMappings({'Arial': 'arial.ttf'})
	// you can preload your fonts to avoid the loading delay
	// when the font is used the first time
	.preloadFonts()
*/

function mmSize (cssSize, dpi) {

	var size;

	// em and ex should never be used
	// don't know how to convert pt an pc. are those two sizes depends on dpi?

	if (cssSize.match (/^(?:\d+|\d+\.\d*|\d*\.\d+)mm$/)) {
		size = parseFloat (cssSize);
	} else if (cssSize.match (/^(?:\d+|\d+\.\d*|\d*\.\d+)cm$/)) {
		size = parseFloat (cssSize)*10;
	} else if (cssSize.match (/^(?:\d+|\d+\.\d*|\d*\.\d+)in$/)) {
		size = parseFloat (cssSize)*25.4;
	} else if (cssSize.match (/^(?:\d+|\d+\.\d*|\d*\.\d+)(?:px)?$/)) {
		size = parseFloat (cssSize) / dpi * 25.4;
	}

	return size;
}


export default class SVGView {
	constructor (viewData) {

		this.viewData = viewData;

		this.pins      = viewData.pins;

		// we can have svgString or svgUrl
		this.svgString = viewData.svgString;
		this.svgUrl    = viewData.svgUrl;

		// TODO:
		// this.embedCSSText
	}

	renderTo (selector) {
		var svgUrl = this.svgUrl;
		if (this.svgString) {
			var svgUrl = svgToBlob (this.svgString);
		}

		if (selector instanceof HTMLElement && selector.nodeName === 'OBJECT') {
			var node = selector;
			var loadCompleteHandler = () => {
				node.removeEventListener ('load', loadCompleteHandler);
				this.document = node.getSVGDocument();
				this.addPinoutNodes ();

			}
			node.addEventListener ('load', loadCompleteHandler);
			node.data = svgUrl;
		}

	}

	parse () {
		if (this.svgString) {
			var svgDoc = convertDOM (new DOMParser ().parseFromString (
				this.svgString, "image/svg+xml"
			));
			return svgDoc
		}

		throw "Only svgString supported at this time";
	}

	createSVGNode (nodeName, attrs) {
		var doc = this.document;
		var theNode = doc.createElementNS (NS, nodeName);
		for (var attrName in attrs) {
			theNode.setAttribute (attrName, attrs[attrName]);
		}
		return theNode;
	}

	addPinoutNodes () {


		var svgDoc = this.document;
		var svgRoot = svgDoc.documentElement;

		var style = this.createSVGNode ("style");

		style.textContent = '\n' + this.constructor.css;
		svgRoot.insertBefore (
			style,
			svgDoc.documentElement.firstChild
		);

		var dpi = 90;
		var svgString = this.serialize ();
		// console.log (svgString);
		if (svgString.match (/Illustrator/)) {
			dpi = 72;
		} else if (svgString.match (/inkscape/)) {
			dpi = 90;
		}

		this.dpi = dpi;

		var svgRoot = svgDoc.documentElement;

		this.metricWidth  = mmSize (svgRoot.getAttribute ('width'), dpi);
		this.metricHeight = mmSize (svgRoot.getAttribute ('height'), dpi);

		var viewBox = svgRoot.getAttribute ('viewBox').split(/\s+|,/).map (v => parseFloat(v));

		console.log (this.metricWidth/(viewBox[2] - viewBox[0]), this.metricHeight/(viewBox[3] - viewBox[1]));

		this.unitsInmm = this.metricWidth/(viewBox[2] - viewBox[0]);

		console.log (
			"width: %s, height: %s",
			this.metricWidth,
			this.metricHeight
		);

		var offset = svgRoot.getBoundingClientRect();
		// console.log ('Offset', offset, 'viewBox', );

		// defs.appendChild(linkElm);

		if (this.pins)
			this.drawLabels ({});

	}

	serialize () {
		return new XMLSerializer ().serializeToString (
			convertDOM (this.document)
		);
	}

	export () {

		if (!this.document) {
			this.document = this.parse ();
		}


		if (!this.havePinout) {
			this.addPinoutNodes ();
		}

		return this.serialize ();
	}

	init (svgDoc, pins) {
		// var svgDoc = this.document = this.pinoutElement.getSVGDocument();

		/*
		var linkElm = svgDoc.createElementNS("http://www.w3.org/1999/xhtml", "link");
		linkElm.setAttribute("href", this.embedCSSHref);
		linkElm.setAttribute("type", "text/css");
		linkElm.setAttribute("rel", "stylesheet");
		*/

		var style = this.createSVGNode ("style");
		style.textContent = this.embedCSSText;
		svgDoc.documentElement.insertBefore (
			style,
			svgDoc.documentElement.firstElementChild
		);

		var dpi = 90;
		var svgString = new XMLSerializer ().serializeToString(svgDoc);
		// console.log (svgString);
		if (svgString.match (/Illustrator/)) {
			dpi = 72;
		} else if (svgString.match (/inkscape/)) {
			dpi = 90;
		}

		this.dpi = dpi;

		var svgRoot = svgDoc.documentElement;

		this.metricWidth  = mmSize (svgRoot.getAttribute ('width'), dpi);
		this.metricHeight = mmSize (svgRoot.getAttribute ('height'), dpi);

		var viewBox = svgRoot.getAttribute ('viewBox').split(/\s+|,/).map (v => parseFloat(v));

		console.log (this.metricWidth/(viewBox[2] - viewBox[0]), this.metricHeight/(viewBox[3] - viewBox[1]));

		this.unitsInmm = this.metricWidth/(viewBox[2] - viewBox[0]);

		console.log (
			"width: %s, height: %s",
			this.metricWidth,
			this.metricHeight
		);

		var offset = svgRoot.getBoundingClientRect();
		// console.log ('Offset', offset, 'viewBox', );

		// defs.appendChild(linkElm);

		if (this.pins)
			this.drawLabels ({});
	}

	getPinRowsOrientation () {

		var svgDoc  = this.document;
		var svgRoot = svgDoc.documentElement;

		var brdData = this.pins;

		// let's find pin rows/columns
		// we're maping every pin x coordinate to the columns
		// and every y to the rows
		var rows = {};
		var cols = {};

		Object.keys (brdData).forEach ((connectorId) => {

			if (connectorId === 'cuwire') {
				return;
			}

			var connectorNode = brdData[connectorId].svgId
				? svgDoc.getElementById (brdData[connectorId].svgId)
				: svgDoc.querySelector ('[id^='+connectorId+']');

			if (!connectorNode)
				return;

			var coords = viewportConvert (connectorNode);

			if (brdData[connectorId].display === 'hover') {
				return;
			}

			// TODO: use dpi
			if (rows[coords.y.toFixed (3)]) {
				rows[coords.y.toFixed (3)].push ({id: connectorId, x: coords.x, y: coords.y});
			} else {
				rows[coords.y.toFixed (3)] = [{id: connectorId, x: coords.x, y: coords.y}];
			}

			if (cols[coords.x.toFixed (3)]) {
				cols[coords.x.toFixed (3)].push ({id: connectorId, x: coords.x, y: coords.y});
			} else {
				cols[coords.x.toFixed (3)] = [{id: connectorId, x: coords.x, y: coords.y}];
			}


			// console.log (Object.assign (coords, {id: connectorNode.id}));
			// console.log (connectorNode);
		});

		var pitches = {};

		var pinRows = Object.keys(rows)
		// exclude parralel rows/columns; can be issue for teensy 3.1
		// or dual double row boards
		.filter(row => rows[row].length > 2)
		.reduce((obj, key) => {
			obj[key] = rows[key];
			return obj;
		}, {});

		var pinCols = Object.keys(cols)
		.filter(col => cols[col].length > 2)
		.reduce((obj, key) => {
			obj[key] = cols[key];
			return obj;
		}, {});

		var maxRowLength = 0,
			maxColLength = 0;

		// get longest rows/columns
		Object.keys (pinRows).forEach (y => {
			maxRowLength = Math.max (maxRowLength, pinRows[y].length);
			pinRows[y]
				.sort ((a, b) => a.x - b.x)
				.forEach ((pin, pinIdx, pins) => {
				if (pinIdx === 0) return;
				var pitch = (pin.x - pins[pinIdx - 1].x).toFixed (3);
				pitches[pitch] = pitches[pitch] + 1 || 1;
			})
		})

		Object.keys (pinCols).forEach (x => {
			maxColLength = Math.max (maxColLength, pinCols[x].length);
			pinCols[x]
				.sort ((a, b) => a.y - b.y)
				.forEach ((pin, pinIdx, pins) => {
				if (pinIdx === 0) return;
				// console.log (a.y, b.y, a.y - b.y);
				var pitch = (pin.y - pins[pinIdx - 1].y).toFixed (3);
				pitches[pitch] = pitches[pitch] + 1 || 1;
			})
		})

		// console.log (pinRows);
		// console.log (pinCols);

		// assume longest pin set to be vertical
		if (maxColLength > maxRowLength) {
			// no rotation
			this.rotated = 0;
		} else {

			var point = nodeCentralPoint (svgRoot);

			var rotatedG = this.createSVGNode ('g', {'transform': 'rotate (90,' + point.x + ',' + point.y + ')'});

			/*
			while (svgRoot.childNodes.length > 0) {
				rotatedG.appendChild(svgRoot.childNodes[0]);
			}
			*/

			var rotatedNodes = [].filter.call (svgRoot.childNodes, node => {
				if (node.nodeType !== 1) // element node
					return;
				if (['defs', 'style'].indexOf (node.nodeName) > -1)
					return;
				if (node.id === 'pinout')
					return;
				return true;
			});

			rotatedNodes.forEach (node => {
				rotatedG.appendChild(node);
			})

			this.preindentChild (svgRoot);
			svgRoot.appendChild (rotatedG);
			this.postindentNode (svgRoot);

			[this.metricHeight, this.metricWidth] = [this.metricWidth, this.metricHeight];

			// console.log ('main g', svgDoc.querySelectorAll ('svg>g'));

			this.rotatedG = rotatedG;

			// rotate 90º
			this.rotated = 0;
		}

		var pitch = Object.keys (pitches).sort ((a, b) => pitches[b] - pitches[a])[0];

		// console.log ('pitch %fmm', (pitch * this.unitsInmm).toFixed (3), pitches, pitch);

		this.pitch = parseFloat (pitch);

		this.fontSize = this.pitch * .75;
	}

	appendIndentationNode (node, add) {
		var depth = elementDepth (node) + add;
		var indent = '\n';
		for (let i = 0; i < depth; i++) {
			indent += '  ';
		}

		var indentNode = node.ownerDocument.createTextNode (indent);

		node.appendChild (indentNode);

		return indentNode;

	}

	postindentNode (node) {
		return this.appendIndentationNode (node, 0);
	}

	preindentChild (node) {
		return this.appendIndentationNode (node, 1);
	}

	get pinoutNode () {

		if (!this.document)
			return;

		var svgDoc  = this.document;
		var svgRoot = svgDoc.documentElement;

		var result;

		if (!result) {
			result = svgDoc.getElementById ('pinout');
		}

		if (!result) {
			this.preindentChild (svgRoot);
			svgRoot.appendChild (this.createSVGNode ('g', {id: 'pinout'}));
			result = svgDoc.getElementById ('pinout');
			this.postindentNode (result.parentNode);
		}

		return result;
	}

	drawLabels (exclude = {}) {

		var svgDoc  = this.document;
		var svgRoot = svgDoc.documentElement;

		var brdData = this.pins;

		var pinoutNode = this.pinoutNode;

		while (this.pinoutNode.childNodes.length) {
			this.pinoutNode.removeChild (this.pinoutNode.childNodes[0]);
		}

		this.getPinRowsOrientation ();

		this.center = nodeCentralPoint (svgRoot);

		/*
		var defs = svgDoc.querySelector ('defs');
		if (!defs) {
			defs = this.createSVGNode ('defs');
			svgRoot.insertBefore (defs, svgRoot.firstElementChild);
		}
		*/

		Object.keys (brdData).filter (connectorId => connectorId !== 'cuwire').forEach ((connectorId) => {

			// console.log (brdData[connectorId]);

			var pinData = brdData[connectorId];
			if (!(pinData.fn instanceof Array)) {
				pinData = convertJsonMeta (connectorId, pinData);
			}

			// console.log (fn, fnList);

			this.drawPin (connectorId, pinData);
		});

		svgDoc.documentElement.setAttribute ("preserveAspectRatio", "xMinYMid meet");

		showWholeSVG (svgDoc);

		// this.updateSvgLink ();
		// this.updatePngLink ();
		// this.updateSizeInfo ();

	}

	// http://www.petercollingridge.co.uk/data-visualisation/mouseover-effects-svgs

	drawPin (connectorId, pinData) {

		var svgDoc = this.document;

		// console.log (pinData);

		var connectorNode = pinData.svgId
			? svgDoc.getElementById (pinData.svgId)
			: svgDoc.querySelector ('[id^='+connectorId+']');

		if (!connectorNode)
			return;

		var labelOffset;
		var labelMinX = 0;
		var labelMaxX = 0;

		var coords = viewportConvert (connectorNode);

		var side;
		if (this.rotated === 0 && this.center.x > coords.x) {
			side = 'left';
		} else if (this.rotated === 0 && this.center.x <= coords.x) {
			side = 'right';
		} else if (this.rotated === 90 && this.center.y <= coords.y) {
			side = 'left';
		} else if (this.rotated === 90 && this.center.y <= coords.y) {
			side = 'right';
		}

		var g = this.createSVGNode ("g", {
			class: 'cuwire-pin',
			transform: `translate(${coords.x}, ${coords.y}) rotate(${0-this.rotated}, ${0 & this.center.x/2}, ${0 & this.center.y/2})`,
			'data-side': side,
			'data-coords': `x: ${coords.x} y: ${coords.y}`,
			for: connectorId,
			// transform: "rotate("+this.rotated+" "+pinX+" "+pinY+")",
			// x: pinX+10,
			// y: pinY,
			// "font-size": fontSize,
			// fill: "white"
		});

		this.preindentChild (this.pinoutNode);
		this.pinoutNode.appendChild (g);

		var labelOffset = this.wireForPin (g, side, pinData, coords);

		pinData.fn.forEach ((labelData) => {

			labelOffset = this.labelForPin (g, side, labelData, labelOffset);

		});

		this.postindentNode (g);

		this.postindentNode (this.pinoutNode);


	}

	wireForPin (g, side, pinData, coords) {

		var svgDoc = this.document;

		// console.log (pinData, this.rotated);

		var lineRect;

		var xOffset = Math.abs (coords.x - this.center[side === 'left' ? 'x1' : 'x2']);
		// var yOffset = coords.x - this.center[side === 'left' ? 'x1' : 'x2'];

		lineRect = {
			x1: (side === 'left' ? -1 : 1)*(xOffset),
			y1: 0,
			x2: (side === 'left' ? -1 : 1)*(this.fontSize + xOffset),
			y2: 0
		}

		//console.log (pinData, lineRect);

		// TODO: remove stroke width from line x
		if (pinData.fn.some (label => label.group === 'dac')) {
			var path = this.createSVGNode ("path", {
				d: [
					"M"+[0, 0].join (','),
					"l"+[lineRect.x1, lineRect.y1].join (','),
					"l"+[(lineRect.x2-lineRect.x1)/8, 0].join (','),
					"C"+[lineRect.x1 + (lineRect.x2-lineRect.x1)/2, lineRect.y2 - Math.abs (this.fontSize)].join (','),
					[lineRect.x1 + (lineRect.x2-lineRect.x1)/2, lineRect.y2 + Math.abs (this.fontSize)].join (','),
					[lineRect.x2 - (lineRect.x2-lineRect.x1)/8, lineRect.y2].join (','),
					"l"+[(lineRect.x2-lineRect.x1)/8, 0].join (','),
				].join (' '),
				"stroke-width": this.fontSize/8,
			});

			this.preindentChild (g);
			g.appendChild (path);
		} else if (pinData.fn.some (label => label.group === 'pwm')) {
			var path = this.createSVGNode ("path", {
				d: [
					"M"+[0, 0].join (','),
					"l"+[lineRect.x1, lineRect.y1].join (','),
					"l"+[(lineRect.x2-lineRect.x1)/4, 0].join (','),
					"l"+[0, this.fontSize/4].join (','),
					"l"+[(lineRect.x2-lineRect.x1)/4, 0].join (','),
					"l"+[0, -this.fontSize/2].join (','),
					"l"+[(lineRect.x2-lineRect.x1)/4, 0].join (','),
					"l"+[0, this.fontSize/4].join (','),
					"l"+[(lineRect.x2-lineRect.x1)/4, 0].join (','),
					/*"C"+[lineRect.x1 + (lineRect.x2-lineRect.x1)/2, lineRect.y2 - Math.abs (labelTextOffset/2)].join (','),
				[lineRect.x1 + (lineRect.x2-lineRect.x1)/2, lineRect.y2 + Math.abs (labelTextOffset/2)].join (','),
				[lineRect.x2-(lineRect.x2-lineRect.x1)/4, lineRect.y2].join (','),
				*/
					//"l"+[(lineRect.x2-lineRect.x1)/2, 0].join (','),
				].join (' '),
				"stroke-width": this.fontSize/8,
			});

			this.preindentChild (g);
			g.appendChild (path);
		} else {
			var line = this.createSVGNode ("line", {
				x1: 0,
				x2: lineRect.x2,
				y1: lineRect.y1,
				y2: lineRect.y2,
				"stroke-width": this.fontSize/8,
			});

			this.preindentChild (g);
			g.appendChild (line);
		}

		this.postindentNode (g);

		return {
			x: lineRect.x2,
			y: 0
		}
	}

	labelForPin (containerGroup, side, labelMeta, coords) {

		var svgDoc = this.document;

		// var pinSelector = arguments.shift();

		var labelTitle = labelMeta.name;

		if (!labelTitle || labelMeta.hidden)
			return coords;

		var pinX = coords.x;
		var pinY = coords.y;

		var className = [
			labelMeta.group,
			labelMeta.groupNum ? labelMeta.group + '-' + labelMeta.groupNum : null,
			labelMeta.alt ? 'alt' : null,
		].filter (a => a).join (' ')

		var g = this.createSVGNode ("g", {
			class: 'cuwire-pin ' + className,
			//		transform: "rotate("+(rotated ? -90 : 0)+" "+pinX+" "+pinY+")",
			// x: pinX+10,
			// y: pinY,
			// "font-size": fontSize,
			// fill: "white"
		});

		this.preindentChild (containerGroup);
		containerGroup.appendChild(g);

		var labelTextOffset = (side === 'right' ? 1 : -1) * this.fontSize;

		var text = this.createSVGNode ("text", {
			x: pinX + labelTextOffset,
			y: pinY,
			"font-size": this.fontSize,
			// fill: "white",
			"dominant-baseline": 'central',
			"text-anchor": side === 'right' ? 'start' : 'end'
		});

		text.textContent = labelTitle;

		this.preindentChild (g);
		g.appendChild (text);

		var bbox = text.getBBox();
		// console.log (bbox)
		// var ctm  = text.getCTM(); // infinite loop on svgdom
		// var sctm = text.getScreenCTM();

		if (labelMeta.group && labelMeta.group.length <= 4) {
			if (labelMeta.groupNum) {
				var scopeIdText = this.createSVGNode ("text", {
					x: pinX + labelTextOffset + this.fontSize/5 + (side === 'right' ? 0 : -1) * bbox.width,
					y: pinY,
					"font-size": this.fontSize / 2,
					// fill: "white",
					"dominant-baseline": "hanging",
					"text-anchor": 'middle', //side === 'right' ? "start" : 'end'
				});

				scopeIdText.textContent = labelMeta.groupNum;

				g.appendChild (scopeIdText);
			}

			var x = pinX + labelTextOffset - this.fontSize/5 + (side === 'right' ? 0 : -1) * bbox.width,
				y = pinY;
			var scopeNameText = this.createSVGNode ("text", {
				x: x,
				y: y,
				class: "group",
				"font-size": this.fontSize * .4,
				"font-weight": "bold",
				// fill: "white",
				"dominant-baseline": "central",
				"text-anchor": 'middle', //side === 'right' ? "start" : 'end'
				transform: "rotate(-90, " + x + ", " + y + ")",
			});

			scopeNameText.textContent = labelMeta.group;

			g.appendChild (scopeNameText);

			text.setAttribute ("x", parseFloat(text.getAttribute("x")) + this.fontSize/2.5);
		}

		// connectorNode.parentElement.insertBefore (text, connectorNode.nextSibling);

		// text.setAttribute ('y', pinY + bbox.height / 2);

		// bbox = text.getBBox();

		var lineRect = {
			x1: bbox.x + (side === 'right' ? - this.fontSize /2 : bbox.width + this.fontSize /2),
			y1: pinY,
			x2: pinX,
			y2: pinY,
		};

		var rect = this.createSVGNode ("rect", {
			x: bbox.x - this.fontSize / 2,
			y: pinY - bbox.height/2,
			width: bbox.width + this.fontSize,
			height: bbox.height,
			rx: this.fontSize/5,
			ry: this.fontSize/5,
			"stroke-width": this.fontSize / 10
		});

		// stroke="black" stroke-width="20" stroke-linecap="round"/>

		g.insertBefore (rect, text);

		var line = this.createSVGNode ("line", {
			x1: lineRect.x1,
			x2: lineRect.x2,
			y1: lineRect.y1,
			y2: lineRect.y2,
			"stroke-width": this.fontSize/8,
		});

		g.insertBefore (line, text);

		// connectorNode.parentElement.insertBefore (rect, c25.nextSibling);

		// c25.parentElement.insertBefore (line, c25.nextSibling);

		// g.appendChild (line);
		// g.appendChild (rect);
		// g.appendChild (text);

		// c25.parentElement.insertBefore (path, c25.nextSibling);

		// if (labelMeta.group) {

		// var textOffset = this.fontSize * 1;
		// }

		this.postindentNode (g);

		return {
			x: bbox.x + (side === 'right' ? bbox.width + this.fontSize / 2 : - this.fontSize / 2) ,
			bBoxX: bbox.x,
			bBoxWidth: bbox.width,
			y: pinY,
			// ctm: ctm,
			// sctm: sctm
		};

	}
}
