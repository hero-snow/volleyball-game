import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COURT_LEFT,
  COURT_RIGHT,
  COURT_FLOOR_Y,
  NET_X,
  NET_TOP_Y,
  NET_HEIGHT,
  NET_WIDTH,
  ANTENNA_HEIGHT,
  COLORS
} from './constants';

export class Court {
  public draw(ctx: CanvasRenderingContext2D): void {
    // 1. Retro Stadium Background
    // Sky/Upper Wall
    ctx.fillStyle = COLORS.bgSky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Stadium Wall
    ctx.fillStyle = COLORS.bgWall;
    ctx.fillRect(0, 100, CANVAS_WIDTH, COURT_FLOOR_Y - 100);

    // Wall Top Border Line
    ctx.fillStyle = '#2e3d5c';
    ctx.fillRect(0, 96, CANVAS_WIDTH, 4);

    // Banners / Crowd Pixel Art Backdrop
    this.drawStadiumBackground(ctx);

    // 2. Court Floor Base
    const courtWidth = COURT_RIGHT - COURT_LEFT;

    // Out of bounds floor border
    ctx.fillStyle = COLORS.courtOutBorder;
    ctx.fillRect(COURT_LEFT - 30, COURT_FLOOR_Y, courtWidth + 60, CANVAS_HEIGHT - COURT_FLOOR_Y);

    // Main Court Wood Floor
    ctx.fillStyle = COLORS.courtFloor;
    ctx.fillRect(COURT_LEFT, COURT_FLOOR_Y, courtWidth, CANVAS_HEIGHT - COURT_FLOOR_Y - 20);

    // Wood floor plank lines (Retro pattern)
    ctx.fillStyle = COLORS.courtFloorDark;
    for (let x = COURT_LEFT; x < COURT_RIGHT; x += 40) {
      ctx.fillRect(x, COURT_FLOOR_Y, 2, CANVAS_HEIGHT - COURT_FLOOR_Y - 20);
    }
    ctx.fillRect(COURT_LEFT, COURT_FLOOR_Y + 40, courtWidth, 2);
    ctx.fillRect(COURT_LEFT, COURT_FLOOR_Y + 80, courtWidth, 2);

    // 3. Court Lines
    ctx.fillStyle = COLORS.courtLine;
    const lineWidth = 4;

    // Floor Baseline
    ctx.fillRect(COURT_LEFT, COURT_FLOOR_Y, courtWidth, lineWidth);
    // Left boundary
    ctx.fillRect(COURT_LEFT, COURT_FLOOR_Y, lineWidth, CANVAS_HEIGHT - COURT_FLOOR_Y - 20);
    // Right boundary
    ctx.fillRect(COURT_RIGHT - lineWidth, COURT_FLOOR_Y, lineWidth, CANVAS_HEIGHT - COURT_FLOOR_Y - 20);
    // Center line under net
    ctx.fillRect(NET_X - lineWidth / 2, COURT_FLOOR_Y, lineWidth, CANVAS_HEIGHT - COURT_FLOOR_Y - 20);

    // Attack Lines (3m line)
    // Left side attack line (120px from net)
    ctx.fillRect(NET_X - 120, COURT_FLOOR_Y, 3, CANVAS_HEIGHT - COURT_FLOOR_Y - 20);
    // Right side attack line (120px from net)
    ctx.fillRect(NET_X + 120, COURT_FLOOR_Y, 3, CANVAS_HEIGHT - COURT_FLOOR_Y - 20);

    // 4. Net & Poles
    // Left & Right Poles
    ctx.fillStyle = COLORS.netPole;
    ctx.fillRect(NET_X - NET_WIDTH / 2 - 2, NET_TOP_Y - 10, 3, COURT_FLOOR_Y - NET_TOP_Y + 10);
    ctx.fillRect(NET_X + NET_WIDTH / 2 - 1, NET_TOP_Y - 10, 3, COURT_FLOOR_Y - NET_TOP_Y + 10);

    // Net Mesh
    ctx.fillStyle = COLORS.netMesh;
    for (let y = NET_TOP_Y; y < COURT_FLOOR_Y; y += 8) {
      ctx.fillRect(NET_X - NET_WIDTH / 2, y, NET_WIDTH, 1);
    }
    for (let x = NET_X - NET_WIDTH / 2; x <= NET_X + NET_WIDTH / 2; x += 3) {
      ctx.fillRect(x, NET_TOP_Y, 1, COURT_FLOOR_Y - NET_TOP_Y);
    }

    // Top Net White Band
    ctx.fillStyle = COLORS.netBand;
    ctx.fillRect(NET_X - NET_WIDTH / 2 - 2, NET_TOP_Y - 4, NET_WIDTH + 4, 6);

    // Antennas (Red and white stripes)
    const antXLeft = NET_X - NET_WIDTH / 2 - 1;
    const antXRight = NET_X + NET_WIDTH / 2 + 1;
    this.drawAntenna(ctx, antXLeft);
    this.drawAntenna(ctx, antXRight);
  }

  private drawStadiumBackground(ctx: CanvasRenderingContext2D): void {
    // Scoreboard banner or decorative retro banners on background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(180, 110, 600, 30);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(180, 110, 600, 30);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('★ VOLLEYBALL CHAMPIONSHIP - Famicom Classic Clone ★', CANVAS_WIDTH / 2, 130);

    // Animated / Static Spectators dots
    ctx.fillStyle = '#475569';
    for (let x = 60; x < 900; x += 18) {
      ctx.fillRect(x, 155, 10, 12);
      ctx.fillRect(x + 2, 147, 6, 8); // Heads
    }
  }

  private drawAntenna(ctx: CanvasRenderingContext2D, x: number): void {
    const startY = NET_TOP_Y - ANTENNA_HEIGHT;
    const height = ANTENNA_HEIGHT + 10;
    const stripeHeight = 8;

    for (let y = 0; y < height; y += stripeHeight) {
      ctx.fillStyle = (Math.floor(y / stripeHeight) % 2 === 0) ? '#ff3333' : '#ffffff';
      ctx.fillRect(x, startY + y, 2, stripeHeight);
    }
  }
}
