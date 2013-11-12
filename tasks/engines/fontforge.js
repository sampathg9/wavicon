/**
 * grunt-webfont: fontforge engine
 *
 * @requires fontforge, ttfautohint, eotlitetool.py
 * @author Artem Sapegin (http://sapegin.me)
 */

/*jshint node:true, laxbreak:true, latedef:false */
module.exports = function(grunt, o, done) {
	'use strict';

	var path = require('path');

	var COMMAND_NOT_FOUND = 127;

	// Run Fontforge
	var args = [
		'-script',
		path.join(__dirname, 'fontforge/generate.py'),
		o.tempDir,
		o.dest,
		o.fontBaseName,
		o.types.join(',')
	];
	if (o.addHashes) {
		args.push('--hashes');
	}
	if (o.addLigatures) {
		args.push('--ligatures');
	}

	grunt.util.spawn({
		cmd: 'fontforge',
		args: args
	}, function(err, fontforgeProcess, code) {
		if (code === COMMAND_NOT_FOUND) {
			grunt.log.errorlns('Please install fontforge and all other requirements.');
			grunt.warn('fontforge not found', code);
		}
		else if (err || fontforgeProcess.stderr) {
			// Skip some fontforge output such as copyrights. Show warnings only when no font files was created
			// or in verbose mode.
			var success = !!generatedFontFiles();
			var notError = /(Copyright|License |with many parts BSD |Executable based on sources from|Library based on sources from|Based on source from git)/;
			var lines = (err && err.stderr || fontforgeProcess.stderr).split('\n');

			var warn = [];
			lines.forEach(function(line) {
				if (!line.match(notError) && !success) {
					warn.push(line);
				}
				else {
					grunt.verbose.writeln("fontforge: ".grey + line);
				}
			});

			if (warn.length) {
				grunt.warn(warn.join('\n'));
				done(false);
			}
		}

		// Trim fontforge result
		var json = fontforgeProcess.stdout.replace(/^[^{]+/, '').replace(/[^}]+$/, '');

		// Parse json
		var result;
		try {
			result = JSON.parse(json);
		}
		catch (e) {
			grunt.warn('Webfont did not receive a popper JSON result.\n' + e + '\n' + fontforgeProcess.stdout);
		}

		done({
			fontName: path.basename(result.file),
			glyphs: result.names
		});
	});

	// @todo
	var fontFormats = 'eot,woff,ttf,svg';
	var fontFileMask = '*.{' + fontFormats + '}';
	function generatedFontFiles() {
		return grunt.file.expand(path.join(o.dest, o.fontBaseName + fontFileMask));
	}
};
