'use strict';

const gulp = require('gulp');
const gutil = require('gulp-util');
const browserSync = require('browser-sync').create();
const historyApiFallback = require('connect-history-api-fallback');

const buildDirectory = 'build';
const config = {
  paths: {
    html: ['./src/**/*.html', './index.html'],
    css: ['./src/styles/**/*.css'],
    js: ['./src/scripts/**/*.js'],
    get allFiles(){
      return [].concat(this.html, this.css, this.js);
    }
  }
};
const server = {
  asDev: true,
  bundled: true,
  dev: {
    port: 5000,
    logPrefix: 'PSK',
    server: {
      baseDir: '.',
      middleware: [historyApiFallback()]
    },
    files: config.paths.allFiles
  },
  build: {
    port: 5001,
    logPrefix: 'PSK-Build',
    server: {
      baseDir: buildDirectory
    },
    middleware: [historyApiFallback()],
    notify: false
  },
  get prod(){
    let conf = JSON.parse(JSON.stringify(this.build));
    // TODO: Toggle when polymer-build get's implemented
    // conf.server.baseDir += this.bundled ? '/bundled' : '/unbundled';
    conf.server.baseDir += '/default';
    return conf;
  },
  get config(){
    return this.asDev ? this.dev : this.prod;
  }
};

gulp.task('bundled', () =>{
  return new Promise((resolve) =>{
    gutil.log('Setting vulcanized project to be served with HTTP/1');
    server.asDev = false;
    resolve();
  });
});

gulp.task('unbundled', () =>{
  return new Promise((resolve) =>{
    // TODO: Activate HTTP/2 protocol for browserSync
    gutil.log('Setting build project to be served with HTTP/2 + Push');
    server.asDev = false;
    server.bundled = false;
    resolve();
  });
});

gulp.task('build', () =>{
  return new Promise((resolve) =>{
    // TODO: Implement polymer-build por Polymer 2.0
    gutil.log('Build for Polymer 2.0 is not implemented yet');
    resolve();
  });
});

gulp.task('service-worker', () =>{
  return new Promise((resolve) =>{
    // TODO: Implement service-workers for build versions
    gutil.log('Service workers for Polymer 2.0 is not implemented yet');
    resolve();
  });
});

gulp.task('browserSync', () =>{
  browserSync.init(server.config);
});

gulp.task('serve', gulp.series('browserSync'));
gulp.task('default', gulp.series('build', 'service-worker'));
gulp.task('serve:bundled', gulp.series('default', 'bundled', 'browserSync'));
gulp.task('serve:unbundled', gulp.series('default', 'unbundled', 'browserSync'));
