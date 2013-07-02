var Bot = require('ttapi');
var Secret = require('./secret.js')
var bot = new Bot(Secret.AUTH, Secret.USERID);
var imDjing = false;
var djList = []

/*
 * We use a flag to track whether or not we are disconnected. This is because
 * in most cases the underlying WebSocket class will emit 2 events when a
 * connection error occurs: the first indicates an unexpected stream error,
 * and the second indicates that the connection is closed. Tracking the
 * current state allows us to ensure that we are making only one attempt to
 * recover from the connection failure.
 */
var disconnected = false;

function connect(roomid) {
	// Reset the disconnected flag
	disconnected = false;

	// Attempt to join the room
	bot.roomRegister(roomid, function (data) {
		if (data && data.success) {
			console.log('Joined ' + data.room.name);
		} else {
			console.log('Failed to join room');
			if(!disconnected) {
				// Set the disconnected flag
				disconnected = true;
				// Try again in 60 seconds
				setTimeout(connect, 60 * 1000, roomid);
			}
		}
	});
}

bot.on('ready', function() {
	connect(Secret.ROOMID);
});

bot.on('disconnected', function(e) {
	if(!disconnected) {
		// Set the disconnected flag and display message
		disconnected = true;
		console.log("disconnected: " + e);
		// Attempt to reconnect in 10 seconds
		setTimeout(connect, 10 * 1000, Secred.ROOMID);
	}
});

bot.on('speak', function (data) {
	handleMessage(data, false);
});

bot.on('pmmed', function (data) {
	handleMessage(data, true);
});

function checkModStatus(id, callback) {
	bot.roomInfo(function (data) {
		for(i = 0; i<data.room.metadata.moderator_id.length; i++) {
			if(id == data.room.metadata.moderator_id[i]) {
				callback(true);
				return;
			}
		}
		callback(false);
	});
}

function handleMessage(data, pm) {
	var msg = '';
	if (data.text.match(/^\/hello$/)) {
		msg = 'Hey! How are you '+(pm ? '' : '@' + data.name)+' ?';
	} else if (data.text.match(/^:botdance:$/)) {
		checkModStatus((pm ? data.senderid : data.userid), function (result) {
			if (result)
				bot.bop();
		});
	} else if (data.text.match(/^\/downvote$/)) { 
		checkModStatus((pm ? data.senderid : data.userid), function (result) {
			if (result)
				bot.vote('down');
		});
	} else if (data.text.match(/^\/uptime$/i)) {
		msg = 'Working on this comand...';
	} else if (data.text.match(/^\/myid$/)) {
		msg = (pm ? data.senderid : data.userid);
	} else if (data.text.match(/^\/checkmod$/)) {
		checkModStatus((pm ? data.senderid : data.userid), function (result) {
			if(result) {
				bot.speak('You are a moderator!');
			} else {
				bot.speak('You aren\'t a moderator!');
			}
		});
	} else if (data.text.match(/^\/djtimers$/)) {
		for(i = 0; i<djList.length; i++) {
			msg += djList[i].user.name;
			msg += ': ';
			var time = Date.now() - djList[i].uptime;
			var utHours = Math.floor(time / (1000 * 3600));
			var utMins = Math.floor((time % (3600 * 1000)) / (1000 * 60));
			var utSecs = Math.floor((time % (60 * 1000)) / 1000);
			msg += utHours + ':' + utMins + ':' + utSecs;
			if(i != djList.length - 1)
				msg += ', ';
		}
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
	djList.push({user : data.user[0], uptime : Date.now()})
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
	for(i = 0; i < djList.length; i++) {
		if(djList[i].user.userid == data.user[0].userid) {
			djList.splice(i, 1);
		}
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

