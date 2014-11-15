var request = require('supertest'),
    _ = require('lodash'),
    fs = require('fs'),
    app = require('../app');

describe('GET /extensions', function() {
  it('respond with json', function(done) {
    request(app)
      .get('/extensions')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  })
});


describe('Routes', function() {
  describe('GET /', function() {
    it('responds OK', function(done) {
      request(app)
        .get('/')
        .expect(200, done);
    });
  });


  describe('POST /compile', function() {
    it('responds with a JSON object containing compiled CSS', function(done) {
      request(app)
        .post('/compile')
        .send({
          input: "$size: 12px * 2;\n\n.box {\n  font-size: $size;\n}", 
          syntax: 'scss', 
          output_style: 'compressed'
        })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(function(res) {
          if(res.body.css != '.box{font-size:24px}') throw new Error('expected ".box{font-size:24px}", got "' + res.body.css + '"');
        })
        .expect(200, done);
    });
  });
});


describe('Extensions', function() {
  function valid(css) {
    css = css.trim();

    return ! (!css || css.match('Undefined') || css.match('Invalid') || css.match('unreadable') || css.match('isn\'t a valid CSS value'))
  }

  _.each(app.sassModules, function(extension, key) {
    var fixture = fs.readFileSync('test/fixtures/' + key + '.scss', {encoding: 'utf8'});

    describe('Sass input with ' + key + ' selected', function() {
      it('should return valid CSS', function(done) {
        request(app)
          .post('/compile')
          .send({
            input: fixture, 
            syntax: 'scss', 
            output_style: 'compressed'
          })
          .set('Content-Type', 'application/json')
          .expect('Content-Type', /json/)
          .expect(function(res) {
            if(! valid(res.body.css)) throw new Error('Invalid CSS: ' + res.body.css);
          })
          .expect(200, done);
      });
    });
  });
});

