export function convertJsonMeta (pinId, pinMeta) {
	if (pinId === 'cuwire') {
		return;
	}

	var fn = pinMeta.fn;
	var fnList = [];

	Object.keys (fn).forEach ((fnName) => {

		// console.log (fnName, fn[fnName]);

		var pinData = {
			group: fnName.toLowerCase(),
			name: fn[fnName],
			groupNum: null,
			alt: false,
			hidden: false,
		};

		if (fnName.match(/^x\-/i)) {
			pinData.hidden = true;
			fnName = fnName.replace (/^x\-/, '');
		}

		var complex = fnName.toLowerCase().match (/^(alt-)?([^\-]+)-([^\-]+)?$/i);
		// usually this is [alt-]uart-1
		if (complex) {
			if (complex[2] === 'alt') { /// ?
				complex.shift();
			}
			pinData.group = complex[2];
			if (complex[1]) {
				pinData.alt = true;
			}
			if (complex[3]) {
				pinData.groupNum = complex[3];
			}
		}

		fnList.push (pinData);
	});

	Object.keys (pinMeta.flags || {}).forEach ((flag) => {
		var pinData = {
			group: flag.toLowerCase(),
			name: null,
			groupNum: null,
			alt: false,
			hidden: false,
		}

		fnList.push (pinData);
	})

	/*
	if (pinMeta.flags) {
		if (pinMeta.flags["5v"]) {
			fnList.push ({"class": "5v flag", title: "➄", flag: true});
		}
		if (pinMeta.flags.touch) {
			fnList.push ({"class": "touch flag", title: "☟", flag: true});
		}
	}
	*/

	return {fn: fnList};
}
