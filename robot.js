var Bot = require('ttapi');
var Secret = require('./secret.js')
var bot = new Bot(Secret.AUTH, Secret.USERID, Secret.ROOMID);
bot.debug = true;

bot.on('speak', function (data) {
	// Respond to "/hello" command
	if (data.text.match(/^\/hello$/)) {
		bot.speak('Hey! How are you @'+data.name+' ?');
	}
});

bot.on('registered', function (data) {
	// Welcome the new user
	bot.speak('Welcome @'+data.user[0].name+' to the Qualcomm intern TurnTable room! More features to come later from me!');	
});

bot.on('snagged', function (data) {
	snaggedcount++;
});

var snaggedcount = 0;

bot.on('endsong', function (data) {
	// Give info about the last song
	bot.speak('Last song: '+data.room.metadata.current_song.metadata.song+' :thumbsup: : '+data.room.metadata.upvotes+' :thumbsdown: : '+data.room.metadata.downvotes+' :heart: :'+snaggedcount);

});
