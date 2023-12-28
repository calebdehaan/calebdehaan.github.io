var _cardDB           = {};
var _userInputElem    = $('#UserInput');
var _cardListElem     = $('#Cards');
var _jnetWarningElem  = $('#JnetWarning');
var _cardListHtml     = '';

// loadCards() load cardDB from local storage
function loadCards() {
    //_cardDB = localStorage.getItem('cards');
    //_cardDB = JSON.parse(_cardDB);
    _cardDB = false;

    if (!_cardDB) {
        fetchAllCards();
    } else {
        buildList();
    }
}

// saveCards() save cardDB in local storage
function saveCards() {
    localStorage.setItem('cards', JSON.stringify(_cardDB));
}

// reset alias
function reset() {
    return fetchAllCards();
}

// fetchAllCards() get cards from api
function fetchAllCards() {
    localStorage.removeItem('cards');
    _cardListElem.html('<span class="text-muted" data-loading>loading cards ...</span>');

    $.getJSON("https://netrunnerdb.com/api/2.0/public/cards", function(response) {
        _cardDB = {};

        $.each(response.data, function(key, item) {
            var image = 'https://card-images.netrunnerdb.com/v1/large/' + item.code + '.jpg';

            // console.log(item);

            if (typeof item.image_url != "undefined") {
                image = item.image_url;
            }

            /* TODO allow alt art for reprinted cards */

            _cardDB[item.title.toLowerCase().replace(/:/g, '').replace(/\s/g, '__')] = {
                code: item.code,
                image: image
            };
        });

        console.log('cards fetched from api');
        saveCards();
        buildList();
    });
    console.log(_cardDB);
}

// buildList() generate image list
function buildList() {
    var html = '';
    var input = _userInputElem.val().toLowerCase().split(/\n/);
    var unfound = 0;
    var cardNames = [];
    var inputType = document.querySelector('input[name="input"]:checked').value;
	if (inputType == 'jnet') {
		_jnetWarningElem.html('<b>REMINDER TO ADD THE ID -- JNET FORMAT DOESN\'T ADD THE ID</b>');
	} else {
		_jnetWarningElem.html('');
	}

    var skipLines = [
        /^(event|hardware|resource|icebreaker|program|sentry|code gate|barrier|upgrade|operation|asset|agenda) \(\d+\)$/, // Skip lines like 'Event (14)', 'Hardware (10)', etc.
        /^\d+ influence spent.*$/, // Skip line with influence spent
		/^\d+ agenda points.*$/, // Skip line with agenda points
        /^\d+ cards \(min \d+\)$/, // Skip line with card count
        /^cards up to.*$/, // Skip 'Cards up to' line
		/^decklist published on.*$/, // Skip 'Decklist published on netrunnerdb' line
		/^deck built on.*$/ // Skip 'Deck built on netrunnerdb' line
    ];

    if (!_cardDB) {
        return false;
    }

    // Check if the input matches the deck list format checking if it matches a given regex
    var deckListFormat = input.some(function(line) {
        return line.match(/\d{2} cards \(min \d{2}\)/);
    });

    // If the deck list format is detected, extract card names
    if (inputType == 'txt') {
        // Exclude the first line of input
        input = input.slice(1);
        for (var i = 0; i < input.length; i++) {
            var line = input[i].trim();
            var skipLine = false;

            // Check if the line matches any of the skip patterns
            for (var j = 0; j < skipLines.length; j++) {
                if (input[i].trim().toLowerCase().match(skipLines[j])) {
					console.log('hehe');
                    skipLine = true;
                    break;
                }
            }

            if (!skipLine) {
				var match = line.match(/(\d+x?\s)?([^(\n]+)(?:\s*\(.+\))?/);
				if (match) {
					var cardName = match[2].replace(/\●/g,'').trim();

					// Push the card name to the array as many times as specified (e.g., 3x card -> push 3 times)
					var count = match[1] != null ? match[1].charAt(0) : 1;
					for (var j = 0; j < count; j++) {
						cardNames.push(cardName);
					}
				}
			}
        }
    } else if (inputType == 'jnet') {
        for (var i = 0; i < input.length; i++) {
			var inputLine = input[i].trim();
			var match = inputLine.match(/^(\d+)\s+(.+)/);
			if (match) {
				var count = parseInt(match[1]);
				var cardName = match[2];
				
				for(var j = 0; j < count; j++) {
					cardNames.push(cardName);
				}
			}
        }
    } else if (inputType == 'default'){ // If not in deck list format, use previous logic to handle individual card names
        for (var i = 0; i < input.length; i++) {
            var cardname = $.trim(input[i]).replace(/:/g, '').replace(new RegExp(' ', 'g'), '__');

            if (cardname == '') {
                continue;
            }

            if (cardname in _cardDB) {
                cardNames.push(input[i]); // Push individual card names to the cardNames array
            }
        }
    } else {
		console.log("try selecting a method idiot");
	}
    for (var k = 0; k < cardNames.length; k++) {
        var cardname = cardNames[k].toLowerCase().replace(/:/g, '').replace(/\s/g, '__');

        if (cardname in _cardDB) {
            var card = _cardDB[cardname];
            var newCard = '';

            newCard += '<a href="https://netrunnerdb.com/en/card/' + card.code + '" title="" target="NetrunnerCard">';
            newCard += '<img class="card" src="' + card.image + '" alt="' + card.code + '" />';
            newCard += '<span class="label print-hide">' + card.code + ' ' + cardNames[k] + '</span>';
            newCard += '</a>';

            // Append card HTML
            html += newCard;
        } else {
			console.log(cardname + ' not found');
            unfound++;
        }
    }

    if (unfound > 0) {
        html += '<p class="no-print text-muted">' + unfound + ' not found</p>';
    }

    if (_cardListHtml != html) {
        // Save current HTML
        _cardListHtml = html;
        // Show images HTML
        _cardListElem.html(_cardListHtml);
    }
}

// assignEvents() rebuild image list when textarea changes
function assignEvents() {
    $(document).on('input propertychange', _userInputElem, function() {
        buildList();
    });
}

assignEvents();
loadCards();
