import { CANVAS_WIDTH, DEFAULT_WIN_SCORE, NES_COLORS, Team } from './constants';

export class ScoreBoard {
  public playerScore: number = 0;
  public cpuScore: number = 0;
  public serveTeam: Team = Team.PLAYER;
  public serverIndex: { [key in Team]: number } = {
    [Team.PLAYER]: 0,
    [Team.CPU]: 0
  };
  public winScore: number = DEFAULT_WIN_SCORE;
  public isDeuce: boolean = false;
  public isGameOver: boolean = false;
  public winner: Team | null = null;

  public message: string = '';
  public subMessage: string = '';
  public messageTimer: number = 0;
  private blinkTimer: number = 0;

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
    this.isGameOver = false;
    this.winner = null;
    this.message = '';
    this.subMessage = '';
    this.messageTimer = 0;
    this.blinkTimer = 0;
  }

  public update(): void {
    this.blinkTimer++;
    if (this.messageTimer > 0) {
      this.messageTimer--;
      if (this.messageTimer === 0) {
        this.message = '';
        this.subMessage = '';
      }
    }
  }

  public handleRallyEnd(winningTeam: Team, reasonText: string): { isPoint: boolean; isSideOut: boolean; gameEnded: boolean } {
    const previousServeTeam = this.serveTeam;
    const isSideOut = winningTeam !== previousServeTeam;
    const isPoint = true;
    let gameEnded = false;

    if (winningTeam === Team.PLAYER) {
      this.playerScore++;
    } else {
      this.cpuScore++;
    }

    if (isSideOut) {
      this.serverIndex[winningTeam] = (this.serverIndex[winningTeam] + 1) % 6;
    }
    this.serveTeam = winningTeam;

    const scoreDifference = this.playerScore - this.cpuScore;
    const winningScore = winningTeam === Team.PLAYER ? this.playerScore : this.cpuScore;
    if (winningScore >= this.winScore && Math.abs(scoreDifference) >= 2) {
      this.winner = winningTeam;
      this.isGameOver = true;
      gameEnded = true;
    } else if (this.playerScore >= this.winScore - 1 && this.cpuScore >= this.winScore - 1) {
      this.isDeuce = this.playerScore === this.cpuScore;
      const who = winningTeam === Team.PLAYER ? '1P' : 'CPU';
      this.setMessage(this.isDeuce ? 'DEUCE!' : `${who} MATCH POINT!`, reasonText, 120);
    } else {
      const who = winningTeam === Team.PLAYER ? '1P POINT!' : 'CPU POINT!';
      this.setMessage(who, reasonText, 100);
    }

    if (this.isGameOver) {
      const winText = this.winner === Team.PLAYER ? 'YOU WIN!!' : 'CPU WINS!';
      this.setMessage(winText, 'GAME OVER', 240);
    }

    return { isPoint, isSideOut, gameEnded };
  }

  public setMessage(msg: string, sub: string = '', duration: number = 90): void {
    this.message = msg;
    this.subMessage = sub;
    this.messageTimer = duration;
  }

  public draw(ctx: CanvasRenderingContext2D, touches: { [key in Team]: number }): void {
    const boardY = 6;
    const boardH = 26;

    ctx.fillStyle = '#080810';
    ctx.fillRect(CANVAS_WIDTH / 2 - 130, boardY, 260, boardH);
    ctx.strokeStyle = '#3a4460';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(CANVAS_WIDTH / 2 - 130, boardY, 260, boardH);

    ctx.font = 'bold 12px monospace';
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'left';
    ctx.fillStyle = NES_COLORS.TEXT_WHITE;
    ctx.fillText('1P', CANVAS_WIDTH / 2 - 120, boardY + 13);

    if (this.serveTeam === Team.PLAYER) {
      const showLamp = (Math.floor(this.blinkTimer / 15) % 2 === 0);
      ctx.fillStyle = showLamp ? '#00e040' : '#006020';
      ctx.fillRect(CANVAS_WIDTH / 2 - 95, boardY + 9, 8, 8);
    }

    ctx.fillStyle = NES_COLORS.TEXT_YELLOW;
    ctx.font = 'bold 14px monospace';
    const pScoreStr = this.playerScore < 10 ? `0${this.playerScore}` : `${this.playerScore}`;
    ctx.fillText(pScoreStr, CANVAS_WIDTH / 2 - 80, boardY + 13);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#88a8d8';
    ctx.fillText(`TOUCH:${touches[Team.PLAYER]}/3`, CANVAS_WIDTH / 2 - 50, boardY + 13);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('-', CANVAS_WIDTH / 2, boardY + 13);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#d8a888';
    ctx.textAlign = 'right';
    ctx.fillText(`TOUCH:${touches[Team.CPU]}/3`, CANVAS_WIDTH / 2 + 50, boardY + 13);

    ctx.fillStyle = NES_COLORS.TEXT_YELLOW;
    ctx.font = 'bold 14px monospace';
    const cpuScoreStr = this.cpuScore < 10 ? `0${this.cpuScore}` : `${this.cpuScore}`;
    ctx.fillText(cpuScoreStr, CANVAS_WIDTH / 2 + 80, boardY + 13);

    if (this.serveTeam === Team.CPU) {
      const showLamp = (Math.floor(this.blinkTimer / 15) % 2 === 0);
      ctx.fillStyle = showLamp ? '#00e040' : '#006020';
      ctx.fillRect(CANVAS_WIDTH / 2 + 87, boardY + 9, 8, 8);
    }

    ctx.fillStyle = NES_COLORS.TEXT_WHITE;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('CPU', CANVAS_WIDTH / 2 + 122, boardY + 13);

    if (this.message) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(CANVAS_WIDTH / 2 - 120, 80, 240, 40);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(CANVAS_WIDTH / 2 - 120, 80, 240, 40);

      ctx.textAlign = 'center';
      ctx.fillStyle = NES_COLORS.TEXT_YELLOW;
      ctx.font = 'bold 14px monospace';
      ctx.fillText(this.message, CANVAS_WIDTH / 2, 95);

      if (this.subMessage) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(this.subMessage, CANVAS_WIDTH / 2, 110);
      }
      ctx.restore();
    }
  }
}