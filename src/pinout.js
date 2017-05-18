import {DOMParser, XMLSerializer} from 'xmldom';

import {
	nodeCentralPoint,
	svgToBlob,
	viewportConvert,
	viewportCoords,
	showWholeSVG
} from './svg-tools';

import FritzingFzpz from './fritzing/fzpz';

import {convertJsonMeta} from './legacy';

export default function CuwirePinout (options = {}) {

	this.bindUI (options);

	var url = this.pinoutElement.data;
	var urlSplit = url.split (/([^\/]+)\.svg$/);
	this.baseUrl = urlSplit[0];
	this.boardId = urlSplit[1];

	this.pinoutElement.data = '';

	this.fetchCSS (options.script, () => {
		this.changeBoard (options.boardId || url);
	});

	// console.log (this.baseUrl); // , embedCSS);

	// element can be loaded or still loading. if element is loading, getSVGDocument will throw exception
	try {
		if (this.pinoutElement.getSVGDocument()) {
			this.initSVGDoc ();
		}
	} catch (e) {

	}

	this.pinoutElement.addEventListener ('load', this.initSVGDoc.bind (this));
}

function githubCORSUrl (githubUrl) {
	return githubUrl
		.replace (/^https\:\/\/github\.com/, "https://cdn.rawgit.com")
		.replace (/\/blob/, "")
}

