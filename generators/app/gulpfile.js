/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';

var del = require('del');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var cssSlam = require('css-slam').gulp;
var imagemin = require('gulp-imagemin');
var htmlMinifier = require('gulp-html-minifier');
var browserSync = require('browser-sync').create();
var historyApiFallback = require('connect-history-api-fallback');

var mergeStream = require('merge-stream');
var polymerBuild = require('polymer-build');
var polymerJson = require('./polymer.json');
var forkStream = polymerBuild.forkStream;
var polymerProject = new polymerBuild.PolymerProject(polymerJson);
var swPrecacheConfig = require('./sw-precache-config.js');

var buildDirectory = 'build';
var config = {
  paths: {
    html: ['./src/**/*.html', './index.html'],
    css: ['./src/styles/**/*.css'],
    js: ['./src/scripts/**/*.js'],
    get allFiles(){
      return [].concat(this.html, this.css, this.js);
    }
  }
};
var server = {
  asDev: true,
  dev: {
    port: 5000,
    logPrefix: 'PSK',
    server: {
      baseDir: '.',
      middleware: [historyApiFallback()]
    },
    files: config.paths.allFiles
  },
  prod: {
    port: 5001,
    logPrefix: 'PSK-Build',
    server: {
      baseDir: buildDirectory
    },
    middleware: [historyApiFallback()],
    notify: false
  },
  get config(){
    return this.asDev ? this.dev : this.prod;
  }
};

/**
 * Waits for the given ReadableStream
 */
function waitFor(stream){
  return new Promise(function(resolve, reject){
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}

gulp.task('default', function(){
  return new Promise(function(resolve, reject){ // eslint-disable-line no-unused-vars
    // Okay, so first thing we do is clear the build directory
    gutil.log('Deleting ' + buildDirectory + ' directory...');
    server.asDev = false;
    del([buildDirectory])
      .then(function(){
        // Okay, now let's get your source files
        var sourcesStream = polymerProject.sources()
        // Oh, well do you want to minify stuff? Go for it!
        // Here's how splitHtml & gulpif work
          .pipe(polymerProject.splitHtml())
          .pipe(gulpif(/\.js$/, uglify()))
          .pipe(gulpif(/\.css$/, cssSlam()))
          .pipe(gulpif(/\.html$/, htmlMinifier()))
          .pipe(gulpif(/\.(png|gif|jpg|svg)$/, imagemin()))
          .pipe(polymerProject.rejoinHtml());

        // Okay, now let's do the same to your dependencies
        var dependenciesStream = polymerProject.dependencies()
          .pipe(polymerProject.splitHtml())
          .pipe(gulpif(/\.js$/, uglify()))
          .pipe(gulpif(/\.css$/, cssSlam()))
          .pipe(gulpif(/\.html$/, htmlMinifier()))
          .pipe(polymerProject.rejoinHtml());

        // Okay, now let's merge them into a single build stream
        var buildStream = mergeStream(sourcesStream, dependenciesStream)
          .once('data', function(){
            gutil.log('Analyzing build dependencies...');
          });

        // Fork your build stream to write directly to the 'build/unbundled' dir
        var unbundledBuildStream = forkStream(buildStream)
          .pipe(gulp.dest(buildDirectory + '/unbundled'));

        // If you want bundling, pass the stream to polymerProject.bundler.
        // This will bundle dependencies into your fragments so you can lazy
        // load them.
        // Fork your build stream to bundle your application and write to the 'build/bundled' dir
        var bundledBuildStream = forkStream(buildStream)
          .pipe(polymerProject.bundler)
          .pipe(gulp.dest(buildDirectory + '/bundled'));

        // waitFor the buildStream to complete
        return waitFor(bundledBuildStream);
      })
      .then(function(){
        // Okay, now let's generate the Service Worker
        gutil.log('Generating the Service Worker for bundled project...');
        return polymerBuild.addServiceWorker({
          project: polymerProject,
          buildRoot: buildDirectory + '/bundled',
          bundled: true,
          swPrecacheConfig: swPrecacheConfig
        });
      })
      .then(function(){
        // Okay, now let's generate the Service Worker
        gutil.log('Generating the Service Worker for unbundled project...');
        return polymerBuild.addServiceWorker({
          project: polymerProject,
          buildRoot: buildDirectory + '/unbundled',
          swPrecacheConfig: swPrecacheConfig
        });
      })
      .then(function(){
        // You did it!
        gutil.log('Build complete!');
        resolve();
      });
  });
});

gulp.task('browserSync', function(){
  browserSync.init(server.config);
});

gulp.task('serve', gulp.series('browserSync'));
gulp.task('serve:dist', gulp.series('default', 'browserSync'));
