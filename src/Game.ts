import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COURT_LEFT,
  COURT_RIGHT,
  FLOOR_Y,
  GameMode,
  GameState,
  MODERN_PALETTE,
  NET_X,
  PLAYER_ATTACK_X,
  CPU_ATTACK_X,
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

  // Game Settings
  public currentMode: GameMode = GameMode.QUICK;
  public difficultyIndex: number = 1;
  private readonly difficulties: AIDifficulty[] = ['CASUAL', 'PRO', 'MASTER'];
  public targetScores: number[] = [7, 11, 15];
  public targetScoreIndex: number = 1; // Default 11

  private serverPlayer: Player | null = null;
  private currentOpponentPalette = MODERN_PALETTE.TEAM_CPU;

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
    this.ai = new AIController('PRO');

    this.initTeams();
    this.controlledPlayer = this.playerTeam[0];
  }

  private initTeams(): void {
    // 4 Players per team on court for clean arcade flow:
    // 0: Server / Back Left Receiver
    // 1: Spiker (Left wing attacker)
    // 2: Setter (Center net orchestrator)
    // 3: Spiker / Blocker (Right wing attacker)
    this.playerTeam = [
      new Player(0, Team.PLAYER, 190, 'server', 0.65, 7),
      new Player(1, Team.PLAYER, 360, 'spiker', 0.32, 10),
      new Player(2, Team.PLAYER, 400, 'setter', 0.5, 2),
      new Player(3, Team.PLAYER, 350, 'spiker', 0.75, 4)
    ];

    this.cpuTeam = [
      new Player(0, Team.CPU, 770, 'server', 0.65, 1),
      new Player(1, Team.CPU, 600, 'spiker', 0.32, 9),
      new Player(2, Team.CPU, 560, 'setter', 0.5, 3),
      new Player(3, Team.CPU, 610, 'spiker', 0.75, 8)
    ];

    this.updateTournamentOpponent();
  }

  private updateTournamentOpponent(): void {
    if (this.currentMode === GameMode.TOURNAMENT) {
      const rival = MODERN_PALETTE.TOURNAMENT_TEAMS[this.scoreBoard.tournamentRound] || MODERN_PALETTE.TOURNAMENT_TEAMS[0];
      this.currentOpponentPalette = {
        name: rival.name,
        jerseyPrimary: rival.jerseyPrimary,
        jerseySecondary: rival.jerseySecondary,
        jerseyNumber: rival.jerseyNumber,
        shorts: rival.shorts,
        shoes: rival.shoes,
        skin: rival.skin,
        hair: rival.hair,
        glow: rival.glow
      };
      this.ai.difficulty = rival.difficulty;
    } else {
      this.currentOpponentPalette = MODERN_PALETTE.TEAM_CPU;
      this.ai.difficulty = this.difficulties[this.difficultyIndex];
    }
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
    this.renderer.update();

    // Check pause request during active play
    if (this.input.state.pausePressed) {
      if (this.state === GameState.PAUSED) {
        this.state = GameState.RALLY;
      } else if (this.state === GameState.RALLY || this.state === GameState.SERVE_WAIT || this.state === GameState.SERVE_IN_AIR) {
        this.state = GameState.PAUSED;
      }
    }

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
      case GameState.PAUSED:
        this.updatePaused();
        break;
    }

    this.court.update();
    this.scoreBoard.update();
  }

  // --- Title Screen Handler ---
  private updateTitle(): void {
    const click = this.input.consumeClick();

    if (click) {
      // 1. Mode Card Clicks
      const modes = [GameMode.QUICK, GameMode.TOURNAMENT, GameMode.PRACTICE];
      modes.forEach((m, idx) => {
        const cardY = 175 + idx * 56;
        if (click.x >= 50 && click.x <= 410 && click.y >= cardY && click.y <= cardY + 48) {
          this.currentMode = m;
          this.scoreBoard.gameMode = m;
          this.sound.playMenuClick();
        }
      });

      // 2. Difficulty Button Click
      if (click.x >= 50 && click.x <= 180 && click.y >= 372 && click.y <= 404) {
        this.difficultyIndex = (this.difficultyIndex + 1) % this.difficulties.length;
        this.ai.difficulty = this.difficulties[this.difficultyIndex];
        this.sound.playMenuClick();
      }

      // 3. Target Score Button Click
      if (click.x >= 200 && click.x <= 300 && click.y >= 372 && click.y <= 404) {
        this.targetScoreIndex = (this.targetScoreIndex + 1) % this.targetScores.length;
        this.scoreBoard.winScore = this.targetScores[this.targetScoreIndex];
        this.sound.playMenuClick();
      }

      // 4. Audio Toggle Click
      if (click.x >= 320 && click.x <= 410 && click.y >= 372 && click.y <= 404) {
        this.sound.toggleMute();
        this.sound.playMenuClick();
      }

      // 5. Start Match Button Click
      if (click.x >= 50 && click.x <= 410 && click.y >= 430 && click.y <= 482) {
        this.startMatch();
        return;
      }
    }

    // Keyboard controls for title
    if (this.input.state.left && !this.input.state.right) {
      this.difficultyIndex = (this.difficultyIndex + 2) % 3;
      this.ai.difficulty = this.difficulties[this.difficultyIndex];
      this.input.state.left = false;
      this.sound.playMenuClick();
    } else if (this.input.state.right && !this.input.state.left) {
      this.difficultyIndex = (this.difficultyIndex + 1) % 3;
      this.ai.difficulty = this.difficulties[this.difficultyIndex];
      this.input.state.right = false;
      this.sound.playMenuClick();
    }

    if (this.input.state.startPressed || this.input.state.actionPressed) {
      this.startMatch();
    }
  }

  private startMatch(): void {
    this.sound.init();
    this.sound.playWhistle(true);
    this.scoreBoard.winScore = this.targetScores[this.targetScoreIndex];
    this.scoreBoard.reset();
    this.updateTournamentOpponent();
    this.startServeSequence();
  }

  // --- Serve Sequence ---
  private startServeSequence(): void {
    this.state = GameState.SERVE_WAIT;
    const isPlayerServe = this.scoreBoard.serveTeam === Team.PLAYER;

    // Reset player positions
    [...this.playerTeam, ...this.cpuTeam].forEach(p => {
      p.isControlled = false;
    });

    const serverIndex = 0;
    this.playerTeam.forEach((p, idx) => p.setServePosition(isPlayerServe && idx === serverIndex));
    this.cpuTeam.forEach((p, idx) => p.setServePosition(!isPlayerServe && idx === serverIndex));

    if (isPlayerServe) {
      this.serverPlayer = this.playerTeam[0];
      this.controlledPlayer = this.serverPlayer;
      this.controlledPlayer.isControlled = true;
      this.ball.reset(this.serverPlayer.x + 16, this.serverPlayer.y + 20, this.serverPlayer.depth);
      this.input.setActionLabel('TOSS');
    } else {
      this.serverPlayer = this.cpuTeam[0];
      this.controlledPlayer = this.playerTeam[1]; // Spiker/Receiver ready
      this.controlledPlayer.isControlled = true;
      this.ball.reset(this.serverPlayer.x - 16, this.serverPlayer.y + 20, this.serverPlayer.depth);
      this.input.setActionLabel('RECEIVE');
    }

    this.stateTimer = isPlayerServe ? 0 : 50;
  }

  private updateServeWait(): void {
    const isPlayerServe = this.scoreBoard.serveTeam === Team.PLAYER;

    if (isPlayerServe) {
      this.ball.x = this.serverPlayer!.x + 18;
      this.ball.y = this.serverPlayer!.y + 18;
      this.ball.depth = this.serverPlayer!.depth;

      // Player tosses the ball up for serve
      if (this.input.state.actionPressed || this.input.state.startPressed) {
        this.state = GameState.SERVE_IN_AIR;
        this.ball.inPlay = true;
        this.ball.isServed = true;
        this.ball.vy = -7.5; // Smooth toss upwards
        this.ball.vx = 0.5;
        this.serverPlayer!.state = PlayerState.SERVE_TOSS;
        this.sound.playBallHit('toss');
        this.input.setActionLabel('SPIKE!');
      }
    } else {
      // CPU server automatically tosses
      if (this.stateTimer > 0) {
        this.stateTimer--;
      } else {
        this.state = GameState.SERVE_IN_AIR;
        this.ball.inPlay = true;
        this.ball.isServed = true;
        this.ball.vy = -7.5;
        this.ball.vx = -0.5;
        this.serverPlayer!.state = PlayerState.SERVE_TOSS;
        this.sound.playBallHit('toss');
        this.stateTimer = 28;
      }
    }
  }

  private updateServeInAir(): void {
    this.ball.update();
    const isPlayerServe = this.scoreBoard.serveTeam === Team.PLAYER;

    if (isPlayerServe) {
      // Player jumps and hits serve at peak
      if (this.input.state.jumpPressed && this.serverPlayer!.isGrounded) {
        this.serverPlayer!.jump(1.05);
      }

      if (this.input.state.actionPressed) {
        const canHit = this.ball.y > this.serverPlayer!.y - 30 && this.ball.y < this.serverPlayer!.y + 40;
        if (canHit) {
          const isJumpServe = !this.serverPlayer!.isGrounded;
          const targetX = 640 + Math.random() * 120;
          const targetDepth = 0.2 + Math.random() * 0.6;
          this.ball.hitServe(targetX, targetDepth, Team.PLAYER, this.serverPlayer!.id, isJumpServe ? 42 : 55);

          this.serverPlayer!.triggerSpike();
          this.sound.playBallHit(isJumpServe ? 'spike' : 'serve');
          this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, isJumpServe);
          this.court.triggerFlash();

          this.state = GameState.RALLY;
          this.input.setActionLabel('PASS');
          this.autoSwitchPlayer();
        }
      }

      // Ball missed and hit floor
      if (this.ball.hasBounced) {
        this.handlePointAward(Team.CPU, 'out');
      }
    } else {
      // CPU timing serve hit
      if (this.stateTimer > 0) {
        this.stateTimer--;
        if (this.stateTimer === 10) {
          this.serverPlayer!.jump(1.0);
        }
      } else {
        const targetX = 220 + Math.random() * 140;
        const targetDepth = 0.2 + Math.random() * 0.6;
        this.ball.hitServe(targetX, targetDepth, Team.CPU, this.serverPlayer!.id, 48);

        this.serverPlayer!.triggerSpike();
        this.sound.playBallHit('serve');
        this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, false);

        this.state = GameState.RALLY;
        this.input.setActionLabel('RECEIVE');
        this.autoSwitchPlayer();
      }
    }
  }

  // --- Active Rally ---
  private updateRally(): void {
    this.ball.update();
    Physics.checkNetCollision(this.ball);

    // 1. Move Controlled Player
    this.handlePlayerInput();

    // 2. Update AI for CPU Team
    this.ai.updateCPU(
      this.cpuTeam,
      this.playerTeam,
      this.ball,
      () => {},
      (player, type) => {
        this.handleCpuHit(player, type);
      }
    );

    // 3. Update all player physics
    this.playerTeam.forEach(p => p.update());
    this.cpuTeam.forEach(p => p.update());

    // 4. Auto-switch controlled player to closest receiver on player's half
    if (this.ball.x < NET_X && this.ball.inPlay) {
      this.autoSwitchPlayer();
    }

    // 5. Dynamic Action Button Label
    const playerTouches = this.ball.touches[Team.PLAYER];
    if (playerTouches === 0) {
      this.input.setActionLabel('RECEIVE');
    } else if (playerTouches === 1) {
      this.input.setActionLabel('TOSS');
    } else {
      this.input.setActionLabel('SPIKE!');
    }

    // 6. Check Player Hit
    this.checkPlayerTeamHit();

    // 7. Check Floor Landing
    if (this.ball.hasBounced) {
      const evaluation = Physics.evaluateLanding(this.ball);
      this.handlePointAward(evaluation.scoringTeam, evaluation.reason);
    }
  }

  private handlePlayerInput(): void {
    const p = this.controlledPlayer;

    // Analog movement
    p.moveAnalog(this.input.analogX, this.input.analogY);

    // Jump
    if (this.input.state.jumpPressed && p.isGrounded) {
      p.jump();
      this.sound.playJump();
    }

    // Spike or Dive Action
    if (this.input.state.actionPressed) {
      if (!p.isGrounded) {
        p.triggerSpike();
      } else {
        const touches = this.ball.touches[Team.PLAYER];
        const distToBall = Math.hypot(this.ball.x - p.x, (this.ball.depth - p.depth) * 85);
        if (distToBall > 90 && this.ball.y > FLOOR_Y - 90) {
          p.triggerDive();
          this.sound.playShoeSqueak();
        } else if (touches === 0) {
          p.triggerReceive();
        } else if (touches === 1) {
          p.triggerToss();
        } else {
          p.triggerSpike();
        }
      }
    }
  }

  private autoSwitchPlayer(): void {
    const prediction = Physics.predictLanding(this.ball);
    let best = this.playerTeam[0];
    let minD = 99999;

    const touches = this.ball.touches[Team.PLAYER];

    for (const p of this.playerTeam) {
      // Role priority
      let roleWeight = 1.0;
      if (touches === 1 && p.role === 'setter') roleWeight = 0.5;
      if (touches === 2 && p.role === 'spiker') roleWeight = 0.6;

      const d = Math.hypot(p.x - prediction.x, (p.depth - prediction.depth) * 85) * roleWeight;
      if (d < minD) {
        minD = d;
        best = p;
      }
    }

    if (best !== this.controlledPlayer) {
      this.controlledPlayer.isControlled = false;
      this.controlledPlayer = best;
      this.controlledPlayer.isControlled = true;
    }
  }

  private checkPlayerTeamHit(): void {
    for (const p of this.playerTeam) {
      const res = Physics.checkPlayerBallHit(this.ball, p);
      if (res && res.hit) {
        this.executePlayerHit(p, res.type, res.quality);
        break;
      }
    }
  }

  private executePlayerHit(p: Player, type: string, quality: 'perfect' | 'good' | 'normal'): void {
    const touches = this.ball.touches[Team.PLAYER];
    this.scoreBoard.recordHit();

    if (type === 'receive' || touches === 0) {
      // Pass to setter position near net
      const setter = this.playerTeam.find(pl => pl.role === 'setter') || this.playerTeam[2];
      this.ball.hitReceive(setter.x - 20, Team.PLAYER, p.id, setter.depth);
      this.sound.playBallHit('receive');
      this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, false);
      this.scoreBoard.triggerCallout('NICE RECEIVE!', '', '#38bdf8');
    } else if (type === 'toss' || touches === 1) {
      // Toss high for spiker
      const spiker = this.playerTeam.find(pl => pl.role === 'spiker' && pl !== p) || this.playerTeam[1];
      this.ball.hitToss(PLAYER_ATTACK_X + 20, Team.PLAYER, p.id, spiker.depth);
      this.sound.playBallHit('toss');
      this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, false);
      this.scoreBoard.triggerCallout('PERFECT TOSS!', 'SPIKE READY!', '#facc15');
    } else if (type === 'spike' || touches >= 2) {
      // Explosive Spike into opponent court
      const isPeakSpike = !p.isGrounded && Math.abs(p.vy) < 2.5;
      const speed = isPeakSpike ? 13.5 : 9.5;

      // Steer spike angle with analog input
      const steerY = this.input.analogY * 1.5;
      const targetDepth = Math.max(0.1, Math.min(0.9, p.depth + this.input.analogY * 0.4));

      this.ball.hitSpike(speed, 5.0 + steerY, Team.PLAYER, p.id, (targetDepth - p.depth) * 0.05);
      this.sound.playBallHit('spike');
      this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, true);
      this.court.triggerFlash();

      this.scoreBoard.stats.spikes++;
      const kmh = isPeakSpike ? '124 KM/H' : '98 KM/H';
      this.scoreBoard.triggerCallout('SUPER SPIKE!', kmh, '#f43f5e');
    } else if (type === 'block') {
      this.ball.hitBlock(Team.CPU, p.id);
      this.sound.playBallHit('block');
      this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, true);
      this.scoreBoard.stats.blocks++;
      this.scoreBoard.triggerCallout('MONSTER BLOCK!', '', '#10b981');
    }
  }

  private handleCpuHit(player: Player, type: 'receive' | 'toss' | 'spike' | 'block'): void {
    const touches = this.ball.touches[Team.CPU];
    this.scoreBoard.recordHit();

    if (type === 'receive' || touches === 0) {
      const setter = this.cpuTeam.find(p => p.role === 'setter') || this.cpuTeam[2];
      this.ball.hitReceive(setter.x + 20, Team.CPU, player.id, setter.depth);
      this.sound.playBallHit('receive');
      this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, false);
    } else if (type === 'toss' || touches === 1) {
      const spiker = this.cpuTeam.find(p => p.role === 'spiker' && p !== player) || this.cpuTeam[1];
      this.ball.hitToss(CPU_ATTACK_X - 20, Team.CPU, player.id, spiker.depth);
      this.sound.playBallHit('toss');
      this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, false);
    } else if (type === 'spike') {
      const targetDepth = 0.2 + Math.random() * 0.6;
      this.ball.hitSpike(-11.5, 4.8, Team.CPU, player.id, (targetDepth - player.depth) * 0.04);
      this.sound.playBallHit('spike');
      this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, true);
      this.court.triggerFlash();
    } else if (type === 'block') {
      this.ball.hitBlock(Team.PLAYER, player.id);
      this.sound.playBallHit('block');
      this.renderer.triggerSpikeImpact(this.ball.x, this.ball.y, true);
    }
  }

  // --- Point Scored & Rally End ---
  private handlePointAward(scoringTeam: Team, reason: 'in' | 'out' | 'touch_out'): void {
    this.state = GameState.BALL_DEAD;
    this.stateTimer = 90;
    this.sound.playWhistle(true);

    const isPlayer = scoringTeam === Team.PLAYER;
    this.sound.playScoreFanfare(isPlayer);

    // Callout
    const callout = isPlayer ? 'POINT FALCONS!' : 'POINT OPPONENT!';
    this.scoreBoard.triggerCallout(callout, reason === 'in' ? 'CLEAN HIT' : 'OUT OF BOUNDS', isPlayer ? '#38bdf8' : '#f43f5e');

    // Celebrations
    if (isPlayer) {
      this.playerTeam.forEach(p => p.celebrate());
      this.cpuTeam.forEach(p => p.disappointed());
    } else {
      this.cpuTeam.forEach(p => p.celebrate());
      this.playerTeam.forEach(p => p.disappointed());
    }

    const { gameEnded } = this.scoreBoard.handleRallyEnd(scoringTeam, reason);

    if (gameEnded) {
      this.stateTimer = 110;
    }
  }

  private updateBallDead(): void {
    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer === 0) {
        if (this.scoreBoard.isGameOver) {
          this.state = GameState.MATCH_END;
        } else {
          this.startServeSequence();
        }
      }
    }
  }

  // --- Match End & Tournament Progression ---
  private updateMatchEnd(): void {
    const click = this.input.consumeClick();
    const isPlayerWin = this.scoreBoard.winner === Team.PLAYER;
    const isTournament = this.currentMode === GameMode.TOURNAMENT;

    if (click || this.input.state.startPressed || this.input.state.actionPressed) {
      if (isTournament && isPlayerWin && this.scoreBoard.tournamentRound < 2) {
        // Advance to next tournament round!
        this.scoreBoard.tournamentRound++;
        this.scoreBoard.reset();
        this.updateTournamentOpponent();
        this.startServeSequence();
      } else {
        // Return to title
        this.state = GameState.TITLE;
      }
    }
  }

  // --- Pause Menu ---
  private updatePaused(): void {
    const click = this.input.consumeClick();

    if (click) {
      const w = 320;
      const x = (CANVAS_WIDTH - w) / 2;
      const y = (CANVAS_HEIGHT - 260) / 2;

      // Resume
      if (click.x >= x + 24 && click.x <= x + w - 24 && click.y >= y + 70 && click.y <= y + 104) {
        this.state = GameState.RALLY;
        this.sound.playMenuClick();
      }
      // Restart
      if (click.x >= x + 24 && click.x <= x + w - 24 && click.y >= y + 112 && click.y <= y + 146) {
        this.scoreBoard.reset();
        this.startServeSequence();
        this.sound.playMenuClick();
      }
      // Sound Toggle
      if (click.x >= x + 24 && click.x <= x + w - 24 && click.y >= y + 154 && click.y <= y + 188) {
        this.sound.toggleMute();
        this.sound.playMenuClick();
      }
      // Quit
      if (click.x >= x + 24 && click.x <= x + w - 24 && click.y >= y + 196 && click.y <= y + 230) {
        this.state = GameState.TITLE;
        this.sound.playMenuClick();
      }
    }
  }

  // --- Main Render Pipeline ---
  private render(): void {
    this.renderer.clear();

    if (this.state === GameState.TITLE) {
      this.renderer.drawTitleScreen(
        this.currentMode,
        this.difficulties[this.difficultyIndex],
        this.targetScores[this.targetScoreIndex],
        this.sound.getMuted()
      );
      return;
    }

    const shake = this.renderer.getCameraShakeOffset();
    this.ctx.save();
    this.ctx.translate(shake.x, shake.y);

    // 1. Court & Stadium
    const prediction = this.ball.inPlay ? Physics.predictLanding(this.ball) : null;
    this.court.draw(
      this.ctx,
      prediction ? prediction.x : null,
      prediction ? prediction.depth : 0.5,
      prediction ? prediction.frames : 0
    );

    // 2. Players & Ball Depth Sorting (Painter's algorithm)
    const allEntities = [
      ...this.playerTeam.map(p => ({ type: 'player' as const, p, depth: p.depth })),
      ...this.cpuTeam.map(p => ({ type: 'player' as const, p, depth: p.depth })),
      { type: 'ball' as const, depth: this.ball.depth }
    ].sort((a, b) => a.depth - b.depth);

    allEntities.forEach(e => {
      if (e.type === 'player') {
        this.renderer.drawPlayer(e.p, this.currentOpponentPalette);
      } else {
        this.renderer.drawBall(this.ball);
      }
    });

    // 3. Dynamic Particle Effects & Shockwave Rings
    this.renderer.drawEffects();

    this.ctx.restore();

    // 4. Modern Glass HUD ScoreBoard
    this.scoreBoard.draw(this.ctx, this.ball.touches);

    // 5. On-Screen Touch / Mouse Controls
    this.input.drawControls(this.ctx);

    // 6. Pause Overlay
    if (this.state === GameState.PAUSED) {
      this.renderer.drawPauseOverlay();
    }

    // 7. Match End Modal
    if (this.state === GameState.MATCH_END && this.scoreBoard.winner) {
      this.renderer.drawGameOver(
        this.scoreBoard.winner,
        this.scoreBoard.stats,
        this.currentMode === GameMode.TOURNAMENT,
        this.scoreBoard.tournamentRound
      );
    }
  }
}