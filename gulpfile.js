'use strict';

const gulp = require('gulp'),
			mocha = require('gulp-mocha'),
			del = require('del'),
			babel = require('gulp-babel'),
			sourcemaps = require('gulp-sourcemaps'),
			yargs = require('yargs'),
			insert = require('gulp-insert'),
			uglify = require('gulp-uglify')

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
		.pipe(insert.prepend('require(\'source-map-support\').install()\n'))
		.pipe(sourcemaps.init())
		.pipe(babel({
			presets: ['es2015'],
			plugins: ['syntax-async-functions', 'transform-async-to-generator', 'transform-object-rest-spread']
		}))
		//.pipe(uglify()) // TODO: turn on for production
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(serverDest))
})
