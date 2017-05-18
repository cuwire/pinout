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

export function viewportConvert (el) {

	var point = el.ownerSVGElement.createSVGPoint();

	var bbox = el.getBBox(),
		x = bbox.x + (bbox.width / 2),
		y = bbox.y + (bbox.height / 2);

	point.x = x;
	point.y = y;

	var matrix = el.ownerSVGElement.getScreenCTM().inverse().multiply(el.getScreenCTM());

	var position = point.matrixTransform(matrix);

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
