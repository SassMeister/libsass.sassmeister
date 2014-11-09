require('newrelic');

var cluster = require('cluster');

if (cluster.isMaster) {
  // Count the machine's CPUs
  var cpuCount = require('os').cpus().length;

  // Create a worker for each CPU
  for (var i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  // Listen for dying workers
  cluster.on('exit', function (worker) {
    // Replace the dead worker, we're not sentimental
    console.log('Worker ' + worker.id + ' died :(');
    cluster.fork();
  });
} else {

  // set variables for environment
  var express = require('express'),
      app = express(),
      path = require('path'),
      fs = require('fs'),
      bodyParser = require('body-parser'),
      nodeSass = require('node-sass'),
      sassModules = require('config').plugins;

  var extractImports = function(sass) {
    var imports = [],
        regex = /@import\s*[("']*([^;]+)[;)"']*/g;

    while ((result = regex.exec(sass)) !== null ) {
      var x = result[1].replace(/"|'/gi, "").split(",");

      for(i = 0; i < x.length; i++) {
        imports.push(x[i].trim());
      }
    }

    return imports;
  };

  var setIncludePaths = function(imports) {
    var paths = ["sass_modules/"],
        fingerprint;

    for(i = 0; i < imports.length; i++) {
      for(var module in sassModules) {
        fingerprint = new RegExp(sassModules[module].fingerprint, "gi");

        if(imports[i].match(fingerprint)) {
          for(path in sassModules[module].paths) {
            paths.push("sass_modules/" + sassModules[module].paths[path] + "/");
          }
        }
      }
    }

    paths= paths.filter(function (v, i, a) { return a.indexOf (v) == i }); // dedupe array

    return paths;
  };

  var sassCompile = function(sass, outputStyle) {
    var includePaths = setIncludePaths(extractImports(sass));

    return nodeSass.renderSync({
      data: sass,
      outputStyle: outputStyle,
      includePaths: includePaths
    });
  };


  // views as directory for all template files
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  // instruct express to server up static assets
  app.use(express.static('public'));
  
  app.use(bodyParser.urlencoded({ extended: false }));

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
    var css = '',
        sass = req.body.input,
        outputStyle = req.body.output_style,
        time = new Date;

    try {
      if(req.body.syntax == 'sass') {
        console.log('Converting...');
        var convert = require('../sass_modules/sass2scss');

        sass = convert.sass2scss(sass);
      }

      css = sassCompile(sass, outputStyle)
    }
    catch(e) {
      css = e.toString();
    }

    time = (new Date - time) / 1000;

    res.json({
      css: css,
      dependencies: {
        'libsass': '3.0.2'
      },
      time: time
    });
  });


  app.get('/extensions', function(req, res) {
    res.set('Last-Modified', (new Date(fs.statSync('config/plugins.json').mtime)).toUTCString());

    if(req.fresh) {
      res.send(304);

    } else {
      var extensions = {}

      for(extension in sassModules) {
        extensions[extension] = {
          import: sassModules[extension].imports
        }
      }

      res.set({
        'Cache-Control': 'public, max-age=2592000',
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify(extensions));
    }
  });

  // Heroku defines the port in an environment variable.
  // Our app should use that if defined, otherwise 3000 is a pretty good default.
  var port = process.env.PORT || 1337;
  app.listen(port);

  console.log("The server is now listening on port %s", port);
}

