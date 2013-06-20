var Bot = require('ttapi');
var Secret = require('./secret.js')
var bot = new Bot(Secret.AUTH, Secret.USERID, Secret.ROOMID);
var imDjing = false;

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
	handleMessage(data, false);
});

bot.on('pmmed', function (data) {
	handleMessage(data, true);
});

function handleMessage(data, pm) {
	var msg = '';
	if (data.text.match(/^\/hello$/)) {
		msg = 'Hey! How are you @'+data.name+' ?';
	} else if (data.text.match(/^:botdance:$/)) {
		bot.bop();
	} else if (data.text.match(/^\/uptime$/i)) {
		upTime(data, pm);
	}
	
	if (msg != '') {
		if(pm)
			bot.pm(msg, data.senderid);
		else
			bot.speak(msg);
	}
}

bot.on('newsong', function (data) {
	var djid = data.room.metadata.current_song.djid;
	if (djid == Secret.USERID) {
		bot.skip();
	}
});

bot.on('add_dj', function (data) {
	// Check the DJ count when a new DJ steps up
	bot.roomInfo(false, function (data) {
		var djcount = data.room.metadata.djcount;
		// If there's anything but 1 DJ, bot steps down.
		if(djcount > 2 && imDjing) {
			bot.remDj();
			imDjing = false;
		} 
		if(djcount == 1 && !imDjing) {
			bot.addDj();
			imDjing = true;
		}
	});
});

bot.on('rem_dj', function (data) {
	// Check DJ count when a DJ steps down
	bot.roomInfo(false, function (data) {
		var djcount = data.room.metadata.djcount;
		// If there aren't enough DJ's, bot steps up
		if (djcount == 1) {
			if(imDjing) {
				bot.remDj();	
				imDjing = false;
			} else {
				bot.addDj();
				imDjing = true;
			}
		}
	});
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
	// boot user if they're on the blacklist
	if (data.user[0].name == 'Guest') {
		// Boot all guests and tell them to make an accoun
		console.log(Date() + ' BOOTING GUEST!!');
		bot.boot(data.user[0].userid, 'Please make an account to participate in the Qualcomm Intern TurnTable room! Accounts are required due to trolls. WARNING: Getting booted multiple times could result in a ban!');
	}


});

bot.on('snagged', function (data) {
	snaggedcount++;
});

var snaggedcount = 0;

bot.on('endsong', function (data) {
	if(data.room.metadata.current_song.djid == Secret.USERID)
		return;
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
