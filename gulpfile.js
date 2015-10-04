var gulp = require('gulp'),
    exit = require('gulp-exit'), // Because https://github.com/gulpjs/gulp/issues/411
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
  var extensions = {},
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
  _.each(sassModules, function(extension, key) {
    var fixture = 'test/fixtures/' + key + '.scss',
        exists = fs.existsSync(fixture);

    if(! exists) {
      fs.writeFileSync(fixture, '');
      throw 'Populate this new spec fixture before continuing: ' + fixture;
    }
  });
}

function setMetadata() {
  var nodeSass = require('node-sass'),
      version = nodeSass.info.match(/(?:libsass\s+)([\w\d\.-]+)/i)[1],
      compiler = {
        sass: version,
        engine: 'LibSass'
      },
      redis = require('./lib/redis').redis,
      extension_list = require('./public/extensions.json');

  var compilers = redis('compilers');
  compilers.merge({'lib': compiler});

  var extensions = redis('extensions');

  _.mapValues(extension_list, function(value, key) {
    this[key]=_.omit(value, ['gem', 'bower', 'paths', 'fingerprint']);
  }, extension_list);

  extensions.merge(extension_list);

  return true;
}


gulp.task('setMetadata', function() {
  return setMetadata();
});

gulp.task('assets', ['setMetadata'], function() {
  setTimeout(function() {
    return gulp.src('', {read: false})
      .pipe(exit());
  }, 150);
});

gulp.task('update', function() {
  bowerListAndInstall();

  writeExtensionsJSON();

  return;
});

gulp.task('default', ['update'], function() {
  var mocha = require('gulp-mocha');

  fixturePreflightCheck();

  return gulp.src('test/*.js', {read: false})
    .pipe(mocha())
    .pipe(exit());
});

