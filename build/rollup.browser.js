/*
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import alias from 'rollup-plugin-alias';
*/

import buble from 'rollup-plugin-buble';

import {rollup} from 'rollup';
import scss from 'rollup-plugin-scss';

export default {
	entry: 'src/index.js',
	format: 'iife',
	plugins: [
		// buble()
		/*
		alias({
			jszip: path.join(__dirname, './node_modules/jszip/dist/jszip.min.js')
		}),
		nodeResolve({ jsnext: true, module: true }),
		commonjs()
		*/
		scss({
			output: 'dist/pinout.css'
		})
	],
	dest: 'dist/pinout.js',
	external: [
		'xmldom',
		'jszip',
		'JSZipUtils',
	],
	sourceMap: true,
	globals: {
		xmldom: 'window',
		jszip: 'JSZip'
	},
	moduleName: 'Pinout'
}
