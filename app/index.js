var express = require('express'),
    app = module.exports = express(),
    bodyParser = require('body-parser'),
    nodeSass = require('node-sass');

app.sassModules = require('config').plugins;

const LIBSASS_VERSION = require('config').libsassVersion;
const MAX_AGE = 2592000000;

var extractImports = function(sass) {
  var imports = [],
      regex = /@import\s*[("']*([^;]+)[;)"']*/g;

  while ((result = regex.exec(sass)) !== null ) {
    var x = result[1].replace(/"|'/gi, "").split(',');

    for(i = 0; i < x.length; i++) {
      imports.push(x[i].trim());
    }
  }

  return imports;
};

var setIncludePaths = function(imports) {
  var paths = ['lib/sass_modules/', 'lib/sass_modules/vendor/'],
      fingerprint;

  for(i = 0; i < imports.length; i++) {
    for(var module in app.sassModules) {
      fingerprint = new RegExp(app.sassModules[module].fingerprint, 'gi');

      if(imports[i].match(fingerprint)) {
        for(path in app.sassModules[module].paths) {
          paths.push('lib/sass_modules/vendor/' + app.sassModules[module].paths[path] + '/');
        }
      }
    }
  }

  paths = paths.filter(function (v, i, a) { return a.indexOf (v) == i }); // dedupe array
  
  return paths;
};


app.use(express.static('public', { maxAge: MAX_AGE }));
app.use(bodyParser.json());


// Set up site routes
app.get('/', function(req, res) {
  res.json({
    sass: LIBSASS_VERSION,
    engine: 'LibSass'
  });
});


app.post('/compile', function(req, res) {
  var sass = req.body.input,
      outputStyle = req.body.output_style,
      includePaths = setIncludePaths(extractImports(sass)),
      stats = {};

  if(req.body.syntax == 'sass') {
    var convert = require('../lib/sass_modules/vendor/sass2scss');
    console.log('Converting...');

    sass = convert.sass2scss(sass);
  }

  nodeSass.render({
    data: sass + ' ',
    outputStyle: outputStyle,
    stats: stats,
    includePaths: includePaths,

    success: function(css) {
      res.json({
        css: css,
        dependencies: {
          'libsass': LIBSASS_VERSION
        },
        stats: stats.duration / 1000,
        time: stats.duration / 1000
      });
    },

    error: function(error) {
      res.status(500).send(error);
    }
  });
});


app.get('/extensions', function(req, res) {
  res.sendFile('extensions.json', {root: __dirname + '/../public/', maxAge: MAX_AGE});
});


// Heroku defines the port in an environment variable.
// Our app should use that if defined, but we should provide a default.
app.port = process.env.PORT || 1337;

app.listen(app.port);

console.log('The server is now listening on port %s', app.port);

