// set variables for environment
var express = require('express'),
    app = module.exports = express(),
    bodyParser = require('body-parser'),
    nodeSass = require('node-sass');

app.sassModules = require('config').plugins;

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
  var paths = ['import_shims/', 'sass_modules/'],
      fingerprint;

  for(i = 0; i < imports.length; i++) {
    for(var module in app.sassModules) {
      fingerprint = new RegExp(app.sassModules[module].fingerprint, 'gi');

      if(imports[i].match(fingerprint)) {
        for(path in app.sassModules[module].paths) {
          paths.push('sass_modules/' + app.sassModules[module].paths[path] + '/');
        }
      }
    }
  }

  paths= paths.filter(function (v, i, a) { return a.indexOf (v) == i }); // dedupe array

  return paths;
};

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

// instruct express to server up static assets
app.use(express.static('public', { maxAge: 2592000000 }));

app.use(bodyParser.json());


app.use(function (req, res, next) {
  next();
});


app.all('*', function(req, res, next) {
  if(req.get('origin') && req.get('origin').match(/^http:\/\/(.+\.){0,1}sassmeister\.(com|dev|([\d+\.]{4}xip\.io))/)) {
    res.set('Access-Control-Allow-Origin', req.get('origin'));
  }

  next();
});


// Set up site routes
app.get('/', function(req, res) {
  res.render('index');
});


app.post('/compile', function(req, res) {
  var sass = req.body.input,
      outputStyle = req.body.output_style,
      includePaths = setIncludePaths(extractImports(sass)),
      stats = {};

  if(req.body.syntax == 'sass') {
    console.log('Converting...');
    var convert = require('../sass_modules/sass2scss');

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
          'libsass': '3.0.2'
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
  res.sendFile('extensions.json', {root: __dirname + '/../public/', maxAge: 2592000000});
});


// Heroku defines the port in an environment variable.
// Our app should use that if defined, but we should provide a default.
app.port = process.env.PORT || 1337;

app.listen(app.port);

console.log('The server is now listening on port %s', app.port);

