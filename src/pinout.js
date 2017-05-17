import {DOMParser, XMLSerializer} from 'xmldom';

import {
	nodeCentralPoint,
	svgToBlob,
	viewportConvert,
	viewportCoords
} from './svg-tools';

import FritzingFzpz from './fritzing/fzpz';

export default function CuwirePinout (options) {

	this.fetchCSS (options.script);

	this.bindUI (options);

	var url = this.pinoutElement.data;
	var urlSplit = url.split (/([^\/]+)\.svg$/);
	this.baseUrl = urlSplit[0];
	this.boardId = urlSplit[1];

	if (options && options.boardId) {
		this.changeBoard (options.boardId);
	}

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

CuwirePinout.prototype.fetchCSS = function (scriptSelector) {
	var embedScript = document.querySelector (scriptSelector);
	var embedCSS = this.embedCSSHref = embedScript.getAttribute ('src', 2).replace (/js($|\?.*|\#.*)/, 'css');

	var req = new XMLHttpRequest ();
	req.open('GET', embedCSS, true);
	req.addEventListener ('load', () => {
		//		console.log (req.status);
		if ((req.status === 0 && req.responseText) || req.status == 200) {
			this.embedCSSText = req.responseText;
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

	var canvas = document.getElementById("canvas");
	var ctx = canvas.getContext("2d");
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
	var linkElm = svgDoc.createElementNS("http://www.w3.org/1999/xhtml", "link");
	linkElm.setAttribute("href", this.embedCSSHref);
	linkElm.setAttribute("type", "text/css");
	linkElm.setAttribute("rel", "stylesheet");

	/*
	var style = this.createSVGNode ("style");
	style.textContent = this.embedCSSText;
	svgDoc.documentElement.insertBefore (style, svgDoc.documentElement.firstElementChild);
	*/

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

	defs.appendChild(linkElm);

	if (this.boardData)
		this.boardDataLoaded ({});
	else
		this.showLabels ();
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

CuwirePinout.prototype.showLabels = function (exclude) {

	exclude = exclude || {};

	//	this.pinoutSVGDoc = this.pinoutElement
	[].slice.apply (this.pinoutSVGDoc.querySelectorAll ('g.cuwire-pin')).forEach (function (node) {
		node.parentNode.removeChild (node);
	});

	// TODO: get names from: https://github.com/fritzing/fritzing-parts/blob/master/core/Arduino-Pro-Mini-v13-a4%2B5.fzp

	// TODO: cache data
	var req = new XMLHttpRequest ();
	req.open('GET', this.baseUrl + this.boardId + '.json', true);
	req.addEventListener ('load', function() {
		if ((req.status === 0 && req.responseText) || req.status == 200) {
			this.boardData = JSON.parse (req.responseText);

			this.boardDataLoaded (exclude);
		}

	}.bind(this));
	req.send(null);

}

CuwirePinout.prototype.boardDataLoaded = function (exclude) {

	var svgDoc = this.pinoutSVGDoc;

	var brdData = this.boardData;

	if (this.boardData instanceof FritzingFzpz) {
		brdData = this.boardData.meta.connectors;
	}

	var meta = {
		reference: ['breadboard', 'breadboard']
	};

	if (brdData.cuwire) meta = brdData.cuwire.meta;

	// let's find pin rows/columns
	var rows = {};
	var cols = {};

	Object.keys (brdData).forEach ((connectorId) => {
		if (connectorId === 'cuwire') {
			return;
		}

		var connectorNode = svgDoc.querySelector ('[id^='+connectorId+']');

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


		console.log (Object.assign (coords, {id: connectorNode.id}));
		// console.log (connectorNode);
	});

	var pitches = {};

	var pinRows = Object.keys(rows)
		// exclude parralel rows/columns; can be issue for teensy 3.1
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
		// rotate 90º
		this.rotated = 90;
	}

	var pitch = Object.keys (pitches).sort ((a, b) => pitches[b] - pitches[a])[0];

	console.log ('pitch %fmm', (pitch*this.unitsInmm).toFixed (3), pitches, pitch);

	this.pitch = parseFloat (pitch);

	console.log (this.pitch);

	this.fontSize = this.pitch * .75;

	Object.keys (brdData).forEach ((connectorId) => {
		if (connectorId === 'cuwire') {
			return;
		}

		var fn = brdData[connectorId].fn;
		var fnList = [];

		Object.keys (fn).forEach ((fnName) => {

			if (fnName.match(/^x\-/)) {
				return;
			}

			var pinData = {
				"class": fnName,
				title: fn[fnName],
				scopeNum: null,
				fn: null,
			};

			var complex = fnName.match (/^(alt-)?([^\-]+)-([^\-]+)?$/);
			// usually this is [alt-]uart-1
			if (complex) {
				if (complex[2] === 'alt') {
					complex.shift();
				}
				pinData["class"] = complex[2];
				pinData.fn = complex[2];
				if (complex[1]) {
					pinData["class"] += " alt";
				}
				if (complex[3]) {
					pinData.scopeNum = complex[3];
				}
			}

			if (exclude[pinData["class"]]) {
				return;
			}

			fnList.push (pinData);
		});

		if (brdData[connectorId].flags) {
			if (brdData[connectorId].flags["5v"]) {
				fnList.push ({"class": "5v flag", title: "➄", flag: true});
			}
			if (brdData[connectorId].flags.touch) {
				fnList.push ({"class": "touch flag", title: "☟", flag: true});
			}
		}

		//				console.log (fn, fnList);

		this.drawLabels (connectorId, fnList, brdData[connectorId].flags);
	});

	this.updateSvgLink ();
	this.updatePngLink ();
}

CuwirePinout.prototype.drawLabels = function (connectorId, labels, flags) {

	var svgDoc = this.pinoutSVGDoc;

	var connectorNode = svgDoc.querySelector ('[id^='+connectorId+']');

	if (!connectorNode)
		return;

	if (labels.constructor !== Array) {
		labels = [labels];
	}

	flags = flags || {};

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

	labels.forEach (function (labelMeta) {
		labelMeta = Object.create (labelMeta);
		if (labelOffset) {
			labelMeta.x = labelOffset.x;
			labelMeta.y = labelOffset.y;
		} else {
			labelMeta.x = 0; // pinX;
			labelMeta.y = 0; // pinY;
			labelMeta.begin = true;
			if (flags.pwm) {
				labelMeta.pwm = true;
			}
		}

		labelOffset = this.labelForPin (g, side, labelMeta);

		//		var pnt = svgDoc.documentElement.createSVGPoint();
		//		pnt.x = labelOffset.x;
		//		pnt.y = labelOffset.y;
		//
		//
		//		var SCTM = labelOffset.sctm;
		//		var iPNT = pnt.matrixTransform (SCTM); //SCTM.inverse()
		//
		//		console.log ('&&&&&&&', iPNT.x, iPNT.y);
		//
		//		if (side === 'right' && iPNT.x > labelMaxX) {
		//			labelMaxX = iPNT.x;
		//		}
		//		if (side !== 'right' && iPNT.x < labelMinX) {
		//			labelMinX = iPNT.x;
		//		}
	}.bind(this));

	// TODO: get actual adjustment to viewBox

	svgDoc.documentElement.setAttribute ("preserveAspectRatio", "xMinYMid meet");

	//	var viewBox = svgDoc.documentElement.getAttribute ('viewBox').split (' ');
	//
	//	console.log ('labelminx:', labelMinX, fontSize, pitch);
	//	labelMinX = (Math.min (parseFloat (viewBox[0]), labelMinX - fontSize));
	//	labelMaxX = (Math.max (parseFloat (viewBox[2]), labelMaxX - fontSize));
	//
	//	svgDoc.documentElement.setAttribute (
	//		'viewBox',
	//		[labelMinX, viewBox[1], labelMaxX, viewBox[3]].join (' ')
	//	);
	//	svgDoc.documentElement.setAttribute (
	//		'width',
	//		labelMaxX - labelMinX + pitch
	//	);

	var svgBBox = svgDoc.documentElement.getBBox();
	svgDoc.documentElement.setAttribute (
		'viewBox',
		[svgBBox.x, svgBBox.y, svgBBox.x + svgBBox.width, svgBBox.y + svgBBox.height].join (' ')
	);

	svgDoc.documentElement.setAttribute (
		'width',
		svgBBox.width
	);

	svgDoc.documentElement.setAttribute (
		'height',
		svgBBox.height
	);

}

CuwirePinout.prototype.labelForPin = function (containerGroup, side, labelMeta) {

	var svgDoc = this.pinoutSVGDoc;

	// var pinSelector = arguments.shift();

	var labelTitle = labelMeta.title;

	var pinX = labelMeta.x;
	var pinY = labelMeta.y;

	var g = this.createSVGNode ("g", {
		class: 'cuwire-pin '+labelMeta.class,
		//		transform: "rotate("+(rotated ? -90 : 0)+" "+pinX+" "+pinY+")",
		// x: pinX+10,
		// y: pinY,
		// "font-size": fontSize,
		// fill: "white"
	});

	containerGroup.appendChild(g);

	var labelTextOffset = (side === 'right' ? 1 : -1) * this.fontSize * (labelMeta.begin ? 2 : 1);

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

	if (labelMeta.fn) {
		if (labelMeta.scopeNum) {
		var scopeIdText = this.createSVGNode ("text", {
			x: pinX + labelTextOffset + this.fontSize/10 + (side === 'right' ? 0 : -1) * bbox.width,
			y: pinY,
			"font-size": this.fontSize / 2,
			// fill: "white",
			"dominant-baseline": "hanging",
			"text-anchor": 'start', //side === 'right' ? "start" : 'end'
		});

		scopeIdText.textContent = labelMeta.scopeNum;

		g.appendChild (scopeIdText);
		}

		var x = pinX + labelTextOffset - this.fontSize/5 + (side === 'right' ? 0 : -1) * bbox.width,
			y = pinY;
		var scopeNameText = this.createSVGNode ("text", {
			x: x,
			y: y,
			"font-size": this.fontSize / 2,
			"font-weight": "bold",
			// fill: "white",
			"dominant-baseline": "central",
			"text-anchor": 'middle', //side === 'right' ? "start" : 'end'
			transform: "rotate(-90, " + x + ", " + y + ")",
		});

		scopeNameText.textContent = labelMeta.fn;

		g.appendChild (scopeNameText);

	}

	// connectorNode.parentElement.insertBefore (text, connectorNode.nextSibling);

	// text.setAttribute ('y', pinY + bbox.height / 2);

	// bbox = text.getBBox();

	var lineRect = {
		x1: bbox.x + (side === 'right' ? - this.fontSize /2 : bbox.width + this.fontSize /2),
		y1: bbox.y + bbox.height / 2,
		x2: pinX,
		y2: pinY,
	};

	// TODO: remove stroke width from line x
	if (labelMeta.begin && labelMeta.pwm) {
		var path = this.createSVGNode ("path", {
			d: [
				"M"+[lineRect.x1, lineRect.y1].join (','),
				"l"+[(lineRect.x2-lineRect.x1)/8, 0].join (','),
				"l"+[0, this.fontSize/4].join (','),
				"l"+[(lineRect.x2-lineRect.x1)/8, 0].join (','),
				"l"+[0, -this.fontSize/2].join (','),
				"l"+[(lineRect.x2-lineRect.x1)/8, 0].join (','),
				"l"+[0, this.fontSize/4].join (','),
				"l"+[(lineRect.x2-lineRect.x1)/8, 0].join (','),
				/*"C"+[lineRect.x1 + (lineRect.x2-lineRect.x1)/2, lineRect.y2 - Math.abs (labelTextOffset/2)].join (','),
				[lineRect.x1 + (lineRect.x2-lineRect.x1)/2, lineRect.y2 + Math.abs (labelTextOffset/2)].join (','),
				[lineRect.x2-(lineRect.x2-lineRect.x1)/4, lineRect.y2].join (','),
				*/
				"l"+[(lineRect.x2-lineRect.x1)/2, 0].join (','),
			].join (' '),
			"stroke-width": this.fontSize/8,
		});

		g.insertBefore (path, rect);
	} else if (labelMeta.begin && labelMeta.dac) {
		var path = this.createSVGNode ("path", {
			d: [
				"M"+[lineRect.x1, lineRect.y1].join (','),
				"l"+[(lineRect.x2-lineRect.x1)/8, 0].join (','),
				"C"+[lineRect.x1 + (lineRect.x2-lineRect.x1)*3/8, lineRect.y2 - Math.abs (labelTextOffset/2)].join (','),
				[lineRect.x1 + (lineRect.x2-lineRect.x1)/4, lineRect.y2 + Math.abs (labelTextOffset/2)].join (','),
				[lineRect.x2-(lineRect.x2-lineRect.x1)/2, lineRect.y2].join (','),
				"l"+[(lineRect.x2-lineRect.x1)/2, 0].join (','),
			].join (' '),
			"stroke-width": this.fontSize/8,
		});

		g.insertBefore (path, rect);
	} else if (!labelMeta.flag) {
		var line = this.createSVGNode ("line", {
			x1: lineRect.x1,
			x2: lineRect.x2,
			y1: lineRect.y1,
			y2: lineRect.y2,
			"stroke-width": this.fontSize/8,
		});

		g.insertBefore (line, rect);
	}


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

	if (!labelMeta.flag)
		g.insertBefore (rect, text);
	// connectorNode.parentElement.insertBefore (rect, c25.nextSibling);

	// c25.parentElement.insertBefore (line, c25.nextSibling);

	// g.appendChild (line);
	// g.appendChild (rect);
	// g.appendChild (text);

	// c25.parentElement.insertBefore (path, c25.nextSibling);

	if (labelMeta.scopeNum) {
		text.setAttribute ("x", parseFloat(text.getAttribute("x")) + this.fontSize/2.5);
		var textOffset = this.fontSize * 1;
	}

	return {
		x: bbox.x + (side === 'right' ? bbox.width + this.fontSize / 2 : - this.fontSize / 2) ,
		bBoxX: bbox.x,
		bBoxWidth: bbox.width,
		y: pinY,
		ctm: ctm,
		sctm: sctm
	};

}
