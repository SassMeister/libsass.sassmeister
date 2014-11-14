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
  var app = require('./index');
}

