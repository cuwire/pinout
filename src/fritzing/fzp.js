import FS from 'fs';

import {promisify} from '../common';

import {DOMParser} from 'xmldom';

function parseBoolean (value) {
	if (value === "false")
		return false;
	return Boolean (value);
}

export default class FritzingFzp {

	static parseFromFile (filename) {
		return promisify (FS.readFile)(filename).then (contents => {
			return FritzingFzp.parseFromString (contents.toString ('utf8'))
		}, err => {
			throw err;
		})
	}

	get pins () {
		return this.connectors;
	}

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
			var svgId = breadboardView.getElementsByTagName ('*')[0].getAttribute ('svgId');

			var connectorId   = node.getAttribute ('id');
			var signalNodes = node.getElementsByTagName ('signal');

			if (!signalNodes || !signalNodes.length) {
				var pinName = node.getAttribute ('name');
				var fn = [];

				// start guessing
				if (pinName.match (/I2C\s+Data|I2C(\d)?[ _-]SDA|SDA/i)) {
					fn.push ({group: 'i2c', name: 'sda'});
					// groupNum: (fnNode.getAttribute ('groupNum') || '').toLowerCase()
				}

				if (pinName.match (/I2C\s+Clock|I2C(\d)[ _-]SCL|SCL/i)) {
					fn.push ({group: 'i2c', name: 'scl'});
					// groupNum: (fnNode.getAttribute ('groupNum') || '').toLowerCase()
				}

				if (pinName.match (/[^a-z]*[AD]?GND[^a-z]*/i)) {
					fn.push ({group: 'gnd', name: pinName});
					// groupNum: (fnNode.getAttribute ('groupNum') || '').toLowerCase()
				}

				if (pinName.match (/[!#~]?(?:RST|RESET)/i)) {
					fn.push ({group: 'system', name: pinName});
					// groupNum: (fnNode.getAttribute ('groupNum') || '').toLowerCase()
				}

				if (pinName.match (/VCC|VDD/i)) {
					fn.push ({group: 'power', name: pinName});
					// groupNum: (fnNode.getAttribute ('groupNum') || '').toLowerCase()
				}

				if (pinName.match (/(?:_|-|^)(RXD?|TXD?|RTS|CTS|DTR|DSR|)(\d)(?:_|-|^)/i)) {
					fn.push ({group: 'uart', name: pinName});
					// groupNum: (fnNode.getAttribute ('groupNum') || '').toLowerCase()
				}
				/*
				ICSP MISO
				ICSP MOSI
				ICSP SCK
				ISCP RESET
				ISCP SCK
				*/

				fn.push ({
					group: 'gpio',
					name: pinName
				});

				if (fn.length > 1) {
					fn[fn.length - 1].hidden = true;
				}

				fzpData.connectors[connectorId] = {
					fn,
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
