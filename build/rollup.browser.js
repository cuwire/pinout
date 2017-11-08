/*
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import alias from 'rollup-plugin-alias';
*/

import buble from 'rollup-plugin-buble';

// import {rollup} from 'rollup';
import scss     from 'rollup-plugin-scss';
import ignore   from 'rollup-plugin-ignore';
import sizes from 'rollup-plugin-sizes';


export default {
	input: 'src/index.js',

	plugins: [
		ignore ('fs net util path'.split (' ')),
		scss ({
			output: 'dist/pinout.css'
		}),
		buble (),
		/*
		alias({
			jszip: path.join(__dirname, './node_modules/jszip/dist/jszip.min.js')
		}),
		nodeResolve({ jsnext: true, module: true }),
		commonjs()
		*/
		sizes ()
	],
	output: {
		file: 'dist/pinout.js',
		format: 'iife',
	},
	external: [
		'xmldom',
		'svgdom',
		'jszip',
		'JSZipUtils',
	],
	sourcemap: true,
	globals: {
		xmldom: 'window',
		jszip: 'JSZip',
		svgdom: 'window',
	},
	name: 'Pinout'
}
