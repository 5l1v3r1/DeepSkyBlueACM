/*
   Copyright 2014 Nebez Briefkani
   floppybird - main.js

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/


var debugmode = false;

var states = Object.freeze({
   SplashScreen: 0,
   GameScreen: 1,
   ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = $("#flyarea").height();

var score = 0;
var highscore = 0;
var playername = "";

var pipeheight = 90;
var pipewidth = 52;
var pipes = new Array();

var replayclickable = false;

//sounds
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;

$(document).ready(function() {
   var submitted= getCookie("submitted");
   if(submitted=="true") {
      swal({
         title: "Your score has been submitted",
         type: "success",
         html: "<a href='/score'>Scoreboard</a>"
      }).then(function () {
         setCookie("submitted", "false", 999);
         if (window.location.search == "?debug")
            debugmode = true;
         if (window.location.search == "?easy")
            pipeheight = 200;

         //get the highscore
         var savedscore = getCookie("highscore");
         if (savedscore != "") {
            highscore = parseInt(savedscore);
            showSplash();
         }
         else
         {
            swal({
               title: "Your score has been submitted",
               type: "success",
               html: "<a href='/score'>Scoreboard</a>"
            }).then(function () {showSplash();});
         }
      });
   }
   else{
      setCookie("submitted", "false", 999);
      if(window.location.search == "?debug")
         debugmode = true;
      if(window.location.search == "?easy")
         pipeheight = 200;

      //get the highscore
      var savedscore = getCookie("highscore");
      if (savedscore != "") {
         highscore = parseInt(savedscore);
         showSplash();
      }
      else
      {
         swal({
            title: "Play and win badges",
            text:"To win more \"KHAFAN\" badge, score higher!",
            type: "info",
            confitmButtonText:"Let's play!"
         }).then(function () {showSplash();});
      }
   }

   // start with the splash screen

});

function getCookie(cname)
{
   var name = cname + "=";
   var ca = document.cookie.split(';');
   for(var i=0; i<ca.length; i++) 
   {
      var c = ca[i].trim();
      if (c.indexOf(name)==0) return c.substring(name.length,c.length);
   }
   return "";
}

function setCookie(cname,cvalue,exdays)
{
   var d = new Date();
   d.setTime(d.getTime()+(exdays*24*60*60*1000));
   var expires = "expires="+d.toGMTString();
   document.cookie = cname + "=" + cvalue + "; " + expires;
}

function showSplash()
{
   currentstate = states.SplashScreen;
   
   //set the defaults (again)
   velocity = 0;
   position = 180;
   rotation = 0;
   score = 0;
   
   //update the player in preparation for the next game
   $("#player").css({ y: 0, x: 0});
   updatePlayer($("#player"));
   
   soundSwoosh.stop();
   soundSwoosh.play();
   
   //clear out all the pipes if there are any
   $(".pipe").remove();
   pipes = new Array();
   
   //make everything animated again
   $(".animated").css('animation-play-state', 'running');
   $(".animated").css('-webkit-animation-play-state', 'running');
   
   //fade in the splash
   $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

function startGame()
{
   currentstate = states.GameScreen;
   
   //fade out the splash
   $("#splash").stop();
   $("#splash").transition({ opacity: 0 }, 500, 'ease');
   
   //update the big score
   setBigScore();
   
   //debug mode?
   if(debugmode)
   {
      //show the bounding boxes
      $(".boundingbox").show();
   }

   //start up our loops
   var updaterate = 1000.0 / 60.0 ; //60 times a second
   loopGameloop = setInterval(gameloop, updaterate);
   loopPipeloop = setInterval(updatePipes, 1400);
   
   //jump from the start!
   playerJump();
}

function updatePlayer(player)
{
   //rotation
   rotation = Math.min((velocity / 10) * 90, 90);
   
   //apply rotation and position
   $(player).css({ rotate: rotation, top: position });
}

function gameloop() {
   var player = $("#player");
   
   //update the player speed/position
   velocity += gravity;
   position += velocity;
   
   //update the player
   updatePlayer(player);
   
   //create the bounding box
   var box = document.getElementById('player').getBoundingClientRect();
   var origwidth = 34.0;
   var origheight = 24.0;
   
   var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
   var boxheight = (origheight + box.height) / 2;
   var boxleft = ((box.width - boxwidth) / 2) + box.left;
   var boxtop = ((box.height - boxheight) / 2) + box.top;
   var boxright = boxleft + boxwidth;
   var boxbottom = boxtop + boxheight;
   
   //if we're in debug mode, draw the bounding box
   if(debugmode)
   {
      var boundingbox = $("#playerbox");
      boundingbox.css('left', boxleft);
      boundingbox.css('top', boxtop);
      boundingbox.css('height', boxheight);
      boundingbox.css('width', boxwidth);
   }
   
   //did we hit the ground?
   if(box.bottom >= $("#land").offset().top)
   {
      playerDead();
      return;
   }
   
   //have they tried to escape through the ceiling? :o
   var ceiling = $("#ceiling");
   if(boxtop <= (ceiling.offset().top + ceiling.height()))
      position = 0;
   
   //we can't go any further without a pipe
   if(pipes[0] == null)
      return;
   
   //determine the bounding box of the next pipes inner area
   var nextpipe = pipes[0];
   var nextpipeupper = nextpipe.children(".pipe_upper");
   
   var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
   var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
   var piperight = pipeleft + pipewidth;
   var pipebottom = pipetop + pipeheight;
   
   if(debugmode)
   {
      var boundingbox = $("#pipebox");
      boundingbox.css('left', pipeleft);
      boundingbox.css('top', pipetop);
      boundingbox.css('height', pipeheight);
      boundingbox.css('width', pipewidth);
   }
   
   //have we gotten inside the pipe yet?
   if(boxright > pipeleft)
   {
      //we're within the pipe, have we passed between upper and lower pipes?
      if(boxtop > pipetop && boxbottom < pipebottom)
      {
         //yeah! we're within bounds
         
      }
      else
      {
         //no! we touched the pipe
         playerDead();
         return;
      }
   }
   
   
   //have we passed the imminent danger?
   if(boxleft > piperight)
   {
      //yes, remove it
      pipes.splice(0, 1);
      
      //and score a point
      playerScore();
   }
}

//Handle space bar
$(document).keydown(function(e){
   //space bar!
   if(e.keyCode == 32)
   {
      screenClick();
      //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
      if(currentstate == states.ScoreScreen)
         $("#replay").click();
      else if(currentstate )
         screenClick();
   }
});

// Handle mouse down OR touch start
if("ontouchstart" in window)
   $(document).on("touchstart", screenClick);
else
   $(document).on("mousedown", screenClick);

function screenClick()
{
   if(currentstate == states.GameScreen)
   {
      playerJump();
   }
   else if(currentstate == states.SplashScreen)
   {
      startGame();
   }
}

function playerJump()
{
   velocity = jump;
   //play jump sound
   soundJump.stop();
   soundJump.play();
}

function setBigScore(erase)
{
   var elemscore = $("#bigscore");
   elemscore.empty();
   
   if(erase)
      return;
   
   var digits = score.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='game/assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setSmallScore()
{
   var elemscore = $("#currentscore");
   elemscore.empty();
   
   var digits = score.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='game/assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore()
{
   var elemscore = $("#highscore");
   elemscore.empty();
   
   var digits = highscore.toString().split('');
   for(var i = 0; i < digits.length; i++)
      elemscore.append("<img src='game/assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal()
{
   var elemmedal = $("#medal");
   elemmedal.empty();
   
   if(highscore < 20)
      //signal that no medal has been won
      return false;
   if(highscore >= 20)
      medal = "silver";
   if(highscore >= 40)
      medal = "gold";
   if(highscore >= 100)
      medal = "platinum";

   setCookie("playermedal", playername, 999);
   elemmedal.append('<img src="game/assets/medal_' + medal +'.png" alt="' + medal +'">');
   
   //signal that a medal has been won
   return true;
}

function playerDead()
{
   //stop animating everything!

   $(".animated").css('animation-play-state', 'paused');
   $(".animated").css('-webkit-animation-play-state', 'paused');
   
   //drop the bird to the floor
   var playerbottom = $("#player").position().top + $("#player").width(); //we use width because he'll be rotated 90 deg
   var floor = flyArea;
   var movey = Math.max(0, floor - playerbottom);
   $("#player").transition({ y: movey + 'px', rotate: 90}, 1000, 'easeInOutCubic');
   
   //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
   currentstate = states.ScoreScreen;

   //destroy our gameloops
   clearInterval(loopGameloop);
   clearInterval(loopPipeloop);
   loopGameloop = null;
   loopPipeloop = null;

   //mobile browsers don't support buzz bindOnce event
    showScore();
}

function showScore()
{
   //unhide us
   $("#scoreboard").css("display", "block");
   
   //remove the big score
   setBigScore(true);
   playername = getCookie("playername");
   //have they beaten their high score?

   if(score > highscore)
   {
      //yeah!
      highscore = score;
      //save it!
      setCookie("highscore", highscore, 999);
      setCookie("playername", playername, 999);
   }
   
   //update the scoreboard
   setSmallScore();
   setHighScore();
   var wonmedal = setMedal();
   //SWOOSH!
   var medalPath = $("#medal img").attr("src");
   var x = score;
   var medalHtml = "<h1>You won this badge :</h1>"+
       "<a href='/medal'> <img src='"+medalPath+"' style='border-radius: 100px;width: 100px;height: 100px'></a> <br>" +
       "<a href='/score'>Scoreboard</a> <br>";
   if(!wonmedal)
       medalHtml ="<h1 style='text-align: center'>You have to score higher to win a badge!</h1><br>" +
           "<a href='/score'>Scoreboard</a> <br>";
   swal(
          {
             title: "Score: " + score + "! " + "  Highscore:" + highscore +"!",
             input:"text",confirmButtonText:"Submit your score",
             showCloseButton:true,
             type: "info",
             html:medalHtml,
             animation: "slide-from-top", inputPlaceholder: "Enter Your Name",inputValue:playername,
             preConfirm: function (pname) {
                return new Promise(function (resolve, reject) {
                   setTimeout(function() {
                      if (pname=== '') {
                         reject('Name cannot be empty!')
                      } else {
                         resolve()
                      }
                   }, 2000)
                })
             },
             onClose: function () {showSplash()},
          }).then(function (name) {
         if(playername != name)
            setCookie("highscore", x, 999);
         playername = name;
         setCookie("playername", playername, 999);
         setCookie("submitted", "true", 999);
          $('#flyarea').append("<form id='scoreform' action='/bluppy' method='post'></form>>");
          $('#scoreform').append("<input id='playerbirdname' name='playerbirdname'  type='text'/>");
          $('#scoreform').append("<input id='playerbirdscore' name='playerbirdscore' type='number'/>");
          $("#playerbirdname").attr("value", playername);
         $("#playerbirdscore").attr("value", x);
         $("#replay").css({ y: '40px', opacity: 0 });
         // $("#scoreboard").transition({ y: '0px', opacity: 1}, 600, 'ease', function() {
         //    //When the animation is done, animate in the replay button and SWOOSH!
         //    soundSwoosh.stop();
         //    soundSwoosh.play();
         //    $("#replay").transition({ y: '0px', opacity: 1}, 600, 'ease');
         //
         //    //also animate in the MEDAL! WOO!
         //    if(wonmedal)
         //    {
         //       $("#medal").css({ scale: 2, opacity: 0 });
         //       $("#medal").transition({ opacity: 1, scale: 1 }, 1200, 'ease');
         //    }
         // });
         //
         //make the replay button clickable
         replayclickable = true;
         $("#scoreform").submit();
         // swal({title:"Your Score has been submitted!",type:"success"}).then(function () {
         // });
      });
   // });

   //show the scoreboard
   // $("#scoreboard").css({ y: '40px', opacity: 0 }); //move it down so we can slide it up

   // var sss = "/score/"+"amir"+"/"+score.toString();
   // $("#scoreform").attr("action",sss);
   // // $("#scoreform").attr("action","/sss");
   // $("#scoreform").submit();
   
}

$("#replay").click(function() {
   //make sure we can only click once
   if(!replayclickable)
      return;
   else
      replayclickable = false;
   //SWOOSH!
   soundSwoosh.stop();
   soundSwoosh.play();
   
   //fade out the scoreboard
   $("#scoreboard").transition({ y: '-40px', opacity: 0}, 1000, 'ease', function() {
      //when that's done, display us back to nothing
      $("#scoreboard").css("display", "none");
      
      //start the game over!
      showSplash();
   });
});

function playerScore()
{
   score += 1;
   //play score sound
   soundScore.stop();
   soundScore.play();
   setBigScore();
}

function updatePipes()
{
   //Do any pipes need removal?
   $(".pipe").filter(function() { return $(this).position().left <= -100; }).remove()
   
   //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
   var padding = 80;
   var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
   var topheight = Math.floor((Math.random()*constraint) + padding); //add lower padding
   var bottomheight = (flyArea - pipeheight) - topheight;
   var newpipe = $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
   $("#flyarea").append(newpipe);
   pipes.push(newpipe);
}

var isIncompatible = {
   Android: function() {
   return navigator.userAgent.match(/Android/i);
   },
   BlackBerry: function() {
   return navigator.userAgent.match(/BlackBerry/i);
   },
   iOS: function() {
   return navigator.userAgent.match(/iPhone|iPad|iPod/i);
   },
   Opera: function() {
   return navigator.userAgent.match(/Opera Mini/i);
   },
   Safari: function() {
   return (navigator.userAgent.match(/OS X.*Safari/) && ! navigator.userAgent.match(/Chrome/));
   },
   Windows: function() {
   return navigator.userAgent.match(/IEMobile/i);
   },
   any: function() {
   return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
   }
};