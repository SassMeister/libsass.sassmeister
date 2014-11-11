var gulp = require('gulp'),
    bower = require('bower'),
    fs = require('fs'),
    sassModules = require('config').plugins,
    _ = require('lodash');

function list() {
  var extensions = [],
      length = _.size(sassModules),
      i = 0;

  var bowerDependencies = _.keys(require('./bower.json').dependencies);

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

function update() {
  var extensions = sassModules,
      length = _.size(sassModules),
      i = 0,
      bowerInfo = function(pkg, callback) {
        bower.commands.info(pkg)
          .on('end', function (res) {
            callback(res.latest);
          });
      };

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


gulp.task('list', function() {
  return list();
});


gulp.task('update', function() {
  return update();
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['list', 'update']);

