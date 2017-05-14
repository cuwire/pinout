import CuwirePinout from './pinout';

function boardChanged () {
	var select = document.getElementById ('boardId');
	console.log (select.selectedIndex, select.value);

	window.location.hash = '#' + select.value;

	if (typeof window.pinout !== 'undefined') {
		pinout.changeBoard (select[select.selectedIndex].dataset.url || select.value);
	}
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

		var boardSelectForm = document.getElementById ('boardId');

		if (window.location.hash) {
			var boardId = window.location.hash.replace ('#', '');
			boardSelectForm.value = boardId;
		}

		boardSelectForm.addEventListener ("change", boardChanged);

		window.pinout = new CuwirePinout ('#cuwire-pinout-image', '#cuwire-pinout-script', {
			boardId: boardId
		});
	} else if (multiplePinoutNodes.length) {
		multiplePinoutNodes.forEach (function (node) {
			new CuwirePinout (node, '#cuwire-pinout-script', {});
		});
	}


});


/*
var pinout = new CuwirePinout ();

export var Pinout = CuwirePinout;
*/
