import svgdom from 'svgdom';

import {DOMParser, DOMImplementation, XMLSerializer} from 'xmldom';

export const NS = "http://www.w3.org/2000/svg";

export function nodeCentralPoint (node) {
	if (!node) console.trace (node);
	var bbox = node.getBBox();
	return {
		x: bbox.x + bbox.width/2,
		y: bbox.y + bbox.height/2,
		x1: bbox.x,
		y1: bbox.y,
		x2: bbox.x + bbox.width,
		y2: bbox.y + bbox.height
	}
}

// https://codepen.io/tigt/post/optimizing-svgs-in-data-uris
export function encodeOptimizedSVGDataUri (svgString) {
	var uriPayload = encodeURIComponent (// encode URL-unsafe characters
		svgString.replace(/[\r\n]+\s*/g, '')// remove newlines
	)
	// .encodeUriComponent()
	.replace(/%20/g, ' ') // put spaces back in
	.replace(/%3D/g, '=') // ditto equals signs
	.replace(/%3A/g, ':') // ditto colons
	.replace(/%3B/g, ';') // ditto …
	.replace(/%3C/g, '<') // ditto …
	.replace(/%3E/g, '>') // ditto …
	.replace(/%23/g, '#') // ditto …
	.replace(/%2C/g, ',') // ditto …
	.replace(/%2F/g, '/') // ditto slashes
	.replace(/%22/g, "'"); // replace quotes with apostrophes (may break certain SVGs)

	return 'data:image/svg+xml,' + uriPayload;
}

export function svgToBlob (svg, options = {}) {
	var svgString;
	try {
		svgString = new XMLSerializer().serializeToString (svg);
	} catch (e) {
		svgString = svg;
	}

	var svgBlob = new Blob ([svgString], Object.assign ({type: "image/svg+xml"}, options));

	return URL.createObjectURL (svgBlob);

}

export function viewportConvert (el, rotatedContainer) {

	var matrix = (rotatedContainer || el.ownerSVGElement).getScreenCTM().inverse().multiply(el.getScreenCTM());

	var point = (rotatedContainer || el.ownerSVGElement).createSVGPoint();

	var bbox = el.getBBox(),
		x = bbox.x + (bbox.width / 2),
		y = bbox.y + (bbox.height / 2);

	point.x = x;
	point.y = y;

	var position = point.matrixTransform(matrix);
	// var position = point.matrixTransform(el.getCTM().inverse());

	return {
		x: position.x,
		y: position.y,
	}
}

export function viewportCoords (el) {

	var svgRoot = el.ownerDocument.documentElement;

	var offset = svgRoot.getBoundingClientRect();

	var matrix = el.getScreenCTM();

	if (!x && !y) {
		var bbox = el.getBBox(),
			x = bbox.x + (bbox.width / 2),
			y = bbox.y + (bbox.height / 2),
			width = bbox.width,
			height = bbox.height;
	}

	return {
		x: (matrix.a * x) + (matrix.c * y) + matrix.e - offset.left,
		y: (matrix.b * x) + (matrix.d * y) + matrix.f - offset.top,
		width: (
			(matrix.a * (bbox.x + bbox.width)) +
			(matrix.c * (bbox.y + bbox.height)) -
			(matrix.a * bbox.x) -
			(matrix.c * bbox.y)
		),
		height: (
			(matrix.b * (bbox.x + bbox.width)) +
			(matrix.d * (bbox.y + bbox.height)) -
			(matrix.b * bbox.x) -
			(matrix.d * bbox.y)
		),
	};
}


export function showWholeSVG (svgDoc) {
	var svgBBox = svgDoc.documentElement.getBBox();
	svgDoc.documentElement.setAttribute (
		'viewBox',
		[svgBBox.x, svgBBox.y, svgBBox.width, svgBBox.height].join (' ')
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

export function convertDOM (srcDoc) {

	// for browser svgdom.DOMParser === xmldom.DOMParser
	if (svgdom.DOMParser && svgdom.DOMParser === DOMParser) {
		return srcDoc;
	}

	var xmldomDoc = new DOMImplementation ().createDocument (
		'http://www.w3.org/2000/svg', 'svg'
	);

	var svgdomDoc = new svgdom.constructor ().document;

	var dstDoc;

	if (srcDoc instanceof xmldomDoc.constructor) {
		dstDoc = svgdomDoc;
		// console.log ('xmldom => svgdom');
	} else {
		dstDoc = xmldomDoc;
		// console.log ('svgdom => xmldom');
	}

	var srcNode = srcDoc.documentElement;

	var dstNode = dstDoc.documentElement;

	var namespaces = {
		xml: 'http://www.w3.org/XML/1998/namespace'
	};

	fitNode (srcNode, dstNode);

	function fitNode (srcNode, dstNode, depth = 0) {

		if (srcNode.attrs) {

			srcNode.attributes.sort (
				(a, b) => b.nodeName.indexOf ('xmlns:') - a.nodeName.indexOf ('xmlns:')
			).forEach (k => {
				var attrName = k.nodeName;
				var kChunks = attrName.split (':');
				if (kChunks[0] === 'xmlns' && kChunks.length === 2) {
					namespaces[kChunks[1]] = srcNode.getAttribute (attrName);
					dstNode.setAttributeNS ("http://www.w3.org/2000/xmlns/", attrName, srcNode.getAttribute (attrName));
				} else if (kChunks.length === 2) {
					dstNode.setAttributeNS (
						namespaces[kChunks[0]],
						attrName,
						srcNode.getAttribute (attrName)
					);
				} else {
					dstNode.setAttributeNS (null, attrName, srcNode.getAttribute (attrName));
				}
			});
		} else if (srcNode.attributes) {
			var attrs = srcNode.attributes;
			for (let i = 0; i < attrs.length; i++) {
				let attr = attrs.item(i);
				// null ns arg should be fine
				dstNode.setAttributeNS (
					attr.namespaceURI,
					(attr.prefix ? attr.prefix + ':' : '') + attr.localName,
					attr.value
				);
			}
		}

		var child = srcNode.firstChild;
		while (child) {
			// TODO: createElementNS

			// console.log ('============\n', depth, child.nodeType, Object.keys (child));

			if (child.nodeType === 3) { // Node.TEXT_NODE
				dstNode.appendChild (dstDoc.createTextNode (child.data));
			} else if (child.nodeType === 8) { // Node.COMMENT_NODE
				// console.log ('COMMENT NODE', child);
				dstNode.appendChild (dstDoc.createComment (child.data));
			} else if (child.nodeType === 1) { // Node.ELEMENT_NODE
				// TODO: namespace
				let dstChildNode = dstDoc.createElement (child.nodeName);
				dstNode.appendChild (dstChildNode);
				fitNode (child, dstChildNode, depth + 1);
			} else {
				console.info ('NodeType ===' + child.nodeType + ' not supported');
			}

			child = child.nextSibling;
		}

	}

	return dstDoc;


}

export function elementDepth (el, count = 0) {
	if (!el.parentNode) {
		return count;
	}
	return elementDepth (el.parentNode, count + 1);
}
