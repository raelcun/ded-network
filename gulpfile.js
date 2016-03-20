'use strict';

const gulp = require('gulp'),
			mocha = require('gulp-mocha'),
			del = require('del'),
			babel = require('gulp-babel'),
			sourcemaps = require('gulp-sourcemaps'),
			yargs = require('yargs');

const serverDest = 'dist'
const serverTests = [serverDest + '/test/*.js']
const serverSrc = ['**/*.js', '!node_modules/**/*']

gulp.task('test', ['build'], () => {
	return gulp
		.src(serverTests)
		.pipe(mocha({ timeout: 50000, grep: yargs.argv.grep }));
});

gulp.task('clean', (cb) => {
	return del(serverDest + '/**/*', cb)
})

gulp.task('build', ['clean'], () => {
	return gulp.src(serverSrc)
		.pipe(sourcemaps.init())
		.pipe(babel({
			presets: ['es2015'],
			plugins: ['syntax-async-functions','transform-regenerator']
		}))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(serverDest))
})