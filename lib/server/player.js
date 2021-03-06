/* eslint-env node */

const uuidV4 = require('uuid/v4');

const Game = require('./game');
const gameModeFactory = require('./gamemode');
const errorCodes = require('./error-codes');


class Player {
  constructor(server, socket) {
    this.id = uuidV4();
    this.server = server;
    this.socket = socket;
    this.game = null;
    this.installEventListeners();
  }

  installEventListeners() {
    this.socket.on('disconnect', () => {
      this.server.removePlayer(this.id);
    });

    this.socket.on('terminate', () => {
      this.server.removePlayer(this.id);
    });

    this.socket.on('game list', () => {
      this.socket.emit('game list', { games: this.server.getGames() });
    });

    this.socket.on('game create', (data) => {
      this.metadata = data.metadata;
      this.createGame(data.mode);
    });

    this.socket.on('game join', (data) => {
      this.metadata = data.metadata;
      this.joinGame(data.id);
    });

    this.socket.on('game spectate', (data) => {
      this.spectateGame(data.id);
    });

    this.socket.on('game event', (data) => {
      if (this.game) {
        this.game.addEvent(data, this);
      }
    });
  }

  createGame(gameModeName) {
    let gameMode;

    try {
      gameMode = gameModeFactory(gameModeName);
    }
    catch (err) {
      this.socket.emit('client error', { message: err.message });
      return;
    }

    // Players shouldn't be able to create more games if they have already been
    // joined to another one.
    if (this.game) {
      this.socket.emit('client error', { message: 'Already joined in a game', code: errorCodes.MULTIPLE_GAMES });
      return;
    }

    this.game = new Game(this.server, gameMode);
    this.game.addPlayer(this);
    this.server.games[this.game.id] = this.game;
    process.stdout.write(`Game ${this.game.id} created\n`);
  }

  joinGame(id) {
    const game = this.server.games[id];

    // First see if the game exists at all.
    if (!game) {
      this.socket.emit('client error', { message: 'Unrecognized game', code: errorCodes.GAME_NOT_FOUND });
      return;
    }

    // Then test whether there is still room for more players.
    if (game.playerCount >= game.maximumPlayerCount) {
      this.socket.emit('client error', { message: 'Maximum number of players reached', code: errorCodes.MAX_PLAYERS_REACHED });
      return;
    }

    // Player's should be able to join only one game.
    if (this.game) {
      this.socket.emit('client error', { message: 'Already joined in a game', code: errorCodes.MULTIPLE_GAMES });
      return;
    }

    this.game = game;
    this.game.addPlayer(this);
  }

  spectateGame(id) {
    const game = this.server.games[id];

    // First see if the game exists at all.
    if (!game) {
      this.socket.emit('client error', { message: 'Unrecognized game' });
      return;
    }

    // Player's should be able to join or spectate only one game.
    if (this.game) {
      this.socket.emit('client error', { message: 'Already joined in a game' });
      return;
    }

    this.game = game;
    this.game.addSpectator(this);
  }
}

module.exports = Player;
