var boardImg = document.querySelector ('#board-image-tab object');
if (boardImg) {
	boardImg.style.height = boardImg.parentElement.parentElement.clientHeight - 60 + 'px';
	boardImg.style.margin =  "0 " + parseInt((boardImg.parentElement.parentElement.clientWidth - boardImg.width)/2) + "px";
}

var baseUrl = '';
var dataFile = 'pro.json';

function boardChanged () {
	var select = document.getElementById ('boardId');
	console.log (select.selectedIndex, select.value);

	window.location.hash = '#' + select.value;

	var boardImg = document.getElementById ('boardImage');
	boardImg.style.visibility = null;
	boardImg.setAttribute ('data', baseUrl + select.value + '.svg');
	boardImg.style.visibility = "visible";

	dataFile = baseUrl + select.value + '.json';
	// showLabels();
}

var svgNS = "http://www.w3.org/2000/svg";

function createSVGNode (doc, nodeName, attrs) {
	var theNode = doc.createElementNS (svgNS, nodeName);
	for (var attrName in attrs) {
		theNode.setAttributeNS (null, attrName, attrs[attrName]);
	}
	return theNode;
}


// TODO: remove that
var pitch;
var fontSize;
var rotated = 0;

function drawLabels (svgDoc, pinSelector, side, labels) {
	if (labels.constructor !== Array) {
		labels = [labels];
	}

	var labelOffset;
	var labelMinX = 0;
	var labelMaxX = 0;

	var connectorNode = svgDoc.querySelector ('[id^='+pinSelector+']');

	if (!connectorNode)
		return;

	var connectorCenter = nodeCentralPoint (connectorNode);

	var pinX = connectorCenter.x;
	var pinY = connectorCenter.y;

	var g = createSVGNode (svgDoc, "g", {
		class: 'cuwire',
		transform: "rotate("+rotated+" "+pinX+" "+pinY+")",
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
		}

		labelOffset = labelForPin (svgDoc, g, side, labelMeta);

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
	});

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


function labelForPin (svgDoc, containerGroup, side, labelMeta) {

	// var pinSelector = arguments.shift();

	var labelTitle = labelMeta.title;

	var pinX = labelMeta.x;
	var pinY = labelMeta.y;

	var g = createSVGNode (svgDoc, "g", {
		class: 'cuwire '+labelMeta.class,
//		transform: "rotate("+(rotated ? -90 : 0)+" "+pinX+" "+pinY+")",
		// x: pinX+10,
		// y: pinY,
		// "font-size": fontSize,
		// fill: "white"
	});

	containerGroup.appendChild(g);

	var textOffset = (side === 'right' ? 1 : -1)*fontSize;
	var text = createSVGNode (svgDoc, "text", {
		x: pinX + textOffset,
		y: pinY,
		"font-size": fontSize,
		// fill: "white",
		"dominant-baseline": "central",
		"text-anchor": side === 'right' ? "start" : 'end'
	});

	text.textContent = labelTitle;

	g.appendChild (text);
	// connectorNode.parentElement.insertBefore (text, connectorNode.nextSibling);

	var bbox = text.getBBox();
	var ctm  = text.getCTM();
	var sctm = text.getScreenCTM();


	// text.setAttribute ('y', pinY + bbox.height / 2);

	// bbox = text.getBBox();

	// TODO: remove stroke width from line x
	var line = createSVGNode (svgDoc, "line", {
		x1: bbox.x + (side === 'right' ? - fontSize /2 : bbox.width + fontSize /2),
		y1: bbox.y + bbox.height / 2,
		x2: pinX,
		y2: pinY,
		"stroke-width": fontSize/5,
	});

	g.insertBefore (line, rect);


	var rect = createSVGNode (svgDoc, "rect", {
		x: bbox.x - fontSize / 2,
		y: bbox.y,
		width: bbox.width + fontSize,
		height: bbox.height,
		rx: fontSize/5,
		ry: fontSize/5,
		"stroke-width": fontSize / 10
	});

	// stroke="black" stroke-width="20" stroke-linecap="round"/>

	g.insertBefore (rect, text);
	// connectorNode.parentElement.insertBefore (rect, c25.nextSibling);

	// c25.parentElement.insertBefore (line, c25.nextSibling);

	// g.appendChild (line);
	// g.appendChild (rect);
	// g.appendChild (text);

	// c25.parentElement.insertBefore (path, c25.nextSibling);

	return {
		x: bbox.x + (side === 'right' ? bbox.width + fontSize / 2 : - fontSize / 2) ,
		bBoxX: bbox.x,
		bBoxWidth: bbox.width,
		y: pinY,
		ctm: ctm,
		sctm: sctm
	};

}

