import {DOMParser} from 'xmldom';

function parseBoolean (value) {
	if (value === "false")
		return false;
	return Boolean (value);
}

export default class FritzingFzp {

	static parseFromString (fzpContents) {

		try {
			var fzpDoc = new DOMParser ().parseFromString (fzpContents, "application/xml");

		} catch (e) {
			return console.error (e);
		}

		var fzpData = {
			views: {
				icon: undefined,
				breadboard: undefined,
				pcb: undefined,
				schematic: undefined,
			},
			connectors: {

			}
		};

		var fzpRoot = fzpDoc.documentElement;
		var views = fzpRoot.getElementsByTagName ('views')[0];
		[].slice.apply (views.childNodes).forEach (node => {
			// [icon|breadboard|pcb|schematic]View/layers[image=.svg]/layer[layerId=]
			// console.log (node);

			if (!node.localName || !node.localName.match (/^(?:icon|breadboard|pcb|schematic)View$/))
				return;

			var viewType    = node.localName.replace ('View', '');
			var layersNodes = node.getElementsByTagName ('layers');

			if (!layersNodes || !layersNodes.length) {
				return;
			}

			var layerView = layersNodes[0];

			var layerNodes = [].slice.apply (node.getElementsByTagName ('layer') || []);

			var nodeData = {
				// usually there is only one child node
				image: layerView.getAttribute ('image'),
				layers: layerNodes.map (layerNode => layerNode.getAttribute ('layerId'))
			};

			fzpData.views[viewType] = nodeData;

			// find the breadboard view
			// WTF: fritzing file name in the zip archive and fzp file doesn't match!
			if (viewType === 'breadboard') {
				// !breadboardName &&
				var metaBBName = layerView.getAttribute ('image').replace (/^(?:breadboard\/)?/, 'svg.breadboard.');
				/*
				if (breadboardName && metaBBName !== breadboardName) {
					// TODO: do something
					console.error (`breadboard file names in fzp (${breadboardName}) and fzpz file (${metaBBName}) doesn't match`);
				}
				*/
			}
		});

		var connectors = fzpRoot.getElementsByTagName ('connectors')[0];
		[].slice.apply (connectors.childNodes).forEach (node => {

			if (!node.localName || node.localName !== 'connector')
				return;

			var breadboardView = node.getElementsByTagName ('breadboardView')[0];
			// this should be defined
			var svgId = breadboardView.firstElementChild.getAttribute ('svgId');

			var connectorId   = node.getAttribute ('id');
			var signalNodes = node.getElementsByTagName ('signal');

			if (!signalNodes || !signalNodes.length) {
				fzpData.connectors[connectorId] = {
					fn: [{
						group: 'name',
						name: node.getAttribute ('name')
					}],
					svgId: svgId,
				}
				return;
			}

			var pinoutView = node.getElementsByTagName ('pinoutView')[0];

			var connectorData = {
				fn: [],
				svgId: svgId,
				display: pinoutView ? pinoutView.getAttribute ('display') : undefined
			};

			[].slice.apply (signalNodes).forEach (fnNode => {
				connectorData.fn.push ({
					group:    (fnNode.getAttribute ('group') || '').toLowerCase(),
					groupNum: (fnNode.getAttribute ('groupNum') || '').toLowerCase(),
					name:     (fnNode.getAttribute ('name') || '').toLowerCase(),
					alt:      parseBoolean (fnNode.getAttribute ('alt')),
					hidden:   parseBoolean (fnNode.getAttribute ('hidden'))
				});
			});

			fzpData.connectors[connectorId] = connectorData;

		});

		return new FritzingFzp (fzpData);
	}

	constructor (data) {
		Object.assign (this, data);
	}

	get breadboardViewFilename () {
		return this.views.breadboard.image.replace (/^breadboard\//, 'svg.breadboard.');
	}
}
