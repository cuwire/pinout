import CuwirePinout from './pinout';

function boardChanged () {
	var select = document.getElementById ('boardId');
	console.log (select.selectedIndex, select.value);

	window.location.hash = '#' + select.value;

	if (typeof window.pinout !== 'undefined') {
		if (pinout)
			pinout.changeBoard (select[select.selectedIndex].dataset.url || select.value);
	}
}

function getSiteUrl (url) {
	if (url === undefined) return;
	var a = document.createElement ('a');
	a.href = url;
	return a.href;
}

document.addEventListener("DOMContentLoaded", function(event) {

	var boardImg = document.querySelector ('#board-image-tab object');
	if (boardImg) {
		boardImg.style.height = boardImg.parentElement.parentElement.clientHeight - 60 + 'px';
		boardImg.style.margin =  "0 " + parseInt((boardImg.parentElement.parentElement.clientWidth - boardImg.width)/2) + "px";
	}

	if (window.location.search) {
		window.location.hash = "#" + window.location.search.replace (/^\?/, '');
		window.location.search = '';
	}

	var boardId;

	var singlePinoutId   = '#cuwire-pinout-image';
	var singlePinoutNode = document.querySelector (singlePinoutId);

	var multiplePinoutClass = '.cuwire-pinout-image';
	var multiplePinoutNodes = [].slice.apply (document.querySelectorAll (multiplePinoutClass) || []);

	if (singlePinoutNode) {

		var select = document.getElementById ('boardId');

		if (window.location.hash) {
			var boardId = window.location.hash.replace ('#', '');
			select.value = boardId;
		}

		window.pinout = new CuwirePinout ({
			container: '#cuwire-pinout',
			script: '#cuwire-pinout-script',
			exportSvg: '.export-svg',
			exportPng: '.export-png',
			boardId: getSiteUrl (select[select.selectedIndex || 0].dataset.url) || select.value
		});

		select.addEventListener ("change", boardChanged);

	} else if (multiplePinoutNodes.length) {
		multiplePinoutNodes.forEach (function (node) {
			new CuwirePinout ({
				view: node,
				script: '#cuwire-pinout-script'
			});
		});
	}


});


/*
var pinout = new CuwirePinout ();

export var Pinout = CuwirePinout;
*/
