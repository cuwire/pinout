Better devboard pinouts
------------

see example at [cuwire.io/gui/BoardImages](http://cuwire.io/gui/BoardImages)

Some time ago I've added some board images for IDE.
But those images suitable for web and useless in GUI.

Seems fritzing have [board images I want](https://github.com/fritzing/fritzing-parts) —
[converted from Eagle .brd files](https://github.com/fritzing/eagle2fritzing),
with correct pins as svg objects, with xml descriptions and so on.
Licensing is also suitable — seems those images is CC-BA.

### Playground for some example boards

Currently board pin labels have some _imperfections_.

<link type="text/css" href="embed.css"/>
<script type="text/javascript" src="embed.js"></script>
<script type="text/javascript" src="form.js"></script>

<div>

<select id="boardId" onchange="boardChanged()">
<option value="pro">Arduino pro mini</option>
<option value="lpmsp430g2553">Launchpad MSP430G2</option>
<option value="RFduino">RFduino</option>
</select>
</div>

<object id="boardImage" data="pro.svg" type="image/svg+xml" style="height: 340px; margin: 0px 50px;">
	<!--img src="yourfallback.jpg" /-->
</object>
<div>
<form>
	<div>
	<input type="checkbox" name="spi" id="hide-spi"/><label for="hide-spi">Hide SPI pins</label>
	</div>
	<div>
	<input type="checkbox" name="pcint" id="hide-pcint" checked="true"/><label for="hide-pcint">Hide pin change interrupt pin numbers</label>
	</div>
	<div>
	<input type="checkbox" name="pin" id="hide-pin" checked="true"/><label for="hide-pin">Hide MCU pin number</label>
	</div>
	<button onclick="showLabels(getFormFields(this.parentNode)); return false;">Render labels</button>
</form>
</div>

### Work in progress

Currently I have:

* script to display board pin labels for one board;
* limited pin description for one board

TODO:

* show legend;
* optimize description format;
* check all other board images;
* convert descriptions from fritzing;
* verbosity level:
   * digital + analog + bus;
   * digital + analog + interrupt;
   * processor pins + flags
   * selectable
* flag pins (pwm, analog read or write).


### Other boards

RFduino also have [board image for fritzing](https://goddess-gate.com/projects/en/arduino/rfduinofritzing). Licensing is CC-BY-SA. I slightly modified pin headers and color (green => black).

------------------------------

[due vector pinout](http://forum.arduino.cc/index.php?topic=132130.0)
