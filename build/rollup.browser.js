/*
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import alias from 'rollup-plugin-alias';
*/

import buble from 'rollup-plugin-buble';

// import {rollup} from 'rollup';
import scss     from 'rollup-plugin-scss';
import ignore   from 'rollup-plugin-ignore';

export default {
	input: 'src/index.js',
	
	plugins: [
		ignore (['fs', 'net', 'util']),
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
	],
	output: {
		file: 'dist/pinout.js',
		format: 'iife',	
	},
	external: [
		'xmldom',
		'jszip',
		'JSZipUtils',
	],
	sourcemap: true,
	globals: {
		xmldom: 'window',
		jszip: 'JSZip'
	},
	name: 'Pinout'
}
