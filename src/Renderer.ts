import { Court } from './Court';
import { Ball } from './Ball';
import { Player } from './Player';
import { ScoreBoard } from './ScoreBoard';
import { InputManager } from './InputManager';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GamePhase, COLORS, Difficulty } from './constants';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private court: Court;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.court = new Court();
  }

  public render(
    phase: GamePhase,
    players: Player[],
    opponents: Player[],
    ball: Ball,
    scoreBoard: ScoreBoard,
    inputManager: InputManager,
    actionContextLabel: string,
    announcementText: string,
    difficulty: Difficulty
  ): void {
    // 1. Clear Canvas
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (phase === 'title' || phase === 'select') {
      this.renderTitleScreen(phase, difficulty);
      return;
    }

    // 2. Draw Court & Stadium Background
    this.court.draw(this.ctx);

    // 3. Draw Players (Sorted by Y for depth layering)
    const allPlayers = [...players, ...opponents].sort((a, b) => a.pos.y - b.pos.y);
    allPlayers.forEach((p) => p.draw(this.ctx));

    // 4. Draw Ball
    ball.draw(this.ctx);

    // 5. Draw ScoreBoard & HUD
    scoreBoard.draw(this.ctx);

    // 6. Draw Virtual Touch Control UI Overlay (D-Pad & Action Button)
    this.renderTouchControls(inputManager, actionContextLabel);

    // 7. Draw Announcement Text (e.g., READY, POINT, WIN)
    if (announcementText) {
      this.renderAnnouncement(announcementText);
    }
  }

  private renderTitleScreen(phase: GamePhase, difficulty: Difficulty): void {
    // Dark Retro Gradient Background
    const grad = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#0a0f1d');
    grad.addColorStop(1, '#1e293b');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Famicom Style Pixel Frame
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40);

    // Game Title Header
    this.ctx.save();
    this.ctx.font = 'black 48px monospace';
    this.ctx.textAlign = 'center';

    // Shadow
    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillText('ハイパーバレーボール', CANVAS_WIDTH / 2 + 4, 144);

    // Main Title
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.fillText('ハイパーバレーボール', CANVAS_WIDTH / 2, 140);

    this.ctx.font = 'bold 18px monospace';
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillText('FAMICOM DISK CLONE - 6vs6 EDITION', CANVAS_WIDTH / 2, 185);

    if (phase === 'title') {
      // Blinking start prompt
      const blink = Math.floor(Date.now() / 400) % 2 === 0;
      if (blink) {
        this.ctx.font = 'bold 22px monospace';
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillText('★ TOUCH SCREEN OR PRESS SPACE TO START ★', CANVAS_WIDTH / 2, 320);
      }

      this.ctx.font = '14px monospace';
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillText('Controls: Virtual D-Pad / Arrows (Move) + Action Button / Space (Hit)', CANVAS_WIDTH / 2, 440);
      this.ctx.fillText('© 1986-2025 RETRO VOLLEYBALL STUDIO', CANVAS_WIDTH / 2, 475);
    } else if (phase === 'select') {
      this.ctx.font = 'bold 22px monospace';
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fillText('SELECT DIFFICULTY', CANVAS_WIDTH / 2, 260);

      const difficulties: Difficulty[] = ['easy', 'normal', 'hard'];
      difficulties.forEach((d, idx) => {
        const y = 320 + idx * 40;
        const isSelected = d === difficulty;
        this.ctx.font = 'bold 20px monospace';
        this.ctx.fillStyle = isSelected ? '#fbbf24' : '#94a3b8';
        const prefix = isSelected ? '▶ ' : '  ';
        this.ctx.fillText(`${prefix}${d.toUpperCase()}`, CANVAS_WIDTH / 2, y);
      });

      this.ctx.font = '14px monospace';
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.fillText('Touch / Arrow keys to toggle, Space / Action to confirm', CANVAS_WIDTH / 2, 460);
    }

    this.ctx.restore();
  }

  private renderTouchControls(inputManager: InputManager, actionLabel: string): void {
    this.ctx.save();

    // 1. D-Pad (Bottom Left)
    const dpad = inputManager.dpadCenter;
    this.ctx.fillStyle = COLORS.controlBg;
    this.ctx.strokeStyle = COLORS.controlBorder;
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.arc(dpad.x, dpad.y, dpad.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // D-Pad Cross Graphic
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fillRect(dpad.x - 12, dpad.y - 38, 24, 76);
    this.ctx.fillRect(dpad.x - 38, dpad.y - 12, 76, 24);

    this.ctx.fillStyle = COLORS.controlText;
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MOVE', dpad.x, dpad.y + 4);

    // 2. Action Button (Bottom Right)
    const btn = inputManager.actionBtn;
    this.ctx.fillStyle = actionLabel ? COLORS.controlActive : COLORS.controlBg;
    this.ctx.strokeStyle = COLORS.controlBorder;
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(actionLabel || 'ACTION', btn.x, btn.y + 5);

    this.ctx.restore();
  }

  private renderAnnouncement(text: string): void {
    this.ctx.save();

    // Announcement Banner
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.fillRect(0, CANVAS_HEIGHT / 2 - 40, CANVAS_WIDTH, 80);
    this.ctx.strokeStyle = COLORS.hudBorder;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(0, CANVAS_HEIGHT / 2 - 40, CANVAS_WIDTH, 80);

    this.ctx.font = 'black 36px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = COLORS.textGold;
    this.ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 12);

    this.ctx.restore();
  }
}
