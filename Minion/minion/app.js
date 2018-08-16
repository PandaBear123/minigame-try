var app = new Vue({
    // mounted to <div id="app">
    el: '#app',
    // all data we need in UI
    data: {
        topMessage: 'Start flipping to start grilling!',
        cards: [],
        timer: 0,
        totalSeconds: 0,
        currentTime: { hour: 0, minute: 0, second: 0 },
        totalSteps: 0, 
        records: 'record storage for firebase',
        rankingData: [],
        ranking: 0,
        totalPlays: 0,
        pushCounter: 0,
        playerName: ''
    },

    beforeCreate: function() {
    // Initialize Firebase
          var config = {
            apiKey: "AIzaSyCslqvGxP05bAFdl20fxNSgIXN1gVW6Loo",
            authDomain: "minigame-try.firebaseapp.com",
            databaseURL: "https://minigame-try.firebaseio.com",
            projectId: "minigame-try",
            storageBucket: "minigame-try.appspot.com",
            messagingSenderId: "395570427928"
          };
          firebase.initializeApp(config);

          // Get a reference to the database service
          var database = firebase.database();
          this.$records = database.ref('records');


    },
    // lifecycle, when component created
    created: function () {
        this.cards = this.shuffleCards();
    },
    // all data for compute purpose only, no logic
    computed: {
        isReachMaxFlippedCard: function () {
            var maxFlipped = 2;
            var totalFlipped = this.flippedCards.length;
            return totalFlipped >= maxFlipped;
        },

        flippedCards: function () {
            var cards = _.filter(this.cards, function (card) {
                return card.isFlipped === true;
            });

            return cards;
        },

        isGameCompleted: function () {
            var totalCompleted = _.filter(this.cards, function (card) {
                return card.isCompleted === true;
            }).length;

            var isCompleted = this.cards.length === totalCompleted;

            if(isCompleted) {
                this.generateResults();
            }
            
            return isCompleted;
        },

        isNameNull: function () {
            return (this.playerName.length === 0);
        }
    },
    // function to format display data in ui, same as angularjs filter
    filters: {
        lpadTime: function (value) {
            var format = '00';
            var text = format + value;
            return text.slice(-format.length)
        }
    },
    // all the functions
    methods: {
        setValue: function() {
            if(this.playerName == '') {
                this.playerName = this.$refs.playerName.value;
            }
        },
        //put it all together
        generateResults: function() {
            if(this.pushCounter < 1) {
                this.pushToFirebase();
                this.retrieveDataToArray().then(() => {
                    this.getRanking();    
                });
                
            }
        },
        //push data to firebase
        pushToFirebase: function() {
            this._key = this.$records.push().key;
            const updates = {};

            updates[`${this._key}`] = {
                user: this.playerName,
                totalSteps: this.totalSteps,
                totalSeconds: this.totalSeconds,
                hour: this.currentTime.hour,
                minutes: this.currentTime.minute,
                seconds: this.currentTime.second,
            };

            this.$records.update(updates);
        
            ++this.pushCounter;
        },
        //retrieve data from firebase then convert snapshot to Array
        retrieveDataToArray: function() {
            return this.retrieveData().then(items => {
                console.log(new Date());
                console.log(items);
                this.rankingData = items;
                Promise.resolve();
            });
        },
        //retrieveData from Firebase
        retrieveData: function() {
            var query = this.$records.orderByChild('totalSeconds').once("value");
            return query.then(snapshot => {
                const arr = [];
                snapshot.forEach(itemSnapshot => {
                    const obj = Object.assign({}, itemSnapshot.val(), { $key: itemSnapshot.key });
                    arr.push(obj);
                });
                return Promise.resolve(arr);
            })
        },
        //get player's current ranking
        getRanking: function() {
            var counter = 0;
            var arr = this.rankingData;
            const index = this.rankingData.findIndex(item => item.$key === this._key);
            this.ranking = index >= 0 ? index + 1 : this.rankingData.length;
            this.retrieveCount();
        },
        // get deck of cards
        shuffleCards: function () {
            var ids = ['a', 'b', 'c', 'd', 'e', 'f'];
            var cards = _.concat([], ids, ids);
            var imgBaseUrl = 'assets/images/minion/%img.jpg';
            var list = _.map(cards, function (card, key) {
                return {
                    id: key,
                    coverImg: imgBaseUrl.replace('%img', 'cover'),
                    img: imgBaseUrl.replace('%img', 'card-' + card),
                    isCompleted: false,
                    isFlipped: false
                };
            })

            return _.shuffle(list);
        },
        // flip the card
        flipCard: function (card) {
            // cannot flip card under these condition
            if (this.isReachMaxFlippedCard) return;
            if (card.isCompleted) return;
            if (card.isFlipped) return;

            // if it's first time flip card, game started
            if (!this.timer) {
                this.startGame();
            }

            // flip the card
            card.isFlipped = true;

            //add step count
            ++this.totalSteps;

            // end here if not hit max
            if (!this.isReachMaxFlippedCard) return;

            // get list of flipped card images
            var images = _.map(this.flippedCards, 'img');

            if (this.isMatch(images)) {
                this.completeCards(this.flippedCards);

                if (this.isGameCompleted) {
                    this.timer = clearInterval(this.timer);
                }
            }

            // close all cards after 400 miliseconds
            setTimeout(function () {
                // reset all card to no flipped
                this.cards.forEach(function (card) {
                    card.isFlipped = false;
                })
            }.bind(this), 400);
        },
        // check if cards match
        isMatch: function (images) {
            if (!(images && images[0])) return;

            var isMatched = _.every(images, function (image) {
                return image === images[0];
            });

            return isMatched;
        },
        // if cards match, set the card as complete
        completeCards: function (cards) {
            cards.forEach(function (card) {
                card.isFlipped = false;
                card.isCompleted = true;
            });
        },
        // shuffle the cards 
        reshuffle: function () {
            this.cards = this.shuffleCards();
        },
        resetGame: function () {
            this.setValue();

            this.cards = this.shuffleCards();
            this.totalSeconds = 0;
            this.timer = clearInterval(this.timer);
            this.currentTime = { hour: 0, minute: 0, second: 0 };
            this.totalSteps = 0;
            this.pushCounter = 0;
        },
        // when click reset, reset timer and shuffle cards
        newGame: function () {
            this.cards = this.shuffleCards();
            this.totalSeconds = 0;
            this.timer = clearInterval(this.timer);
            this.currentTime = { hour: 0, minute: 0, second: 0 };
            this.totalSteps = 0;
            this.pushCounter = 0;
            this.playerName = '';
        },
        // when click on any card first time, start the game timer 
        startGame: function () {
            this.totalSeconds = 0;
            this.timer = setInterval(this.updateTime, 1000);
            this.totalSteps = 0;
            this.pushCounter = 0;
        },
        // update the time every second
        updateTime: function () {
            ++this.totalSeconds;

            var oneSecond = 1;
            var secondsInMinute = oneSecond * 60;
            var secondsInHour = 60 * secondsInMinute;

            var minutesInHour = 60;

            // 3800 seconds equal to how many hour: minute: seconds?

            // hour = 3800 / (60 minutes * 60 seconds)
            //      = 3800 / secondsInHour , u need to round down, so
            //      = round down(3800 / secondsInHour)
            //      = so it's 1 hour

            // minute = round down(3800 / 60 seconds) - (hour * 60 minutes)
            //        = round down(3800 / secondsInMinute) - (hour * minutesInHour)
            //        = so it's 3 minutes

            // second = 3800 - total hours - total minutes
            //        = 3800 - (hour * 60 minutes * 60 seconds) - (minute * 60 seconds)
            //        = 3800 - (hour * secondsInHour) - (minute * secondsInMinute)
            //        = 20 minutes

            var hours = Math.floor(this.totalSeconds / secondsInHour);
            var minutes = Math.floor(this.totalSeconds / secondsInMinute) - (hours * minutesInHour);
            var seconds = this.totalSeconds - (hours * secondsInHour + minutes * secondsInMinute);

            this.currentTime = { hour: hours, minute: minutes, second: seconds };
        }
    }
})