function nodeCentralPoint (node) {
	if (!node) console.trace (node);
	var bbox = node.getBBox();
	return {x: bbox.x + bbox.width/2, y: bbox.y + bbox.height/2}
}

var brdData;

function showLabels (exclude) {

	exclude = exclude || {};

	var svgO = document.querySelector ('object');

	var sss = svgO.getSVGDocument ();

	[].slice.apply (sss.querySelectorAll ('g.cuwire')).forEach (function (node) {
		node.parentNode.removeChild (node);
	});

	// TODO: get names from: https://github.com/fritzing/fritzing-parts/blob/master/core/Arduino-Pro-Mini-v13-a4%2B5.fzp

	var req = new XMLHttpRequest ();
	req.open('GET', dataFile, true);
	req.addEventListener ('load', function() {
		if (req.status == 200) {
			brdData = JSON.parse (req.responseText);

			var meta = brdData.cuwire.meta;

			// TODO: get sibling nodes
			var refPin0 = sss.querySelector ('[id^='+meta.reference[0]+']');

			var refPin1 = sss.querySelector ('[id^='+meta.reference[1]+']');

			// console.log (meta.reference[0], refPin0, meta.reference[1], refPin1);

			var refPin0CP = nodeCentralPoint (refPin0);
			var refPin1CP = nodeCentralPoint (refPin1);

			var deltaX = refPin0CP.x - refPin1CP.x;
			var deltaY = refPin0CP.y - refPin1CP.y;

			pitch = Math.abs (deltaY);
			if (Math.abs (deltaX) > Math.abs (deltaY)) {
				rotated = (deltaX === Math.abs (deltaX) ? 180 : 0) - 90;
				pitch = Math.abs (deltaX);
			} else {
				rotated = deltaY === Math.abs (deltaY) ? 180 : 0;
			}

			fontSize = pitch * .75;

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

					if (exclude[fnName]) {
						return;
					}

					var pinData = {"class": fnName, title: fn[fnName]}
					var complex = fnName.match (/^(alt-)?([^\-]+)-([^\-]+)?$/);
					if (complex) {
						if (complex[2] === 'alt') {
							complex.shift();
						}
						pinData["class"] = complex[2];
						if (complex[1]) {
							pinData["class"] += " alt";
						}
						if (complex[3]) {
							pinData.title = pinData.title + complex[3];
						}
					}

					fnList.push (pinData);
				});

				if (brdData[connector].flags) {
					if (brdData[connector].flags.pwm) {
						fnList.push ({"class": "pwm", title: "~"});
					}

					if (brdData[connector].flags.touch) {
						fnList.push ({"class": "touch", title: "☜"});
					}
				}

//				console.log (fn, fnList);
				drawLabels (sss, connector, side, fnList);
			});
		}

	});
	req.send(null);


}




document.addEventListener("DOMContentLoaded", function(event) {

//	var embedScript = document.getElementById ('cuwire-pinout');
//	var embedCSS = embedScript.getAttribute ('src', 2).replace (/js$/, 'css');

	var boardImg = document.getElementById ('boardImage');

	var url = boardImg.data;
	baseUrl = url.replace (/[^\/]+\.svg$/, '')

	console.log ();

	if (window.location.hash) {

		var boardId = window.location.hash.replace ('#', '');

		boardImg.style.visibility = null;
		boardImg.setAttribute ('data', baseUrl + boardId + '.svg');
		boardImg.style.visibility = "visible";

		dataFile = baseUrl + boardId + '.json';

		var boardSelectForm = document.getElementById ('boardId');
		boardSelectForm.value = boardId;
	}

	boardImg.addEventListener ('load', function () {

		var svgDoc = boardImg.getSVGDocument();
		var linkElm = svgDoc.createElementNS("http://www.w3.org/1999/xhtml", "link");
		linkElm.setAttribute("href", "../embed.css");
		linkElm.setAttribute("type", "text/css");
		linkElm.setAttribute("rel", "stylesheet");


		var defs = svgDoc.querySelector ('defs');
		if (!defs) {
			defs = createSVGNode (svgDoc, "defs");
			svgDoc.documentElement.insertBefore (defs, svgDoc.documentElement.firstElementChild);
		}

		defs.appendChild(linkElm);

		showLabels();
	});

});
