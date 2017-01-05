/**************************************************\

				Hattie Cards v0.1

		Flashcard web app by Harriet Lloyd

			www.harriethyperboloid.com

This Source Code Form is subject to the terms of the 
Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
			
\***************************************************/


window.onload = function(){

	var pages = [];
	
	var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, '', {preload:preload, create:create});

	var background;
	
	window.onresize = function(){game.scale.setGameSize(window.innerWidth, window.innerHeight); game.state.restart();}   //XXX Change this so each state has a draw/redraw function
	
	function preload(){
		game.load.json('page_structure','Decks/page_structure.json');
	}

	function create(){
		
		//Add menu state
		var menuState = newMenuState();	
		game.state.add('menu', menuState);
		game.state.start('menu');

		function newMenuState(){
			var obj = new Phaser.State();
			obj.preload = function preload(){

				pages = game.cache.getJSON('page_structure');
				
				game.load.json('card_types', 'Decks/card_types.json');

				for( var i = 0; i < pages.length; i++){
				//for each page containing (ideally) up to six decks
					var page = pages[i];
					var deckNames = page.fileNames;
					for (var j = 0; j < deckNames.length; j++){
					//for each deck on this page
						deckName = deckNames[j];
						//load the deck's button image and flashcard data
						game.load.image( deckName, 'Decks/'+page.folder+'/'+deckName+'.png');
						game.load.json(deckName+'_json','./Decks/'+page.folder+'/'+deckName+'.json');
					}
				}
				//load the title and background for this page
				game.load.image('title', 'Decks/'+page.folder+'/title.png');
				game.load.image('background', 'Decks/'+page.folder+'/background.jpg');
			}
			obj.create = function create(){
				//should take pageIndex
				var pageIndex = 0;
				
				var page = pages[0];
				
				this.game.stage.backgroundColor = page.colour;

				var title = game.add.sprite(0,0,'title');
				if( title.width < game.width ){
					title.scale.setTo(game.width/title.width);
				}
				
				var deckButtons = [];
				var deckNames = page.fileNames;
				var deckName;

				var numRows = Math.ceil( deckNames.length/2 );
				var numColumns = 2;

				for (var i = 0; i < deckNames.length; i++){
				//for each deck on this page
					deckName = deckNames[i];
					
					page.decks[deckName] = game.cache.getJSON(deckName+'_json');

					//Where on the screen will the buttons go?
					var x_ratio = (i%2+1)/(numColumns+1);			// 1/3, 2/3, 1/3, 2/3, ...
					var y_ratio = Math.floor((i+2)/2)/(numRows+1);	// 1/y, 1/y, 2/y, 2/y, ...
					
					if( i === deckNames.length - 1 && deckNames.length % 2 === 1 ){
						x_ratio = 1/2;
					}					
					deckButtons[i] = game.add.sprite(Math.floor(game.world.width*x_ratio), Math.floor(game.world.height*y_ratio), deckName);
					deckButtons[i].anchor.set(0.5);

					deckButtons[i].scale.setTo( game.width/(5*deckButtons[i].width) );
					
					deckButtons[i].inputEnabled = true;
					deckButtons[i].events.onInputDown.add(buttonPressed, {deckName:deckName, pageIndex:pageIndex});

				}
			}
			function buttonPressed(){
			//...a deck button image has been pressed
				var loadingState = newLoadingState(this.deckName, this.pageIndex);
				game.state.add('load_'+this.deckName, loadingState);
				game.state.start('load_'+this.deckName);
			}
			return obj;
		}

		function newLoadingState(deckName, pageIndex){
			var obj = new Phaser.State();
			obj.preload = function preload(){
				var deck = pages[pageIndex].decks[deckName];
				//load sounds, pictures for this deck
				for( var i = 0; i < deck.length; i++ ){
				//for each card in the deck...
					if( deck[i].sound !== ""){
						var soundFile = 'Decks/' + pages[pageIndex].folder+'/'+deckName+'/'+deck[i].sound;
						//Load the audio
						game.load.audio(deck[i].sound, soundFile);
					}
					if( deck[i].picture !== ""){
						var pictureFile = 'Decks/' + pages[pageIndex].folder+'/'+deckName+'/'+deck[i].picture;
						//Load the image
						game.load.image(deck[i].picture, pictureFile);
					}
				}
			}
			obj.create = function create(){

				//transfer to deck state
				var deckState = newDeckState(deckName, pageIndex);
				game.state.add('deck', deckState);
				game.state.start('deck');
			}
			return obj;
		}

		function newDeckState(deckName, pageIndex){
			var deck;							
			var cardTypes;
			
			var currentCard;
			
			//text objects
			var question;
			var answer;
			var preText;
			var postText;

			//button objects
			var showbutton;	
			var yesButton;
			var noButton;
			var menuButton;
			var speakerButton;
			
			var blackbox;
			var pic;

			//counters
			var numCardsToReview;
			var index;
					
			var obj = new Phaser.State();
			obj.preload = function preload(){
				game.load.spritesheet('showbutton', 'assets/show_button_spritesheet.png', 193, 71);
				game.load.spritesheet('menubutton', 'assets/menu_button_spritesheet603x200.png', 200, 200);
				game.load.spritesheet('yesbutton', 'assets/yes_button_spritesheet600x200.png', 200, 200);
				game.load.spritesheet('nobutton', 'assets/no_button_spritesheet600x200.png', 200, 200);
				game.load.spritesheet('speakerbutton', 'assets/speaker_button_spritesheet600x200.png', 200, 200);

				cardTypes = game.cache.getJSON('card_types');
				deck = pages[pageIndex].decks[deckName];
				
				for( var i = 0; i < deck.length; i++ ){
				//for each card in the deck...
					if( deck[i].sound !== "" ){
						//Add the sound into a new variable - audio
						deck[i].audio = game.add.audio(deck[i].sound);
					}
				}
			}

			obj.create = function create(){

				numCardsToReview = deck.length;
				
				for (var i = 0; i < deck.length; i++){		//XXX maybe put a cap here on the number of cards later?
					deck[i].reviewCard = true;
				}
				
				deck = shuffle(deck);

				this.game.stage.backgroundColor = "#000000";
				background = game.add.sprite(0,0,'background');
				if( game.width/game.height > background.width/background.height ){
					background.scale.setTo( game.width/background.width );
				}else{
					background.scale.setTo( game.height/background.height );					
				}
				var border = game.height/10;
				blackbox = game.add.graphics(0,0);
				blackbox.beginFill(0x000000,1);
				blackbox.drawRect(border, border, window.innerWidth - 2*border, window.innerHeight - 2*border);
				blackbox.endFill();

				index = -1;

				//Add buttons (front of a card has "show" and the back of a card has "yes" and "no" buttons)

				showbutton = game.add.button(game.world.centerX, game.world.height - 100, 'showbutton', showAnswer, this, 2, 1, 0);
				showbutton.anchor.set(0.5);
				
				menuButton = game.add.button(0, 0, 'menubutton', function(){game.state.start('menu')}, this, 1, 0, 2);
				menuButton.width = game.world.width/6;
				menuButton.height = game.world.width/6;

				noButton = game.add.button(game.world.centerX - game.world.width/8, game.world.height - 10 - game.world.width/16, 'nobutton', wrongAnswer, this, 1, 0, 2);
				noButton.anchor.set(0.5);
				noButton.width = game.world.width/8;
				noButton.height = game.world.width/8;

				yesButton = game.add.button(game.world.centerX + game.world.width/8, game.world.height - 10 - game.world.width/16, 'yesbutton', rightAnswer, this, 1, 0, 2);
				yesButton.anchor.set(0.5);
				yesButton.width = game.world.width/8;
				yesButton.height = game.world.width/8;

				speakerButton = game.add.button(game.world.centerX, (3/8)*game.world.height, 'speakerbutton', onSpeakerButtonPressed, this, 1, 0, 2);
				speakerButton.anchor.set(0.5);
				speakerButton.width = game.world.width/6;
				speakerButton.height = game.world.width/6;

				yesButton.visible = false;
				noButton.visible = false;				
				speakerButton.visible = false;

				nextCard();
			}

			function nextCard(){
				//Destroy the text on screen from the previous card
				if( question !== undefined ){
					question.destroy();
				}if( answer !== undefined ){
					answer.destroy();
				}if( preText !== undefined ){
					preText.destroy();
				}if( postText !== undefined ){
					postText.destroy();
				}if( pic !== undefined ){
					pic.destroy();
				}
				game.stage.backgroundColor = "#000000";
				
				yesButton.visible = false;
				noButton.visible = false;
				speakerButton.visible = false;

				blackbox.alpha = 1;

				if( numCardsToReview > 0 ){
				//...we still have cards in the deck for the user to review
					var cardFound = false;
					while( cardFound === false ){
						//loop through the deck until we find the next card to review
						index++;
						if (index === deck.length){
							index = 0;
						}
						currentCard = deck[index];
						if( currentCard.reviewCard === true ){
							cardFound = true;
						}
					}

					var front = currentCard.front;
					var type = cardTypes[currentCard.cardType];

					//Show the front text
					question = game.add.text( game.world.centerX, game.world.centerY, front, type.styleFront );
					question.anchor.set(0.5);
					question.position.y -= (1/2)*question.height;
					preText =  game.add.text( game.world.centerX, (1/4)*game.world.height, type.preText, type.stylePreText );
					preText.anchor.set(0.5);

					if( currentCard.picture !== "" ){
					//...there's a picture on this card
						pic = game.add.sprite(game.world.centerX, game.world.centerY, currentCard.picture);
						pic.anchor.set(0.5);
						var x1 = (1/4)*game.world.height+preText.height
						var x2 = (3/4)*game.world.height
						var distance = x2-x1;
						pic.scale.setTo(distance/pic.height);
					}
					if( currentCard.listenFirst === true ){
						speakerButton.visible = true;
					}
					showbutton.visible = true;
				}else{
				//...the deck is finished
					question = game.add.text(300, 300, "Well done! :)", { "font": "24px Arial", "fill": "#ffffff", "align": "center"} );
				}
			}
			function showAnswer(){
				showbutton.visible = false;
				noButton.visible = true;
				yesButton.visible = true;
				this.game.stage.backgroundColor = "#4444CC";
				blackbox.alpha = 0;

				//Show the back text
				var back = currentCard.back;
				var type = cardTypes[currentCard.cardType];
				answer = game.add.text(game.world.centerX, game.world.centerY, back, type.styleBack);
				answer.anchor.set(0.5);
				answer.position.y += (1/2)*answer.height;
				postText =  game.add.text( game.world.centerX, (3/4)*game.world.height, type.postText, type.stylePostText );
				postText.anchor.set(0.5);

				//Play the sound
				if( currentCard.listenFirst === false ){
					if( currentCard.sound !== "" ){
						playAudio(currentCard.audio);
					}
				}
			}
			function onSpeakerButtonPressed(){
				if( currentCard.audio !== undefined){
					playAudio(currentCard.audio);
				}
			}
			function playAudio(audio){
				if( audio !== undefined ){
					var prevSoundTime = 1;
					setTimeout(audioCallback(audio), prevSoundTime);
					prevSoundTime = audio.durationMS;
				}				
			}
			function audioCallback(audio){
			//captures the audio so it doesn't change
				return function(){
					audio.play();
				}
			}
			function wrongAnswer(){
				nextCard();
			}
			function rightAnswer(){
				currentCard.reviewCard = false;
				numCardsToReview = numCardsToReview - 1;
				nextCard();
			}
			function shuffle(deck){
				//For i = n, ... 2, 1	pick a random number below i	then store the card just before i in tmp, swap the random card with that card
				for( var tmp, j, i = deck.length; i > 0 ; j = Math.floor(Math.random() * i), tmp = deck[--i], deck[i] = deck[j], deck[j] = tmp );
				return deck;
			}
			
			return obj;
		}

	};

};
