var gulp = require('gulp'),
    exit = require('gulp-exit'), // Because https://github.com/gulpjs/gulp/issues/411
    mocha = require('gulp-mocha'),
    bower = require('bower'),
    fs = require('fs'),
    sassModules = require('config').plugins,
    _ = require('lodash'),
    bowerDependencies = _.keys(require('./bower.json').dependencies),
    bowerInfo = function(pkg, callback) {
      bower.commands.info(pkg)
        .on('end', function (res) {
          callback(res.latest);
        });
    };

function bowerListAndInstall() {
  var extensions = [],
      length = _.size(sassModules),
      i = 0;

  _.each(sassModules, function(extension, key) {
    if(! _.contains(bowerDependencies, extension.bower)) {
      extensions.push(extension.bower);
    }

    if(i == length - 1) {
      bower.commands.install(extensions, { save: true })
        .on('end', function (installed) {
          return;
        });
    }

    i++;
  });
}

function writeExtensionsJSON() {
  var extensions = sassModules,
      length = _.size(sassModules),
      i = 0;

  _.each(sassModules, function(extension, key) {
    bowerInfo(extension.bower, function(info) {
      extensions[key] = {
        version: info.version,
        import: extension.imports,
        homepage: info.homepage
      };

      if(i == length - 1) {
        fs.writeFileSync('public/extensions.json', JSON.stringify(extensions));
      }

      i++;
    });
  });
}

function fixturePreflightCheck() {
  var extensions = sassModules,
      length = _.size(sassModules),
      i = 0;

  _.each(sassModules, function(extension, key) {
    var fixture = 'test/fixtures/' + key + '.scss',
        exists = fs.existsSync(fixture);

    if(! exists) {
      fs.writeFileSync(fixture, '');
      throw 'Populate this new spec fixture before continuing: ' + fixture;
    }
  });
}


// gulp.task('list', function() {
//   return bowerListAndInstall();
// });

// gulp.task('update', function() {
//   return writeExtensionsJSON();
// });

// gulp.task('testPreflight', function() {
//   return fixturePreflightCheck();
// });

// gulp.task('test', ['testPreflight'], function () {
//   return gulp.src('test/*.js', {read: false})
//     .pipe(mocha())
//     .pipe(exit());
// });


// The default task (called when you run `gulp` from cli)
gulp.task('default', function() {

  bowerListAndInstall();

  writeExtensionsJSON();

  fixturePreflightCheck();

  return gulp.src('test/*.js', {read: false})
    .pipe(mocha())
    .pipe(exit());
});

