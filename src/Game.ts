import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FLOOR_Y,
  GameState,
  MAX_TOUCHES,
  COURT_LEFT,
  COURT_RIGHT,
  NET_X,
  PlayerState,
  Team,
  projectCourtPosition
} from './constants';
import { Player } from './Player';
import { Ball } from './Ball';
import { Court } from './Court';
import { Physics } from './Physics';
import { AIController, AIDifficulty } from './AI';
import { SoundManager } from './SoundManager';
import { ScoreBoard } from './ScoreBoard';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private court: Court;
  private ball: Ball;
  private playerTeam: Player[] = [];
  private cpuTeam: Player[] = [];
  private controlledPlayer: Player;

  private ai: AIController;
  private sound: SoundManager;
  private scoreBoard: ScoreBoard;
  private renderer: Renderer;
  private input: InputManager;

  public state: GameState = GameState.TITLE;
  public stateTimer: number = 0;
  private difficultyIndex: number = 1;
  private readonly difficulties: AIDifficulty[] = ['EASY', 'NORMAL', 'HARD'];

  private serverPlayer: Player | null = null;
  private serveTossTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D Context could not be initialized');
    }
    this.ctx = context;

    this.court = new Court();
    this.ball = new Ball();
    this.sound = new SoundManager();
    this.scoreBoard = new ScoreBoard();
    this.renderer = new Renderer(this.ctx);
    this.input = new InputManager(this.canvas);
    this.ai = new AIController('NORMAL');

    this.initTeams();
    this.controlledPlayer = this.playerTeam[0];
  }

  private initTeams(): void {
    this.playerTeam = [
      new Player(0, Team.PLAYER, 90, 'server', 0.5),
      new Player(1, Team.PLAYER, 195, 'spiker', 0.18),
      new Player(2, Team.PLAYER, 175, 'setter', 0.5),
      new Player(3, Team.PLAYER, 195, 'spiker', 0.82),
      new Player(4, Team.PLAYER, 90, 'receiver', 0.18),
      new Player(5, Team.PLAYER, 90, 'receiver', 0.82)
    ];

    this.cpuTeam = [
      new Player(0, Team.CPU, 390, 'server', 0.5),
      new Player(1, Team.CPU, 285, 'spiker', 0.18),
      new Player(2, Team.CPU, 305, 'setter', 0.5),
      new Player(3, Team.CPU, 285, 'spiker', 0.82),
      new Player(4, Team.CPU, 390, 'receiver', 0.18),
      new Player(5, Team.CPU, 390, 'receiver', 0.82)
    ];
  }

  public start(): void {
    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(): void {
    this.input.update();

    switch (this.state) {
      case GameState.TITLE:
        this.updateTitle();
        break;
      case GameState.SERVE_WAIT:
        this.updateServeWait();
        break;
      case GameState.SERVE_IN_AIR:
        this.updateServeInAir();
        break;
      case GameState.RALLY:
        this.updateRally();
        break;
      case GameState.BALL_DEAD:
        this.updateBallDead();
        break;
      case GameState.MATCH_END:
        this.updateMatchEnd();
        break;
    }

    this.court.update();
    this.scoreBoard.update();
  }

  private updateTitle(): void {
    if (this.input.state.left && !this.input.state.right) {
      this.difficultyIndex = (this.difficultyIndex + 2) % 3;
      this.input.state.left = false;
      this.sound.playBallHit('soft');
    } else if (this.input.state.right && !this.input.state.left) {
      this.difficultyIndex = (this.difficultyIndex + 1) % 3;
      this.input.state.right = false;
      this.sound.playBallHit('soft');
    }

    const currentDiff = this.difficulties[this.difficultyIndex];
    this.ai.difficulty = currentDiff;

    if (this.input.state.startPressed || this.input.state.actionPressed) {
      this.sound.init();
      this.sound.playWhistle(true);
      this.scoreBoard.reset();
      this.startServeSequence();
    }
  }

  private startServeSequence(): void {
    this.state = GameState.SERVE_WAIT;
    const isPlayer = this.scoreBoard.serveTeam === Team.PLAYER;

    const serverIndex = this.scoreBoard.serverIndex[this.scoreBoard.serveTeam];
    [...this.playerTeam, ...this.cpuTeam].forEach(p => {
      p.isControlled = false;
    });
    this.playerTeam.forEach((p, idx) => p.setServePosition(isPlayer && idx === serverIndex));
    this.cpuTeam.forEach((p, idx) => p.setServePosition(!isPlayer && idx === serverIndex));

    if (isPlayer) {
      this.serverPlayer = this.playerTeam[serverIndex];
      this.controlledPlayer = this.serverPlayer;
      this.controlledPlayer.isControlled = true;
      this.ball.reset(this.serverPlayer.x + 8, this.serverPlayer.y + 12, this.serverPlayer.depth);
      this.input.setActionLabel('TOSS');
    } else {
      this.serverPlayer = this.cpuTeam[serverIndex];
      this.controlledPlayer = this.playerTeam[3];
      this.controlledPlayer.isControlled = true;
      this.updateControlledPlayer();
      this.ball.reset(this.serverPlayer.x - 8, this.serverPlayer.y + 12, this.serverPlayer.depth);
      this.input.setActionLabel('RECEIVE');
    }

    this.stateTimer = isPlayer ? 0 : 100;
  }

  private updateServeWait(): void {
    if (this.stateTimer > 0) {
      this.stateTimer--;
      return;
    }

    const isPlayer = this.scoreBoard.serveTeam === Team.PLAYER;

    if (isPlayer) {
      if (this.input.state.actionPressed || this.input.state.jumpPressed) {
        this.sound.playBallHit('toss');
        this.serverPlayer!.state = PlayerState.SERVE_TOSS;
        this.ball.vx = 0.2;
        this.ball.vy = -5.0;
        this.ball.depthVelocity = this.input.state.up ? -0.004 : this.input.state.down ? 0.004 : 0;
        this.ball.inPlay = false;
        this.ball.isServed = true;
        this.serveTossTime = 0;
        this.state = GameState.SERVE_IN_AIR;
        this.input.setActionLabel('HIT');
      }
    } else {
      this.sound.playBallHit('toss');
      this.serverPlayer!.state = PlayerState.SERVE_TOSS;
      this.ball.vx = -0.2;
      this.ball.vy = -5.0;
      this.ball.depthVelocity = 0;
      this.ball.inPlay = false;
      this.ball.isServed = true;
      this.serveTossTime = 0;
      this.state = GameState.SERVE_IN_AIR;
    }
  }

  private updateServeInAir(): void {
    this.ball.update();
    this.serveTossTime++;

    const isPlayer = this.scoreBoard.serveTeam === Team.PLAYER;

    if (isPlayer) {
      if (this.input.state.jumpPressed && this.serverPlayer!.isGrounded) {
        this.serverPlayer!.jump();
        this.sound.playJump();
      }

      const hand = this.serverPlayer!.getHandPos();
      const dist = Math.hypot(this.ball.x - hand.x, this.ball.y - hand.y);

      if (this.serveTossTime >= 24 && this.ball.vy > 0 && this.input.state.action && dist < 44) {
        this.sound.playBallHit('spike');
        this.serverPlayer!.triggerSpike();

        const targetX = this.input.state.left
          ? NET_X + 60
          : this.input.state.right ? COURT_RIGHT - 30 : (NET_X + COURT_RIGHT) / 2;
        const targetDepth = this.input.state.up ? 0.2 : this.input.state.down ? 0.8 : 0.5;
        this.ball.hitServe(targetX, targetDepth, Team.PLAYER, this.serverPlayer!.id);
        this.ball.inPlay = true;
        this.state = GameState.RALLY;
        this.input.setActionLabel('ACTION');
      }

      if (this.ball.y + this.ball.radius >= FLOOR_Y - 2) {
        this.sound.playBallHit('bounce');
        this.handleRallyEnd(Team.CPU, 'SERVICE FAULT');
      }
    } else {
      if (this.ball.vy > 0.5 && this.serveTossTime > 30) {
        this.sound.playBallHit('spike');
        this.serverPlayer!.triggerSpike();

        const targetX = NET_X - 40 - Math.random() * (NET_X - COURT_LEFT - 80);
        const targetDepth = 0.2 + Math.random() * 0.6;
        this.ball.hitServe(targetX, targetDepth, Team.CPU, this.serverPlayer!.id);
        this.ball.inPlay = true;
        this.state = GameState.RALLY;
      }

      if (this.ball.y + this.ball.radius >= FLOOR_Y - 2) {
        this.sound.playBallHit('bounce');
        this.handleRallyEnd(Team.PLAYER, 'SERVICE FAULT');
      }
    }
  }

  private updateRally(): void {
    this.ball.update();
    Physics.checkNetCollision(this.ball);

    this.updateControlledPlayer();

    let moveDir = 0;
    if (this.input.state.left) moveDir -= 1;
    if (this.input.state.right) moveDir += 1;
    this.controlledPlayer.move(moveDir);
    const moveDepth = (this.input.state.down ? 1 : 0) - (this.input.state.up ? 1 : 0);
    this.controlledPlayer.moveDepth(moveDepth);

    if (this.input.state.jumpPressed && this.controlledPlayer.isGrounded) {
      if (this.controlledPlayer.jump()) {
        this.sound.playJump();
      }
    }

    this.handlePlayerAction();

    this.playerTeam.forEach(p => {
      if (p === this.controlledPlayer) {
        p.update();
      }
    });

    this.ai.updatePlayerAllies(this.playerTeam, this.controlledPlayer, this.ball, (ally, type) => {
      this.handlePlayerTeamHit(ally, type);
    });

    this.ai.updateCPU(
      this.cpuTeam,
      this.playerTeam,
      this.ball,
      () => {},
      (cpuPlayer, type) => {
        this.handleCpuHit(cpuPlayer, type);
      }
    );

    const netTouch = Physics.checkNetTouch([...this.playerTeam, ...this.cpuTeam]);
    if (netTouch.hasFoul) {
      const scoringTeam = netTouch.fouledTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
      this.handleRallyEnd(scoringTeam, 'NET TOUCH VIOLATION');
      return;
    }

    if (this.ball.touches[Team.PLAYER] > MAX_TOUCHES) {
      this.handleRallyEnd(Team.CPU, 'FOUR HITS FAULT');
      return;
    }
    if (this.ball.touches[Team.CPU] > MAX_TOUCHES) {
      this.handleRallyEnd(Team.PLAYER, 'FOUR HITS FAULT');
      return;
    }

    if (this.ball.y + this.ball.radius >= FLOOR_Y) {
      const result = Physics.evaluateLanding(this.ball);
      const reasonText = result.isInside ? 'BALL IN' : 'BALL OUT';
      this.handleRallyEnd(result.scoringTeam, reasonText);
      return;
    }

    this.updateContextButtonLabel();
  }

  private updateControlledPlayer(): void {
    if (this.ball.x > NET_X + 40) return;

    const touches = this.ball.touches[Team.PLAYER];
    const designatedRole = touches >= 1 ? 'setter' : null;
    if (designatedRole) {
      const designatedPlayers = this.playerTeam.filter(p => p.role === designatedRole);
      const designatedPlayer = designatedPlayers.reduce((closest, player) => {
        const playerDistance = Math.hypot(this.ball.x - player.x, (this.ball.depth - player.depth) * 48);
        const closestDistance = Math.hypot(this.ball.x - closest.x, (this.ball.depth - closest.depth) * 48);
        return playerDistance < closestDistance ? player : closest;
      });
      if (designatedPlayer !== this.controlledPlayer) {
        this.controlledPlayer.isControlled = false;
        this.controlledPlayer = designatedPlayer;
        this.controlledPlayer.isControlled = true;
      }
      return;
    }

    let bestPlayer = this.controlledPlayer;
    let minDist = Math.hypot(this.ball.x - this.controlledPlayer.x, this.ball.y - this.controlledPlayer.y, (this.ball.depth - this.controlledPlayer.depth) * 48);

    for (const p of this.playerTeam) {
      const d = Math.hypot(this.ball.x - p.x, this.ball.y - p.y, (this.ball.depth - p.depth) * 48);
      if (d < minDist - 15) {
        minDist = d;
        bestPlayer = p;
      }
    }

    if (bestPlayer !== this.controlledPlayer) {
      this.controlledPlayer.isControlled = false;
      this.controlledPlayer = bestPlayer;
      this.controlledPlayer.isControlled = true;
    }
  }

  private updateContextButtonLabel(): void {
    const p = this.controlledPlayer;
    const touches = this.ball.touches[Team.PLAYER];

    if (!p.isGrounded) {
      if (p.x >= NET_X - 40 && this.ball.x >= NET_X - 10) {
        this.input.setActionLabel('BLOCK');
      } else {
        this.input.setActionLabel('SPIKE');
      }
    } else {
      if (touches === 0) {
        this.input.setActionLabel('RECEIVE');
      } else if (touches === 1) {
        this.input.setActionLabel('TOSS');
      } else {
        this.input.setActionLabel('HIT');
      }
    }
  }

  private handlePlayerAction(): void {
    const p = this.controlledPlayer;
    const isReceiveAttempt = this.ball.touches[Team.PLAYER] === 0 && p.isGrounded && this.input.state.action;
    const isAttackAttempt = this.ball.touches[Team.PLAYER] >= 2 && !p.isGrounded && this.input.state.action;
    if (!this.input.state.actionPressed && !isReceiveAttempt && !isAttackAttempt) return;

    if (isReceiveAttempt && p.state !== PlayerState.RECEIVE) {
      p.triggerReceive();
    }
    const hitResult = Physics.checkPlayerBallHit(this.ball, p);

    if (hitResult) {
      this.handlePlayerTeamHit(p, hitResult.type);
    } else {
      if (!p.isGrounded) {
        p.triggerSpike();
      } else {
        if (this.ball.touches[Team.PLAYER] === 0) {
          p.triggerReceive();
        } else {
          p.triggerToss();
        }
      }
    }
  }

  private handlePlayerTeamHit(player: Player, type: 'serve' | 'receive' | 'toss' | 'spike' | 'block' | 'touch'): void {
    const touches = this.ball.touches[Team.PLAYER];

    if (!player.isGrounded || type === 'spike' || type === 'block') {
      if (player.x >= NET_X - 35 && this.ball.x >= NET_X - 15) {
        this.sound.playBallHit('block');
        player.triggerBlock();
        this.ball.hitBlock(Team.CPU, player.id);
        this.scoreBoard.setMessage('NICE BLOCK!!', '', 40);
        return;
      }

      this.sound.playBallHit('spike');
      player.triggerSpike();

      let spikeVx = 5.2;
      let spikeVy = -1.4;

      if (this.input.state.right) {
        spikeVx = 6.2;
        spikeVy = -1.0;
      } else if (this.input.state.down) {
        spikeVx = 4.2;
        spikeVy = -1.5;
      } else if (this.input.state.up) {
        spikeVx = 3.2;
        spikeVy = -2.2;
      }

      const depthVelocity = this.input.state.up ? -0.012 : this.input.state.down ? 0.012 : 0;
      this.ball.hitSpike(spikeVx, spikeVy, Team.PLAYER, player.id, depthVelocity);
      this.scoreBoard.setMessage('SUPER SPIKE!!', '', 40);
      return;
    }

    if (touches === 0 || type === 'receive') {
      this.sound.playBallHit('soft');
      player.triggerReceive();
      const setter = this.playerTeam.find(pl => pl.role === 'setter') || this.playerTeam[2];
      const targetX = setter.x + 35;
      this.ball.hitReceive(targetX, FLOOR_Y - 150, Team.PLAYER, player.id, setter.depth);
      return;
    }

    if (touches === 1 || type === 'toss') {
      this.sound.playBallHit('toss');
      player.triggerToss();

      const spiker = this.playerTeam.find(pl => pl.role === 'spiker') || this.playerTeam[1];
      let targetX = spiker.x + spiker.width / 2;
      if (this.input.state.left) targetX -= 35;
      if (this.input.state.right) targetX += 25;

      const targetDepth = Math.max(0.08, Math.min(0.92, spiker.depth + (this.input.state.down ? 0.18 : this.input.state.up ? -0.18 : 0)));
      this.ball.hitToss(targetX, 110, Team.PLAYER, player.id, targetDepth);
      return;
    }

    this.sound.playBallHit('soft');
    player.triggerReceive();
    const vx = 4.0 + Math.random() * 1.5;
    const vy = -4.5;
    this.ball.hitSpike(vx, vy, Team.PLAYER, player.id, (0.5 - this.ball.depth) * 0.012);
  }

  private handleCpuHit(cpuPlayer: Player, type: 'receive' | 'toss' | 'spike' | 'block'): void {
    const touches = this.ball.touches[Team.CPU];

    if (type === 'block') {
      this.sound.playBallHit('block');
      cpuPlayer.triggerBlock();
      this.ball.hitBlock(Team.PLAYER, cpuPlayer.id);
      return;
    }

    if (touches >= 2) {
      this.sound.playBallHit('spike');
      cpuPlayer.triggerSpike();

      const baseSpeed = this.ai.difficulty === 'HARD' ? 5.8 : (this.ai.difficulty === 'NORMAL' ? 5.0 : 4.2);
      const spikeVx = -baseSpeed - Math.random() * 0.8;
      const spikeVy = -1.4 - Math.random() * 0.4;

      this.ball.hitSpike(spikeVx, spikeVy, Team.CPU, cpuPlayer.id, (0.5 - this.ball.depth) * 0.012);
      return;
    }

    if (touches === 0) {
      this.sound.playBallHit('soft');
      cpuPlayer.triggerReceive();
      const setter = this.cpuTeam.find(p => p.role === 'setter') || this.cpuTeam[2];
      this.ball.hitReceive(setter.x - 35, FLOOR_Y - 150, Team.CPU, cpuPlayer.id, setter.depth);
      return;
    }

    if (touches === 1) {
      this.sound.playBallHit('toss');
      cpuPlayer.triggerToss();
      const spiker = this.cpuTeam.find(p => p.role === 'spiker') || this.cpuTeam[3];
      this.ball.hitToss(spiker.x, 110, Team.CPU, cpuPlayer.id, spiker.depth);
      return;
    }

    this.sound.playBallHit('soft');
    this.ball.hitSpike(-4.0, -4.2, Team.CPU, cpuPlayer.id);
  }

  private handleRallyEnd(winningTeam: Team, reasonText: string): void {
    this.state = GameState.BALL_DEAD;
    this.stateTimer = 90;

    this.sound.playWhistle(false);

    const outcome = this.scoreBoard.handleRallyEnd(winningTeam, reasonText);

    const isPlayerWin = winningTeam === Team.PLAYER;
    this.sound.playScore(isPlayerWin);

    if (isPlayerWin) {
      this.playerTeam.forEach(p => p.setCelebrate());
      this.cpuTeam.forEach(p => p.setDisappointed());
    } else {
      this.cpuTeam.forEach(p => p.setCelebrate());
      this.playerTeam.forEach(p => p.setDisappointed());
    }

    if (outcome.gameEnded) {
      this.state = GameState.MATCH_END;
      this.stateTimer = 180;
    }
  }

  private updateBallDead(): void {
    this.ball.update();
    this.playerTeam.forEach(p => p.update());
    this.cpuTeam.forEach(p => p.update());

    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer === 0) {
        this.startServeSequence();
      }
    }
  }

  private updateMatchEnd(): void {
    if (this.stateTimer > 0) {
      this.stateTimer--;
    } else {
      if (this.input.state.startPressed || this.input.state.actionPressed) {
        this.state = GameState.TITLE;
      }
    }
  }

  private render(): void {
    this.renderer.clear();

    if (this.state === GameState.TITLE) {
      this.renderer.drawTitleScreen(this.ai.difficulty, this.sound.getMuted());
      return;
    }

    const landingX = this.ball.inPlay ? Physics.predictLandingX(this.ball) : null;
    const landingDepth = landingX === null ? 0.5 : Physics.predictLandingDepth(this.ball);
    this.court.draw(this.ctx, landingX, landingDepth);

    [...this.playerTeam, ...this.cpuTeam]
      .sort((a, b) => projectCourtPosition(a.x, a.depth).y - projectCourtPosition(b.x, b.depth).y)
      .forEach(p => this.renderer.drawPlayer(p));

    this.renderer.drawBall(this.ball);

    this.scoreBoard.draw(this.ctx, this.ball.touches);
    this.renderer.drawRallyHint(this.ball.touches[Team.PLAYER], !this.controlledPlayer.isGrounded);

    if (this.state === GameState.SERVE_WAIT || this.state === GameState.SERVE_IN_AIR) {
      this.renderer.drawServeGuide(this.scoreBoard.serveTeam === Team.PLAYER, this.state === GameState.SERVE_IN_AIR);
    }

    if (this.state === GameState.MATCH_END && this.scoreBoard.winner) {
      this.renderer.drawGameOver(this.scoreBoard.winner);
    }

    this.input.drawTouchControls(this.ctx);
  }
}