# DrawBetter
Multiplayer Drawing Game with AI Scoring

**DrawBetter** is a multiplayer drawing game developed in F#. Two players are paired together and given the same drawing task (e.g. “cat”, “car”, etc.). After drawing, the drawings are evaluated by the **Google Vision API**, which determines the winner based on recognition reliability.

The process of the game:

1. Both players load the same URL in their browser.
2. They match their room ID in the top right corner of the game to make sure they are in the same room.
3. The first one to load it will be the game master who will specify what the word to draw should be and how long it should take.
4. The second player will be the one to fill in the URL after the first player.
5. The second player will wait until the first player starts the game.
6. The game will continue until the players submit their drawings before time or until time runs out.
7. At the end of the game, players can look at each other's drawings and how the Google Vision API has tagged them.
8. The winner will be drawn based on the recognisability of the drawing and the number of tags found.

The game explicitly prohibits written text on the canvas. Any player who attempts to write part or all of a word in the canvas will be disqualified at the end of the game.

The game supports parallel play. This means that there are as many virtual rooms as there are pairs of players. A new room opens every third time the web page is loaded.

The game uses a server-client model:
- The **server** manages game logic, player pairing, and scoring.
- The **clients** provide a drawing interface and communicate with the server.

## Try-Live Link: 

https://ij45ha.opipc.hu/

---

## Screenshot

![Screenshot](/Screenshots/DrawBetter02.png)

---

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/8.0)
- A valid Google Vision API key
	- The api key should be in the file `api_key.txt`.


### Command Line Usage

Navigate to the folder where the compiled `DrawBetter.exe` is located and run:

```bash
./DrawBetter.exe --urls=https://IP:PORT/
```

**Default port** is `5001`.  
Example (local test):
```bash
./DrawBetter.exe --urls=https://localhost:5001/
```

## Build Instructions

To build the project manually:

```bash
dotnet build
```

To store the images created (for debugging purposes), the program automatically creates a `saved-images` directory the first time it is run.

---

## License

This project is open source and licensed under the MIT License.
