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
      baseDir: buildDirectory + '/bundled'
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
    // Lets create some inline code splitters in case you need them later in your build.
    var sourcesStreamSplitter = new polymerBuild.HtmlSplitter();
    var dependenciesStreamSplitter = new polymerBuild.HtmlSplitter();

    // Okay, so first thing we do is clear the build directory
    gutil.log('Deleting ' + buildDirectory + ' directory...');
    server.asDev = false;
    del([buildDirectory])
      .then(function(){
        // Let's start by getting your source files. These are all the files
        // in your `src/` directory, or those that match your polymer.json
        // "sources"  property if you provided one.
        var sourcesStream = polymerProject.sources()

        // If you want to optimize, minify, compile, or otherwise process
        // any of your source code for production, you can do so here before
        // merging your sources and dependencies together.
          .pipe(gulpif(/\.(png|gif|jpg|svg)$/, imagemin()))

          // The `sourcesStreamSplitter` created above can be added here to
          // pull any inline styles and scripts out of their HTML files and
          // into seperate CSS and JS files in the build stream. Just be sure
          // to rejoin those files with the `.rejoin()` method when you're done.
          .pipe(sourcesStreamSplitter.split())

          // Uncomment these lines to add a few more example optimizations to your source files.
          .pipe(gulpif(/\.js$/, uglify())) // Install gulp-uglify to use
          .pipe(gulpif(/\.css$/, cssSlam())) // Install css-slam to use
          .pipe(gulpif(/\.html$/, htmlMinifier())) // Install gulp-html-minify to use

          // Remember, you need to rejoin any split inline code when you're done.
          .pipe(sourcesStreamSplitter.rejoin());


        // Similarly, you can get your dependencies seperately and perform
        // any dependency-only optimizations here as well.
        var dependenciesStream = polymerProject.dependencies()
          .pipe(dependenciesStreamSplitter.split())

          // Uncomment these lines to add a few more example optimizations to your source files.
          .pipe(gulpif(/\.js$/, uglify())) // Install gulp-uglify to use
          .pipe(gulpif(/\.css$/, cssSlam())) // Install css-slam to use
          .pipe(gulpif(/\.html$/, htmlMinifier())) // Install gulp-html-minify to use

          .pipe(dependenciesStreamSplitter.rejoin());


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
        return waitFor(bundledBuildStream)
          .then(function(){
            return waitFor(unbundledBuildStream);
          });
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
