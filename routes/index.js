var express = require('express');
var router = express.Router();
var nodemailer = require("nodemailer");
var Player = require("../models/player");
var IP = require("../models/ip");
function makeSecret(lenght)
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < lenght; i++ )
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};
router.all('/*', function(req, res, next) {
    IP.findOne({ip:req.connection.remoteAddress}).exec(function (err,ip) {
        if(ip)
            if(ip.banned)
                res.render("banned");
            else
                return next();
        else
            return next();
    });
});
router.get('/', function(req, res, next) {
  // res.render('loader');
  res.render('index');
});
router.get('/intro', function(req, res, next) {
  // res.render('index');
  redirect('/');
});

router.get('/bluppy', function(req, res, next) {
  res.render('play');
});
router.get('/score', function(req, res, next) {
  Player.find({}).sort({score:-1}).sort({createdAt:1}).exec(function (err,players) {
    res.render('scoreboard',{players:players});
  });

});
router.post('/bluppy', function(req, res, next) {
  var score = req.body.playerbirdscore;
  var name = req.body.playerbirdname;
  if(score > 50)
  {
    score = -1;
    IP.findOneAndUpdate({ip:req.connection.remoteAddress}, {$set:{cheat:req.body.playerbirdscore,banned:true}},{upsert:true},function(err, ip){
        console.log("Cheated :"+name+":"+req.body.playerbirdscore+":"+ip.ip);
    });
  }
  Player.findOne({name: name}).exec(function (err,pastplayer) {
    if(!pastplayer||pastplayer.score<req.body.playerbirdscore)
      Player.findOneAndUpdate({name: name}, {$set:{score:score}},{upsert:true},function(err, player){});
  });
  res.redirect("/bluppy");
});
router.get('/loader', function(req, res, next) {
  res.render('loader');
});

router.post('/message', function(req, res, next) {
  var transporter = nodemailer.createTransport('smtps://deepskyblueacm%40gmail.com:verydeepskyblueacm@smtp.gmail.com');
  var mailOptions = {
    from: '"Deep Sky Blue ACM" <deepskyblueacm@skyblueacm.com>', // sender address
    to: "ahsprim@gmail.com", // list of receivers
    subject: req.body.name + " : " +req.body.email, // Subject line
    text: req.body.message, // plaintext body
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log(error);
    }
    console.log('Message sent: ' + info.response);
  });
  res.render("index");
});
module.exports = router;
