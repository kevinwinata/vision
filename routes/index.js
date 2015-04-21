var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	res.render('index', { title: 'Index' });
});

router.get('/path', function(req, res) {
	res.render('path', { title: 'Roadmap Pathfinder' })
});

router.get('/house', function(req, res) {
	res.render('house', { title: 'Satellite House Detector' })
});

router.get('/contrast', function(req, res) {
	res.render('contrast', { title: 'Satellite House Shape Processor' })
});

router.get('/shape', function(req, res) {
	res.render('shape', { title: 'Satellite House Shape Processor' })
});

module.exports = router;
