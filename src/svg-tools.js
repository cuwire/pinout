export function nodeCentralPoint (node) {
	if (!node) console.trace (node);
	var bbox = node.getBBox();
	return {x: bbox.x + bbox.width/2, y: bbox.y + bbox.height/2}
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

export function svgToBlob (svg) {
	var svgString = svg instanceof SVGDocument
	? new XMLSerializer().serializeToString (svg)
	: svg;

	var svgBlob = new Blob ([svgString], {'type': "image/svg+xml"});

	return URL.createObjectURL (svgBlob);

}
