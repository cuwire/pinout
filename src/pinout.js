import {DOMParser, XMLSerializer} from 'xmldom';

import {
	nodeCentralPoint,
	svgToBlob,
	viewportConvert,
	viewportCoords,
	showWholeSVG
} from './svg-tools';

import FritzingFzpz from './fritzing/fzpz';

import SVGAndJSON from './svg-and-json';

import SVGView from './view/svg';

const svgNS = "http://www.w3.org/2000/svg";

function githubCORSUrl (githubUrl) {
	return githubUrl
		.replace (/^https\:\/\/github\.com/, "https://cdn.rawgit.com")
		.replace (/\/blob/, "")
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


export default class CuwirePinout {

	constructor (options = {}) {

		this.bindUI (options);

		var url = this.pinoutElement.data;
		var urlSplit = url.split (/([^\/]+)\.svg$/);
		this.baseUrl = urlSplit[0];
		this.boardId = urlSplit[1];

		this.pinoutElement.data = '';

		this.fetchCSS (options.script, () => {
			SVGView.css = this.embedCSSText;
			this.changeBoard (options.boardId || url);
		});

		return;

		// console.log (this.baseUrl); // , embedCSS);

		// element can be loaded or still loading. if element is loading, getSVGDocument will throw exception
		try {
			if (this.pinoutElement.getSVGDocument()) {
				this.initSVGDoc ();
			}
		} catch (e) {

		}

		// this.pinoutElement.addEventListener ('load', this.initSVGDoc.bind (this));
	}

	fetchCSS (scriptSelector, cb) {
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

	bindUI (options = {}) {

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

	setViewData (url, svgSource) {

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

	changeBoard (boardId) {
		this.boardId = boardId;

		console.log ('changeboard called', boardId);

		// TODO: move to boardChange function
		this.pinoutElement.style.visibility = null;
		if (boardId.match (/.*fzpz(?:$|\?)/)) {
			console.log ('fzpz');
			return FritzingFzpz.loadFromUrl (githubCORSUrl (boardId)).then (fzpz => {
				this.svgView = new SVGView (fzpz);

				this.svgView.renderTo (this.pinoutElement);

				return fzpz;
			}, err => {
				console.error (err);
			});


		} else {

			console.log ('svg+json');

			boardId = boardId.replace (/(?:\.svg)?($|\?)/, '.svg$1');

			return SVGAndJSON.loadFromUrl (githubCORSUrl (boardId)).then (svgData => {
				this.svgView = new SVGView (svgData);

				this.svgView.renderTo (this.pinoutElement);
			}, err => {
				console.log (err);
			});
		}
	}

	openNewWindow () {
		var svgDoc = this.pinoutSVGDoc;
		var style = this.createSVGNode ("style");
		style.textContent = this.embedCSSText;
		svgDoc.documentElement.insertBefore (style, svgDoc.documentElement.firstElementChild);

		var url = svgToBlob (svgDoc);

		var svg_win = window.open(url, "svg_win");
	}

	updateSizeInfo () {

		if (!this.sizeInfo)
			return;

		this.sizeInfo.innerHTML =
			'w: ' + this.metricWidth.toFixed (2) + 'mm, ' +
			'h: ' + this.metricHeight.toFixed (2) + 'mm, ' +
			'pitch: ' + (this.pitch * this.unitsInmm).toFixed (2) + 'mm'

	}

	updateSvgLink () {

		if (!this.exportSvgLink)
			return;

		this.exportSvgLink.disabled = false;

		var url = svgToBlob (this.pinoutSVGDoc, {type: "octet/stream"});

		this.exportSvgLink.href = url;
		// TODO: use real url
		this.exportSvgLink.download = 'pinout.svg';
		// window.URL.revokeObjectURL(url);

	}

	updatePngLink () {

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

	initSVGDoc () {
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
		/*
	else
		this.fetchJsonLabels ({});
	*/
	}

	fetchJsonLabels (exclude = {}) {

		return new Promise ((resolve, reject) => {

			// TODO: cache data
			var req = new XMLHttpRequest ();
			req.open('GET', this.baseUrl + this.boardId + '.json', true);
			req.addEventListener ('load', function() {
				if ((req.status === 0 && req.responseText) || req.status == 200) {
					try {
						resolve (JSON.parse (req.responseText));
					} catch (err) {
						reject (err);
					}
					// this.boardData = JSON.parse (req.responseText);

					// this.drawLabels (exclude);
				} else {
					reject (new Error (`HTTP status ${req.status}`));
				}

			}.bind(this));

			req.addEventListener ('error', err => reject (err));

			req.send(null);
		});

	}

}



