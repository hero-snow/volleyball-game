import { Ball } from './Ball';
import { Player } from './Player';
import { ScoreBoard } from './ScoreBoard';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { Physics } from './Physics';
import { AI } from './AI';
import { SoundManager } from './SoundManager';
import {
  GamePhase,
  Difficulty,
  getFormation6,
  POINT_PAUSE_FRAMES,
  COURT_FLOOR_Y,
  NET_X,
  TeamSide
} from './constants';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private renderer: Renderer;
  private inputManager: InputManager;
  private soundManager: SoundManager;
  private scoreBoard: ScoreBoard;

  private phase: GamePhase = 'title';
  private difficulty: Difficulty = 'normal';

  private players: Player[] = [];
  private opponents: Player[] = [];
  private controlledPlayerId: number = 0;

  private ball: Ball;
  private pauseTimer: number = 0;
  private announcementText: string = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Canvas resolution setup (Fixed 960x540 internal)
    this.canvas.width = 960;
    this.canvas.height = 540;

    this.renderer = new Renderer(this.ctx);
    this.inputManager = new InputManager(this.canvas);
    this.soundManager = new SoundManager();
    this.scoreBoard = new ScoreBoard();
    this.ball = new Ball();

    this.initTeams();
  }

  private initTeams(): void {
    this.players = [];
    this.opponents = [];

    const leftPositions = getFormation6('left', this.scoreBoard.leftRotation);
    const rightPositions = getFormation6('right', this.scoreBoard.rightRotation);

    for (let i = 0; i < 6; i++) {
      const pLeft = new Player(i, 'left', i + 1, leftPositions[i]);
      this.players.push(pLeft);

      const pRight = new Player(i + 6, 'right', i + 1, rightPositions[i]);
      this.opponents.push(pRight);
    }

    this.controlledPlayerId = this.players[0].id;
    this.updateControlledPlayer();
  }

  public start(): void {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      this.update();
      this.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private update(): void {
    switch (this.phase) {
      case 'title':
        if (this.inputManager.isActionJustPressed()) {
          this.soundManager.playClick();
          this.phase = 'select';
        }
        break;

      case 'select':
        if (this.inputManager.isJumpPressed()) {
          // Toggle difficulty
          this.soundManager.playClick();
          if (this.difficulty === 'easy') this.difficulty = 'normal';
          else if (this.difficulty === 'normal') this.difficulty = 'hard';
          else this.difficulty = 'easy';
        }
        if (this.inputManager.isActionJustPressed()) {
          this.soundManager.playClick();
          this.startMatch();
        }
        break;

      case 'ready':
        this.pauseTimer--;
        if (this.pauseTimer <= 0) {
          this.phase = 'serve';
          this.prepareServe();
        }
        break;

      case 'serve':
        this.updateServePhase();
        break;

      case 'play':
        this.updatePlayPhase();
        break;

      case 'point':
        this.pauseTimer--;
        if (this.pauseTimer <= 0) {
          this.resetRallyPositions();
          this.phase = 'serve';
          this.prepareServe();
        }
        break;

      case 'gameOver':
        if (this.inputManager.isActionJustPressed()) {
          this.soundManager.playClick();
          this.phase = 'title';
        }
        break;
    }

    // Clear just pressed events at end of frame
    this.inputManager.endFrame();
  }

  private startMatch(): void {
    this.scoreBoard.resetMatch();
    this.resetRallyPositions();
    this.soundManager.playWhistle();
    this.announcementText = 'MATCH START!';
    this.pauseTimer = 90;
    this.phase = 'ready';
  }

  private resetRallyPositions(): void {
    const leftPositions = getFormation6('left', this.scoreBoard.leftRotation);
    const rightPositions = getFormation6('right', this.scoreBoard.rightRotation);

    for (let i = 0; i < 6; i++) {
      this.players[i].reset(leftPositions[i]);
      this.opponents[i].reset(rightPositions[i]);
    }

    this.ball.reset(200, 200);
    this.updateControlledPlayer();
  }

  private prepareServe(): void {
    const isLeftServing = this.scoreBoard.stats.servingSide === 'left';
    this.announcementText = isLeftServing ? 'YOUR SERVICE' : 'AI SERVICE';

    if (isLeftServing) {
      // Server is position 1 (Back right server)
      const server = this.players[0];
      server.pos.x = 110;
      server.pos.y = COURT_FLOOR_Y;
      this.controlledPlayerId = server.id;
      this.updateControlledPlayer();
      this.ball.reset(server.pos.x + 10, server.pos.y - 30);
    } else {
      const server = this.opponents[0];
      server.pos.x = 850;
      server.pos.y = COURT_FLOOR_Y;
      this.ball.reset(server.pos.x - 10, server.pos.y - 30);
    }
  }

  private updateServePhase(): void {
    const isLeftServing = this.scoreBoard.stats.servingSide === 'left';

    if (isLeftServing) {
      const server = this.players.find((p) => p.id === this.controlledPlayerId)!;
      // Ball follows server
      this.ball.pos.x = server.pos.x + 12;
      this.ball.pos.y = server.pos.y - 28;

      if (this.inputManager.isActionJustPressed()) {
        this.soundManager.playServe();
        Physics.executeHit(server, this.ball, 'serve');
        this.scoreBoard.stats.lastTouchTeam = 'left';
        this.scoreBoard.stats.touchCount = 1;
        this.phase = 'play';
        this.announcementText = '';
      }
    } else {
      // AI serves after short pause
      if (!this.pauseTimer) this.pauseTimer = 40;
      this.pauseTimer--;
      if (this.pauseTimer <= 0) {
        const server = this.opponents[0];
        this.soundManager.playServe();
        Physics.executeHit(server, this.ball, 'serve');
        this.scoreBoard.stats.lastTouchTeam = 'right';
        this.scoreBoard.stats.touchCount = 1;
        this.phase = 'play';
        this.announcementText = '';
      }
    }
  }

  private updatePlayPhase(): void {
    // 1. Update Controlled Player
    this.autoSwitchControlledPlayer();

    const activePlayer = this.players.find((p) => p.id === this.controlledPlayerId)!;
    const moveX = this.inputManager.getMoveX();
    activePlayer.move(moveX);

    if (this.inputManager.isJumpPressed()) {
      activePlayer.jump();
    }

    // Action button check
    if (this.inputManager.isActionJustPressed()) {
      if (Physics.checkPlayerBallHit(activePlayer, this.ball)) {
        this.handlePlayerBallTouch(activePlayer);
      }
    }

    activePlayer.update();

    // 2. Teammates AI & Opponents AI
    AI.updateTeammates(this.players, this.controlledPlayerId, this.ball, this.scoreBoard.stats.touchCount);
    AI.updateOpponents(this.opponents, this.ball, this.scoreBoard.stats.touchCount, this.difficulty);

    // 3. Update Ball Physics
    this.ball.update();

    // 4. Check Ball Landing / Point Scoring
    const landing = Physics.checkBallLanding(this.ball);
    if (landing.landed) {
      this.handleBallLanded(landing.side, landing.isInBounds);
    }
  }

  private handlePlayerBallTouch(player: Player): void {
    if (this.scoreBoard.stats.lastTouchTeam === 'left') {
      this.scoreBoard.stats.touchCount++;
    } else {
      this.scoreBoard.stats.lastTouchTeam = 'left';
      this.scoreBoard.stats.touchCount = 1;
    }

    if (this.scoreBoard.stats.touchCount === 1) {
      this.soundManager.playReceive();
      Physics.executeHit(player, this.ball, 'receive');
    } else if (this.scoreBoard.stats.touchCount === 2) {
      this.soundManager.playToss();
      Physics.executeHit(player, this.ball, 'toss');
    } else {
      this.soundManager.playSpike();
      Physics.executeHit(player, this.ball, 'spike');
    }

    if (this.scoreBoard.stats.touchCount > 3) {
      // 4 touches foul
      this.handlePointScored('right', '4 TOUCHES FOUL!');
    }
  }

  private handleBallLanded(landingSide: TeamSide | null, isInBounds: boolean): void {
    let winningSide: TeamSide;
    let reasonText = '';

    if (isInBounds) {
      // Landed inside court -> Point for opposite side of where ball landed
      winningSide = landingSide === 'left' ? 'right' : 'left';
      reasonText = winningSide === 'left' ? 'POINT FOR JAPAN!' : 'POINT FOR USA!';
    } else {
      // Landed out of bounds -> Point for opposite side of last team that touched it
      winningSide = this.scoreBoard.stats.lastTouchTeam === 'left' ? 'right' : 'left';
      reasonText = 'OUT OF BOUNDS!';
    }

    this.handlePointScored(winningSide, reasonText);
  }

  private handlePointScored(winningSide: TeamSide, text: string): void {
    this.soundManager.playWhistle();
    this.soundManager.playPoint();

    const result = this.scoreBoard.addPoint(winningSide);
    this.announcementText = text;
    this.pauseTimer = POINT_PAUSE_FRAMES;

    if (result.isGameOver) {
      this.announcementText = result.winner === 'left' ? 'VICTORY! YOU WIN!' : 'GAME OVER!';
      this.phase = 'gameOver';
    } else {
      this.phase = 'point';
    }
  }

  private autoSwitchControlledPlayer(): void {
    // Select player on left side closest to ball
    if (this.ball.pos.x < NET_X + 40) {
      let closestId = this.controlledPlayerId;
      let minDist = Infinity;

      this.players.forEach((p) => {
        const d = Math.hypot(p.pos.x - this.ball.pos.x, p.pos.y - this.ball.pos.y);
        if (d < minDist) {
          minDist = d;
          closestId = p.id;
        }
      });

      this.controlledPlayerId = closestId;
      this.updateControlledPlayer();
    }
  }

  private updateControlledPlayer(): void {
    this.players.forEach((p) => {
      p.isControlled = (p.id === this.controlledPlayerId);
    });
  }

  private getActionContextLabel(): string {
    if (this.phase === 'serve') return 'SERVE';
    if (this.phase === 'play') {
      const tc = this.scoreBoard.stats.touchCount;
      if (this.scoreBoard.stats.lastTouchTeam === 'left') {
        if (tc === 1) return 'TOSS';
        if (tc === 2) return 'SPIKE';
      }
      return 'RECEIVE';
    }
    return '';
  }

  private render(): void {
    this.renderer.render(
      this.phase,
      this.players,
      this.opponents,
      this.ball,
      this.scoreBoard,
      this.inputManager,
      this.getActionContextLabel(),
      this.announcementText,
      this.difficulty
    );
  }
}
