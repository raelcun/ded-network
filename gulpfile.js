'use strict';

const gulp = require('gulp'),
			mocha = require('gulp-mocha');

gulp.task('test', () => {
	return gulp
		.src(['test/**/*.js'])
		.pipe(mocha({ timeout: 5000 }));
});