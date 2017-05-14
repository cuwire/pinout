
// TODO: remove that
//var pitch;
//var fontSize;
//var rotated = 0;

function CuwirePinout (svgObjSelector, scriptSelector, options) {
	var embedScript = document.querySelector (scriptSelector);
	var embedCSS = embedScript.getAttribute ('src', 2).replace (/js($|\?.*|\#.*)/, 'css');

	var req = new XMLHttpRequest ();
	req.open('GET', embedCSS, true);
	req.addEventListener ('load', function() {
		if (req.status == 200) {
			this.embedCSSText = req.responseText;

			// TODO: add event emit
			var openForSaveBtn = document.getElementById ('open-for-save');
			if (openForSaveBtn) {
				openForSaveBtn.disabled = false;
				openForSaveBtn.onclick = function () {
					this.openNewWindow();
					return false;
				}.bind (this)
			}
		}
	}.bind (this));
	req.send (null);

	this.pinoutElement = svgObjSelector instanceof Node ? svgObjSelector : document.querySelector (svgObjSelector);


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

CuwirePinout.prototype.changeBoard = function (boardId) {
	this.boardId = boardId;

	// TODO: move to boardChange function
	this.pinoutElement.style.visibility = null;
	this.pinoutElement.setAttribute ('data', this.baseUrl + this.boardId + '.svg');
	this.pinoutElement.style.visibility = "visible";
}

CuwirePinout.prototype.openNewWindow = function () {
	var svgDoc = this.pinoutSVGDoc;
	var style = this.createSVGNode ("style");
	style.textContent = this.embedCSSText;
	svgDoc.documentElement.insertBefore (style, svgDoc.documentElement.firstElementChild);

	var serializer = new XMLSerializer();
	var svg_blob = new Blob(
		[serializer.serializeToString(svgDoc)],
		{'type': "image/svg+xml"}
	);

	var url = URL.createObjectURL(svg_blob);

	var svg_win = window.open(url, "svg_win");
}


CuwirePinout.prototype.initSVGDoc = function () {
	var svgDoc = this.pinoutSVGDoc = this.pinoutElement.getSVGDocument();
	var linkElm = svgDoc.createElementNS("http://www.w3.org/1999/xhtml", "link");
	linkElm.setAttribute("href", "../embed.css");
	linkElm.setAttribute("type", "text/css");
	linkElm.setAttribute("rel", "stylesheet");

	var defs = svgDoc.querySelector ('defs');
	if (!defs) {
		defs = this.createSVGNode ("defs");
		svgDoc.documentElement.insertBefore (defs, svgDoc.documentElement.firstElementChild);
	}

	defs.appendChild(linkElm);

	this.showLabels();
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

function nodeCentralPoint (node) {
	if (!node) console.trace (node);
	var bbox = node.getBBox();
	return {x: bbox.x + bbox.width/2, y: bbox.y + bbox.height/2}
}

CuwirePinout.prototype.showLabels = function (exclude) {

	exclude = exclude || {};

	//	this.pinoutSVGDoc = this.pinoutElement
	[].slice.apply (this.pinoutSVGDoc.querySelectorAll ('g.cuwire')).forEach (function (node) {
		node.parentNode.removeChild (node);
	});

	// TODO: get names from: https://github.com/fritzing/fritzing-parts/blob/master/core/Arduino-Pro-Mini-v13-a4%2B5.fzp

	// TODO: cache data

	var req = new XMLHttpRequest ();
	req.open('GET', this.baseUrl + this.boardId + '.json', true);
	req.addEventListener ('load', function() {
		if (req.status == 200) {
			this.boardData = JSON.parse (req.responseText);

			this.boardDataLoaded (exclude);
		}

	}.bind(this));
	req.send(null);

}

CuwirePinout.prototype.boardDataLoaded = function (exclude) {

	var brdData = this.boardData;
	var svgDoc = this.pinoutSVGDoc;

	var meta = brdData.cuwire.meta;

	// TODO: get sibling nodes
	var refPin0 = svgDoc.querySelector ('[id^='+meta.reference[0]+']');

	var refPin1 = svgDoc.querySelector ('[id^='+meta.reference[1]+']');

	// console.log (meta.reference[0], refPin0, meta.reference[1], refPin1);

	var refPin0CP = nodeCentralPoint (refPin0);
	var refPin1CP = nodeCentralPoint (refPin1);

	var deltaX = refPin0CP.x - refPin1CP.x;
	var deltaY = refPin0CP.y - refPin1CP.y;

	this.pitch = Math.abs (deltaY);
	if (Math.abs (deltaX) > Math.abs (deltaY)) {
		this.rotated = (deltaX === Math.abs (deltaX) ? 180 : 0) - 90;
		this.pitch = Math.abs (deltaX);
	} else {
		this.rotated = deltaY === Math.abs (deltaY) ? 180 : 0;
	}

	this.fontSize = this.pitch * .75;

	Object.keys (brdData).forEach (function (connector) {
		if (connector === 'cuwire') {
			return;
		}
		var side = brdData[connector].side;

		var fn = brdData[connector].fn;
		var fnList = [];

		Object.keys (fn).forEach (function (fnName) {

			if (fnName.match(/^x\-/)) {
				return;
			}

			var pinData = {
				"class": fnName,
				title: fn[fnName],
				scopeNum: null,
				fn: fnName,
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

		if (brdData[connector].flags) {
			if (brdData[connector].flags["5v"]) {
				fnList.push ({"class": "5v flag", title: "➄", flag: true});
			}
			if (brdData[connector].flags.touch) {
				fnList.push ({"class": "touch flag", title: "☟", flag: true});
			}
		}

		//				console.log (fn, fnList);
		this.drawLabels (connector, side, fnList, brdData[connector].flags);
	}.bind (this));
}

CuwirePinout.prototype.drawLabels = function (pinSelector, side, labels, flags) {
	var svgDoc = this.pinoutSVGDoc;

	if (labels.constructor !== Array) {
		labels = [labels];
	}

	flags = flags || {};

	var labelOffset;
	var labelMinX = 0;
	var labelMaxX = 0;

	var connectorNode = svgDoc.querySelector ('[id^='+pinSelector+']');

	if (!connectorNode)
		return;

	var connectorCenter = nodeCentralPoint (connectorNode);

	var pinX = connectorCenter.x;
	var pinY = connectorCenter.y;

	var g = this.createSVGNode ("g", {
		class: 'cuwire-pin',
		transform: "rotate("+this.rotated+" "+pinX+" "+pinY+")",
		// x: pinX+10,
		// y: pinY,
		// "font-size": fontSize,
		// fill: "white"
	});

	connectorNode.parentElement.insertBefore (g, connectorNode.nextSibling);

	labels.forEach (function (labelMeta) {
		labelMeta = Object.create (labelMeta);
		if (labelOffset) {
			labelMeta.x = labelOffset.x;
			labelMeta.y = labelOffset.y;
		} else {
			labelMeta.x = pinX;
			labelMeta.y = pinY;
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
				"l"+[(lineRect.x2-lineRect.x1)/4, 0].join (','),
				"C"+[lineRect.x1 + (lineRect.x2-lineRect.x1)/2, lineRect.y2 - Math.abs (labelTextOffset/2)].join (','),
				[lineRect.x1 + (lineRect.x2-lineRect.x1)/2, lineRect.y2 + Math.abs (labelTextOffset/2)].join (','),
				[lineRect.x2-(lineRect.x2-lineRect.x1)/4, lineRect.y2].join (','),
				"l"+[(lineRect.x2-lineRect.x1)/4, 0].join (','),
			].join (' '),
			"stroke-width": this.fontSize/5,
		});

		g.insertBefore (path, rect);
	} else if (!labelMeta.flag) {
		var line = this.createSVGNode ("line", {
			x1: lineRect.x1,
			x2: lineRect.x2,
			y1: lineRect.y1,
			y2: lineRect.y2,
			"stroke-width": this.fontSize/5,
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



