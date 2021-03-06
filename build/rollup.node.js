import sizes from 'rollup-plugin-sizes';

export default {
	entry: 'src/index.js',
	format: 'cjs',
	// plugins: [ babel() ],
	dest: 'index.js',
	interop: false,
	external: [
		'xmldom'
	],
	plugins: [
		sizes()
	]
}
