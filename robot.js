var Bot = require('ttapi');
var Secret = require('./secret.js')
var bot = new Bot(Secret.AUTH, Secret.USERID, Secret.ROOMID);

var netwatchdogTimer = null; // Used to detect internet connection dropping out
var startTime = Date.now(); // Holds start time of the bot
var reLogins = 0; // The number of times the bot has re-logged on due to internet/tt.fm outage.
var botDownDATEtime = ""; // The time/date the bot went down.
var botDownUTCtime = 0; // Used to save the UTC time the bot went down.
var botDowntime = 0; // Used to save the duration of time the bot was down for last.

bot.on('ready', function() {
	console.log("[ BOT is READY FREDDY! on " + Date() + " ] ");
});

bot.on('speak', function (data) {
	console.log(data);
	// Respond to "/hello" command
	if (data.text.match(/^\/hello$/)) {
		bot.speak('Hey! How are you @'+data.name+' ?');
	} else if (data.text.match(/^:botdance:$/)) {
		bot.bop();	
	} else if (data.text.match(/^\/uptime$/i)) {
		upTime(data, false);
	}
});

bot.on('pmmed', function (data) {
	// Respond to "uptime" command
	if (data.text.match(/^\/uptime$/i)) {
		upTime(data, true);
	}
});

bot.on('wserror', function (data) { // Loss of connection detected, takes about 20 seconds
  console.log("[ BOT GOT WS ERROR ]: " + data + " on " + Date());
  botDownDATEtime = Date(); // save the down date/time.
  botDownUTCtime = Date.now(); // save the UTC time the bot went down.
  setTimeout(function () {
    startWatchdog();
  }, 10 * 1000); // give the bot 10 seconds to fully fail before attempting to reconnect
});

bot.on('alive', function () { // Reset the watchdog timer if bot is alive
	if (netwatchdogTimer != null) {
		clearTimeout(netwatchdogTimer);
		netwatchdogTimer = null;
	}
});

bot.on('registered', function (data) {
	// Welcome the new user
	bot.pm('Welcome @'+data.user[0].name+' to the Qualcomm Intern TurnTable room! More features to come later from me!', data.user[0].userid);	
});

bot.on('snagged', function (data) {
	snaggedcount++;
});

var snaggedcount = 0;

bot.on('endsong', function (data) {
	// Give info about the last song
	bot.speak('Last song: '+data.room.metadata.current_song.metadata.song+' :thumbsup: : '+data.room.metadata.upvotes+' :thumbsdown: : '+data.room.metadata.downvotes+' :heart: :'+snaggedcount);
	snaggedcount = 0;
});

function upTime(data, pm) {
	var timeNow = Date.now();
	var upTime = timeNow - startTime;
	var utHours = Math.floor(upTime / (1000 * 3600));
	var utMins = Math.floor((upTime % (3600 * 1000)) / (1000 * 60));
	var utSecs = Math.floor((upTime % (60 * 1000)) / 1000);
	if (reLogins > 0) var relogins = " and gracefully re-logged on due to internet / tt.fm outages " + reLogins + " time(s). Was last down for " + botDowntime + " second(s)";
	else var relogins = "";
	if (utHours > 0) {
		if (pm) bot.pm("I've been slaving away for " + utHours + " hour(s) " + utMins + " minute(s) and " + utSecs + " second(s) now!" + relogins, data.senderid);
		else bot.speak("/me has been slaving away for " + utHours + " hour(s) " + utMins + " minute(s) and " + utSecs + " second(s) now!" + relogins);
	} else if (utMins > 0) {
		if (pm) bot.pm("I've been slaving away for " + utMins + " minute(s) and " + utSecs + " second(s) now!" + relogins, data.senderid);
		else bot.speak("/me has been slaving away for " + utMins + " minute(s) and " + utSecs + " second(s) now!" + relogins);
	} else {
		if (pm) bot.pm("I've been slaving away for " + utSecs + " second(s) now!" + relogins, data.senderid);
		else bot.speak("/me has been slaving away for " + utSecs + " second(s) now!" + relogins);
	}
}

function startWatchdog() { // Start the watchdog timer
	if (netwatchdogTimer == null) {
		netwatchdogTimer = setInterval(function () {
				console.log("[ WAITING FOR INTERNET/TT.FM TO COME BACK!!! ]");
				bot.roomRegister(ROOMID, function (data) {
					if (data && data.success) {
					console.log("[ I'M BACK!!!! WEEEEEEEeeeeeeeeee!!! ]");
					botDowntime = (Date.now() - botDownUTCtime) / 1000;
					reLogins += 1; // Increment the reLogin counter.
					bot.pm("NET/TT.FM WAS DOWN on " + botDownDATEtime + " for " + botDowntime + " second(s)", ADMIN);
					console.log("[ NET/TT.FM WAS DOWN on " + botDownDATEtime + " for " + botDowntime + " second(s) ]");
					// Here you can re-initialize things if you need to, like re-loading a queue
					// ...
					}
					});
				}, 10 * 1000); // Try to log back in every 10 seconds
	}
}
