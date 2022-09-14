const { src, dest, series, parallel, watch } = require('gulp');
const del = require('del');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const mode = require('gulp-mode')({
  modes: ['production', 'development'],
  default: 'development',
  verbose: false,
});
const bump = require('gulp-bump');
const sourcemaps = require('gulp-sourcemaps');
const uglifycss = require('gulp-uglifycss');
const autoprefixer = require('gulp-autoprefixer');
const argv = require('yargs').argv;
const fs = require('fs');
const semver = require('semver');
const config = require('./config.json');
const { NULL } = require('node-sass');

// Some helper functions
var getPackageJson = function () {
  return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
};
var getType = function () {
  if (argv.major) return 'major';
  if (argv.minor) return 'minor';
  return 'patch';
};

// TASKS

// Clean assets
function clean() {
  return del([config.dest]);
}


// CSS task
function css() {
  return src(config.scss.src, { allowEmpty: false })
    .pipe(mode.development(sourcemaps.init()))
    .pipe(plumber())
    .pipe(sass({ outputStyle: 'expanded' }).on('error', sass.logError))
    .pipe(
      autoprefixer({
        overrideBrowserslist: ['> 1%'],
      })
    )
    .pipe(mode.development(sourcemaps.write()))
    .pipe(dest(config.scss.dest))
    .pipe(mode.production(uglifycss()))
    .pipe(mode.production(rename({ suffix: '.min' })))
    .pipe(mode.production(dest(config.scss.dest)));
}

// Transpile, concat and minify dev scripts
function scriptsDev() {
  return src(config.js.src, { allowEmpty: true })
    .pipe(concat('app.js'))
    .pipe(plumber())
    .pipe(
      mode.production(
        uglify({
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        })
      )
    )
    .pipe(dest(config.js.dest));
}

// Transpile, concat and minify lib scripts
function scriptsLibs() {
  return src(config.js.libs, { allowEmpty: true })
    .pipe(concat('libs.js'))
    .pipe(plumber())
    .pipe(mode.production(uglify()))
    .pipe(dest(config.js.dest));
}

// Bump the version
function bumpVersion() {
  var pkg = getPackageJson();
  var newVer = semver.inc(pkg.version, getType());

  return src(config.version.src, { base: './', allowEmpty: true })
    .pipe(
      mode.production(
        bump({
          version: newVer,
        })
      )
    )
    .pipe(dest(config.version.dest));
}

// Watch files
function watchFiles() {
  console.info("Big brother is watching you!");
  watch(config.scss.files, css);
  watch(config.scss.files, css);
  watch(config.js.src, scriptsDev);
  watch(config.js.libs, scriptsLibs);
}

const build = series(clean, bumpVersion, parallel(css, scriptsDev, scriptsLibs));

// exports.bump = bump;
exports.default = build;
exports.serve = series(build, watchFiles);
