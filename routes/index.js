var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('index')
});

router.get('/room/:roomName', function(req, res, next) {
    res.render('room', { room: req.params.roomName })
});

module.exports = router;