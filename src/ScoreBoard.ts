import { CANVAS_WIDTH, GameMode, Team } from './constants';

export interface MatchStats {
  spikes: number;
  blocks: number;
  aces: number;
  longestRally: number;
  totalRallies: number;
}

export class ScoreBoard {
  public playerScore: number = 0;
  public cpuScore: number = 0;
  public setsPlayer: number = 0;
  public setsCpu: number = 0;

  public serveTeam: Team = Team.PLAYER;
  public serverIndex: { [key in Team]: number } = {
    [Team.PLAYER]: 0,
    [Team.CPU]: 0
  };

  public winScore: number = 11;
  public isDeuce: boolean = false;
  public isMatchPoint: boolean = false;
  public isGameOver: boolean = false;
  public winner: Team | null = null;

  public gameMode: GameMode = GameMode.QUICK;
  public tournamentRound: number = 0; // 0 = Quarter, 1 = Semi, 2 = Final

  // HUD Toast Callout
  public calloutTitle: string = '';
  public calloutSubtitle: string = '';
  public calloutTimer: number = 0;
  public calloutColor: string = '#f59e0b';

  // Stats
  public stats: MatchStats = {
    spikes: 0,
    blocks: 0,
    aces: 0,
    longestRally: 0,
    totalRallies: 0
  };
  public currentRallyHits: number = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.playerScore = 0;
    this.cpuScore = 0;
    this.serveTeam = Team.PLAYER;
    this.serverIndex[Team.PLAYER] = 0;
    this.serverIndex[Team.CPU] = 0;
    this.isDeuce = false;
    this.isMatchPoint = false;
    this.isGameOver = false;
    this.winner = null;
    this.calloutTitle = '';
    this.calloutSubtitle = '';
    this.calloutTimer = 0;
    this.currentRallyHits = 0;
  }

  public triggerCallout(title: string, subtitle: string = '', color: string = '#f59e0b'): void {
    this.calloutTitle = title;
    this.calloutSubtitle = subtitle;
    this.calloutTimer = 85;
    this.calloutColor = color;
  }

  public recordHit(): void {
    this.currentRallyHits++;
    if (this.currentRallyHits > this.stats.longestRally) {
      this.stats.longestRally = this.currentRallyHits;
    }
  }

  public update(): void {
    if (this.calloutTimer > 0) {
      this.calloutTimer--;
      if (this.calloutTimer === 0) {
        this.calloutTitle = '';
        this.calloutSubtitle = '';
      }
    }
  }

  public handleRallyEnd(winningTeam: Team, reason: 'in' | 'out' | 'touch_out'): {
    isPoint: boolean;
    gameEnded: boolean;
  } {
    this.stats.totalRallies++;
    let gameEnded = false;

    if (winningTeam === Team.PLAYER) {
      this.playerScore++;
    } else {
      this.cpuScore++;
    }

    // Check Deuce (e.g. 10-10 in 11pt game)
    if (this.playerScore >= this.winScore - 1 && this.cpuScore >= this.winScore - 1) {
      this.isDeuce = Math.abs(this.playerScore - this.cpuScore) < 2;
    } else {
      this.isDeuce = false;
    }

    // Check Match Point
    const maxScore = Math.max(this.playerScore, this.cpuScore);
    const minScore = Math.min(this.playerScore, this.cpuScore);
    if (maxScore >= this.winScore - 1 && maxScore - minScore >= 1) {
      this.isMatchPoint = true;
    } else {
      this.isMatchPoint = false;
    }

    // Win condition (reach winScore AND lead by 2)
    if (
      (this.playerScore >= this.winScore && this.playerScore - this.cpuScore >= 2) ||
      (this.cpuScore >= this.winScore && this.cpuScore - this.playerScore >= 2)
    ) {
      this.isGameOver = true;
      this.winner = this.playerScore > this.cpuScore ? Team.PLAYER : Team.CPU;
      gameEnded = true;
    }

    // Server switches to winning team
    this.serveTeam = winningTeam;
    this.currentRallyHits = 0;

    return { isPoint: true, gameEnded };
  }

  public draw(ctx: CanvasRenderingContext2D, touches: { [key in Team]: number }, isPaused: boolean = false): void {
    ctx.save();

    // 1. Top HUD Glass Header Card
    const cardW = 460;
    const cardH = 50;
    const cardX = (CANVAS_WIDTH - cardW) / 2;
    const cardY = 14;

    // Glass panel
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Player Team Badge & Score (Left)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '800 13px "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('FALCONS', cardX + 16, cardY + 18);

    // Serve indicator dot
    if (this.serveTeam === Team.PLAYER) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cardX + 85, cardY + 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Touch counter pips (Left)
    this.drawTouchPips(ctx, cardX + 16, cardY + 34, touches[Team.PLAYER], '#38bdf8');

    // Player Score (Big bold number)
    ctx.font = '900 28px "Outfit", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.playerScore.toString(), cardX + 180, cardY + 26);

    // VS / Target Score Badge in Center
    ctx.textAlign = 'center';
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`TARGET: ${this.winScore}`, cardX + cardW / 2, cardY + 18);

    ctx.font = '700 11px "Outfit", sans-serif';
    ctx.fillStyle = this.isDeuce ? '#f43f5e' : (this.isMatchPoint ? '#facc15' : '#94a3b8');
    ctx.fillText(this.isDeuce ? 'DEUCE' : (this.isMatchPoint ? 'MATCH POINT' : 'VS'), cardX + cardW / 2, cardY + 32);

    // CPU Score (Right)
    ctx.font = '900 28px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.cpuScore.toString(), cardX + cardW - 180, cardY + 26);

    // CPU Team Badge (Right)
    ctx.textAlign = 'right';
    ctx.font = '800 13px "Outfit", sans-serif';
    ctx.fillStyle = '#fb7185';
    ctx.fillText('OPPONENT', cardX + cardW - 16, cardY + 18);

    // Serve indicator dot (Right)
    if (this.serveTeam === Team.CPU) {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cardX + cardW - 95, cardY + 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Touch counter pips (Right)
    this.drawTouchPips(ctx, cardX + cardW - 65, cardY + 34, touches[Team.CPU], '#fb7185');

    // 2. Active Callout Banner Toast ("PERFECT TOSS!", "SUPER SPIKE!")
    if (this.calloutTimer > 0) {
      const alpha = Math.min(1.0, this.calloutTimer / 20);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const toastY = 82;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      const toastW = 320;
      ctx.beginPath();
      ctx.roundRect((CANVAS_WIDTH - toastW) / 2, toastY - 14, toastW, 30, 8);
      ctx.fill();
      ctx.strokeStyle = this.calloutColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = this.calloutColor;
      ctx.font = '800 14px "Outfit", sans-serif';
      ctx.fillText(this.calloutTitle, CANVAS_WIDTH / 2, toastY);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawTouchPips(ctx: CanvasRenderingContext2D, startX: number, y: number, currentTouches: number, color: string): void {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < currentTouches ? color : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(startX + i * 16, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}