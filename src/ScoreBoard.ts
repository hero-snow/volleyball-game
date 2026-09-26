import {
  CANVAS_WIDTH,
  GameStats,
  TeamSide,
  WIN_SCORE,
  DEUCE_MARGIN,
  COLORS
} from './constants';

export class ScoreBoard {
  public stats: GameStats;
  public leftRotation: number = 0;
  public rightRotation: number = 0;

  constructor() {
    this.stats = {
      leftScore: 0,
      rightScore: 0,
      leftSets: 0,
      rightSets: 0,
      servingSide: 'left',
      touchCount: 0,
      lastTouchTeam: null,
      lastTouchPlayerId: null,
    };
  }

  public resetMatch(): void {
    this.stats.leftScore = 0;
    this.stats.rightScore = 0;
    this.stats.leftSets = 0;
    this.stats.rightSets = 0;
    this.stats.servingSide = 'left';
    this.stats.touchCount = 0;
    this.stats.lastTouchTeam = null;
    this.stats.lastTouchPlayerId = null;
    this.leftRotation = 0;
    this.rightRotation = 0;
  }

  public addPoint(winningSide: TeamSide): { isGameOver: boolean; winner: TeamSide | null } {
    if (winningSide === 'left') {
      this.stats.leftScore++;
    } else {
      this.stats.rightScore++;
    }

    // Sideout / Serve possession & rotation
    if (this.stats.servingSide !== winningSide) {
      this.stats.servingSide = winningSide;
      if (winningSide === 'left') {
        this.leftRotation = (this.leftRotation + 1) % 6;
      } else {
        this.rightRotation = (this.rightRotation + 1) % 6;
      }
    }

    // Reset touch count
    this.stats.touchCount = 0;

    // Check Win Condition
    const l = this.stats.leftScore;
    const r = this.stats.rightScore;

    if (l >= WIN_SCORE && l - r >= DEUCE_MARGIN) {
      this.stats.leftSets++;
      return { isGameOver: true, winner: 'left' };
    }
    if (r >= WIN_SCORE && r - l >= DEUCE_MARGIN) {
      this.stats.rightSets++;
      return { isGameOver: true, winner: 'right' };
    }

    return { isGameOver: false, winner: null };
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const boxWidth = 320;
    const boxHeight = 54;
    const boxX = (CANVAS_WIDTH - boxWidth) / 2;
    const boxY = 16;

    ctx.save();

    // Board Container Box
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = COLORS.hudBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Left Team Header (JAPAN / PLAYER)
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = COLORS.textRed;
    ctx.textAlign = 'left';
    ctx.fillText('JPN (YOU)', boxX + 16, boxY + 22);

    // Right Team Header (USA / AI)
    ctx.fillStyle = COLORS.textBlue;
    ctx.textAlign = 'right';
    ctx.fillText('USA (AI)', boxX + boxWidth - 16, boxY + 22);

    // Scores
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = COLORS.textWhite;

    // Left Score
    ctx.textAlign = 'right';
    ctx.fillText(
      this.stats.leftScore.toString().padStart(2, '0'),
      boxX + 115,
      boxY + 40
    );

    // Score Divider
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.textGold;
    ctx.fillText(':', boxX + boxWidth / 2, boxY + 38);

    // Right Score
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textWhite;
    ctx.fillText(
      this.stats.rightScore.toString().padStart(2, '0'),
      boxX + 175,
      boxY + 40
    );

    // Serving Ball Indicator Arrow
    ctx.fillStyle = COLORS.textGold;
    if (this.stats.servingSide === 'left') {
      ctx.beginPath();
      ctx.moveTo(boxX + 130, boxY + 18);
      ctx.lineTo(boxX + 138, boxY + 23);
      ctx.lineTo(boxX + 130, boxY + 28);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(boxX + 190, boxY + 18);
      ctx.lineTo(boxX + 182, boxY + 23);
      ctx.lineTo(boxX + 190, boxY + 28);
      ctx.fill();
    }

    // Touch Count Dots Indicator below scoreboard
    if (this.stats.touchCount > 0) {
      ctx.fillStyle = COLORS.textGold;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      const touchesStr = '● '.repeat(this.stats.touchCount) + '○ '.repeat(3 - this.stats.touchCount);
      ctx.fillText(`TOUCHES: ${touchesStr.trim()}`, CANVAS_WIDTH / 2, boxY + boxHeight + 16);
    }

    ctx.restore();
  }
}