CuwirePinout.prototype.fetchCSS = function (scriptSelector, cb) {
	var embedScript = document.querySelector (scriptSelector);
	var embedCSS = this.embedCSSHref = embedScript.getAttribute ('src', 2).replace (/js($|\?.*|\#.*)/, 'css');

	var req = new XMLHttpRequest ();
	req.open('GET', embedCSS, true);
	req.addEventListener ('load', () => {
		//		console.log (req.status);
		if ((req.status === 0 && req.responseText) || req.status == 200) {
			this.embedCSSText = req.responseText;
			cb && cb (null);
		}
	}, false);
	//	req.addEventListener ("loadend", function (e) {
	//		console.log ('loadend', e);
	//		console.log (req.status);
	//	}, false);
	req.send (null);
}

CuwirePinout.prototype.bindUI = function (options = {}) {

	var containerEl;
	if (options.container) {
		containerEl = options.container instanceof Node
			? options.container
			: document.querySelector (options.container);

		console.log (containerEl, options.container);

		// actually, UI contains view object, p to show status and optional buttons to export data
		// no need to use frameworks here
		if (containerEl.childNodes.length === 0 || containerEl.textContent.match (/^[\s\t\n\r]*$/)) {
			this.buildUI ();
		}

		this.container = containerEl;
	}

	if (!options.view)
		options.view = 'object'; // use first object element

	this.pinoutElement = options.view instanceof Node ? options.view : (containerEl || document).querySelector (options.view);

	// safari export as octet stream is fixed, no need in this code anymore
	/*
	// TODO: add event emit
	var openForSaveBtn = (containerEl || document).querySelector ('#open-for-save');
	if (openForSaveBtn) {
		openForSaveBtn.disabled = false;
		openForSaveBtn.onclick = () => {
			this.openNewWindow();
			return false;
		}
	}
	*/



	this.sizeInfo = (containerEl || document).querySelector (options.sizeInfo);

	this.exportSvgLink = (containerEl || document).querySelector (options.exportSvg);

	this.exportPngLink = (containerEl || document).querySelector (options.exportPng);
}

CuwirePinout.prototype.setViewData = function (url, svgSource) {

	var svg, svgOctetStream;
	// svg string
	if (svgSource) {
		svg = svgToBlob (svgSource);
	} else {
		svg = url;
	}

	this.pinoutElement.setAttribute ('type', 'image/svg+xml');
	this.pinoutElement.setAttribute ('data', svg);
	this.pinoutElement.style.visibility = "visible";

}

CuwirePinout.prototype.changeBoard = function (boardId) {
	this.boardId = boardId;

	console.log ('changeboard called', boardId);

	// TODO: move to boardChange function
	this.pinoutElement.style.visibility = null;
	if (boardId.match (/^https?\:\/\/.*fzpz(?:$|\?)/)) {
		console.log ('fzpz');
		return FritzingFzpz.loadFromUrl (githubCORSUrl (boardId)).then (fzpz => {
			this.setViewData (boardId, fzpz.files.breadboard.contents);

			this.boardData = fzpz;

			return fzpz;
		}, err => {
			console.error (err);
		});


	} else {
		this.setViewData (this.baseUrl + this.boardId + '.svg');
		this.boardData = null;
	}
}

CuwirePinout.prototype.openNewWindow = function () {
	var svgDoc = this.pinoutSVGDoc;
	var style = this.createSVGNode ("style");
	style.textContent = this.embedCSSText;
	svgDoc.documentElement.insertBefore (style, svgDoc.documentElement.firstElementChild);

	var url = svgToBlob (svgDoc);

	var svg_win = window.open(url, "svg_win");
}

CuwirePinout.prototype.updateSizeInfo = function () {

	if (!this.sizeInfo)
		return;

	this.sizeInfo.innerHTML =
		'w: ' + this.metricWidth.toFixed (2) + 'mm, ' +
		'h: ' + this.metricHeight.toFixed (2) + 'mm, ' +
		'pitch: ' + (this.pitch * this.unitsInmm).toFixed (2) + 'mm'

}


CuwirePinout.prototype.updateSvgLink = function () {

	if (!this.exportSvgLink)
		return;

	this.exportSvgLink.disabled = false;

	var url = svgToBlob (this.pinoutSVGDoc, {type: "octet/stream"});

	this.exportSvgLink.href = url;
	// TODO: use real url
	this.exportSvgLink.download = 'pinout.svg';
	// window.URL.revokeObjectURL(url);

}

CuwirePinout.prototype.updatePngLink = function () {

	if (!this.exportPngLink)
		return;

	this.exportPngLink.disabled = false;

	var url = svgToBlob (this.pinoutSVGDoc);

	var canvas = document.createElement ("canvas");
	var ctx = canvas.getContext ("2d");
	var img = new Image();
	img.onload = () => {
		ctx.drawImage (img, 0, 0);
		var png = canvas.toDataURL ("image/png");

		this.exportPngLink.href = png.replace (/^data:image\/png/, 'data:octet/stream');
		this.exportPngLink.download = 'pinout.png';

		window.URL.revokeObjectURL(png);
		// window.URL.revokeObjectURL(url);
	};

	img.src = url;
}


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

CuwirePinout.prototype.initSVGDoc = function () {
	var svgDoc = this.pinoutSVGDoc = this.pinoutElement.getSVGDocument();
	/*
	var linkElm = svgDoc.createElementNS("http://www.w3.org/1999/xhtml", "link");
	linkElm.setAttribute("href", this.embedCSSHref);
	linkElm.setAttribute("type", "text/css");
	linkElm.setAttribute("rel", "stylesheet");
	*/

	var style = this.createSVGNode ("style");
	style.textContent = this.embedCSSText;
	svgDoc.documentElement.insertBefore (style, svgDoc.documentElement.firstElementChild);

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

	if (this.boardData)
		this.drawLabels ({});
	else
		this.fetchJsonLabels ({});
}

var svgNS = "http://www.w3.org/2000/svg";

CuwirePinout.prototype.createSVGNode = function (nodeName, attrs) {
	var doc = this.pinoutSVGDoc;
	var theNode = doc.createElementNS (svgNS, nodeName);
	for (var attrName in attrs) {
		theNode.setAttributeNS (null, attrName, attrs[attrName]);
	}
	return theNode;
}

CuwirePinout.prototype.fetchJsonLabels = function (exclude = {}) {

	// TODO: get names from: https://github.com/fritzing/fritzing-parts/blob/master/core/Arduino-Pro-Mini-v13-a4%2B5.fzp

	// TODO: cache data
	var req = new XMLHttpRequest ();
	req.open('GET', this.baseUrl + this.boardId + '.json', true);
	req.addEventListener ('load', function() {
		if ((req.status === 0 && req.responseText) || req.status == 200) {
			this.boardData = JSON.parse (req.responseText);

			this.drawLabels (exclude);
		}

	}.bind(this));
	req.send(null);

}

CuwirePinout.prototype.getPinRowsOrientation = function () {

	var svgDoc  = this.pinoutSVGDoc;
	var svgRoot = svgDoc.documentElement;

	var brdData = this.boardData;

	if (this.boardData instanceof FritzingFzpz) {
		brdData = this.boardData.meta.connectors;
	}

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
			? svgDoc.querySelector ('#'+brdData[connectorId].svgId)
			: svgDoc.querySelector ('[id^='+connectorId+']');

		if (!connectorNode)
			return;

		// var coords = viewportCoords (connectorNode);
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

	console.log (pinRows);
	console.log (pinCols);

	// assume longest pin set to be vertical
	if (maxColLength > maxRowLength) {
		// no rotation
		this.rotated = 0;
	} else {

		var point = nodeCentralPoint (svgRoot);

		var rotatedG = this.createSVGNode ('g', {'transform': 'rotate (90,' + point.x + ',' + point.y + ')'});

		while (svgRoot.childNodes.length > 0) {
			rotatedG.appendChild(svgRoot.childNodes[0]);
		}

		svgRoot.appendChild (rotatedG);

		[this.metricHeight, this.metricWidth] = [this.metricWidth, this.metricHeight];

		// console.log ('main g', svgDoc.querySelectorAll ('svg>g'));

		// rotate 90º
		this.rotated = 0;
	}

	var pitch = Object.keys (pitches).sort ((a, b) => pitches[b] - pitches[a])[0];

	console.log ('pitch %fmm', (pitch * this.unitsInmm).toFixed (3), pitches, pitch);

	this.pitch = parseFloat (pitch);

	this.fontSize = this.pitch * .75;
}


CuwirePinout.prototype.drawLabels = function (exclude = {}) {

	var svgDoc  = this.pinoutSVGDoc;
	var svgRoot = svgDoc.documentElement;

	var brdData = this.boardData;

	if (this.boardData instanceof FritzingFzpz) {
		brdData = this.boardData.meta.connectors;
	}

	//	this.pinoutSVGDoc = this.pinoutElement
	[].slice.apply (svgDoc.querySelectorAll ('g.cuwire-pin')).forEach (function (node) {
		node.parentNode.removeChild (node);
	});

	// console.log (brdData);

	this.getPinRowsOrientation ();

	this.center = nodeCentralPoint (svgRoot);

	var pinoutNode = svgDoc.querySelector ('g.pinout');
	if (!pinoutNode) {
		pinoutNode = this.createSVGNode ('g', {'class': 'pinout'});
		svgRoot.appendChild (pinoutNode);
	}

	this.pinoutNode = pinoutNode;

	var defs = svgDoc.querySelector ('defs');
	if (!defs) {
		defs = this.createSVGNode ("defs");
		svgRoot.insertBefore (defs, svgRoot.firstElementChild);
	}

	Object.keys (brdData).forEach ((connectorId) => {

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

	this.updateSvgLink ();
	this.updatePngLink ();
	this.updateSizeInfo ();

}

// http://www.petercollingridge.co.uk/data-visualisation/mouseover-effects-svgs

CuwirePinout.prototype.drawPin = function (connectorId, pinData) {

	var svgDoc = this.pinoutSVGDoc;

	// console.log (pinData);

	var connectorNode = pinData.svgId
		? svgDoc.querySelector ('#'+pinData.svgId)
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
		transform: "translate("+coords.x+", "+coords.y+") rotate("+this.rotated+")",
		'data-side': side,
		for: connectorId,
		// transform: "rotate("+this.rotated+" "+pinX+" "+pinY+")",
		// x: pinX+10,
		// y: pinY,
		// "font-size": fontSize,
		// fill: "white"
	});

	this.pinoutNode.appendChild (g);

	var labelOffset = this.wireForPin (g, side, pinData, coords);

	pinData.fn.forEach ((labelData) => {

		labelOffset = this.labelForPin (g, side, labelData, labelOffset);

	});

}

CuwirePinout.prototype.wireForPin = function (g, side, pinData, coords) {

	var svgDoc = this.pinoutSVGDoc;

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

		g.appendChild (path);
	} else {
		var line = this.createSVGNode ("line", {
			x1: 0,
			x2: lineRect.x2,
			y1: lineRect.y1,
			y2: lineRect.y2,
			"stroke-width": this.fontSize/8,
		});

		g.appendChild (line);
	}

	return {
		x: lineRect.x2,
		y: 0
	}
}

CuwirePinout.prototype.labelForPin = function (containerGroup, side, labelMeta, coords) {

	var svgDoc = this.pinoutSVGDoc;

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

	containerGroup.appendChild(g);

	var labelTextOffset = (side === 'right' ? 1 : -1) * this.fontSize;

	var text = this.createSVGNode ("text", {
		x: pinX + labelTextOffset,
		y: pinY,
		"font-size": this.fontSize,
		// fill: "white",
		"dominant-baseline": "central",
		"text-anchor": side === 'right' ? "start" : 'end'
	});

	text.textContent = labelTitle;

	g.appendChild (text);

	var bbox = text.getBBox();
	var ctm  = text.getCTM();
	var sctm = text.getScreenCTM();

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
		y: bbox.y,
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

	return {
		x: bbox.x + (side === 'right' ? bbox.width + this.fontSize / 2 : - this.fontSize / 2) ,
		bBoxX: bbox.x,
		bBoxWidth: bbox.width,
		y: pinY,
		ctm: ctm,
		sctm: sctm
	};

}
