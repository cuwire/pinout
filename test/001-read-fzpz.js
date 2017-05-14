import Fzpz from '../src/fritzing/fzpz';

describe ("001-read-fzpz", function () {
	it ("can be read", function () {
		return Fzpz.readFromFile ('test/JDY-08.fzpz').then (fzpz => {
			return fzpz;
		});
	})
})
