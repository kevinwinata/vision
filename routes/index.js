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

module.exports = router;