import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FLOOR_Y,
  COURT_LEFT,
  COURT_RIGHT,
  NET_X,
  NET_TOP_Y,
  NET_HEIGHT,
  PLAYER_ATTACK_X,
  CPU_ATTACK_X,
  NES_COLORS,
  projectCourtPosition
} from './constants';

export class Court {
  private crowdFrame: number = 0;
  private crowdTimer: number = 0;

  constructor() {}

  public update(): void {
    this.crowdTimer++;
    if (this.crowdTimer > 15) {
      this.crowdTimer = 0;
      this.crowdFrame = (this.crowdFrame + 1) % 2;
    }
  }

  public draw(ctx: CanvasRenderingContext2D, ballLandingX?: number | null, ballLandingDepth: number = 0.5): void {
    ctx.fillStyle = NES_COLORS.DARK_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, FLOOR_Y);

    ctx.fillStyle = '#142038';
    ctx.fillRect(0, 40, CANVAS_WIDTH, 4);
    ctx.fillRect(0, 80, CANVAS_WIDTH, 2);

    this.drawCrowd(ctx);
    this.drawFloor(ctx);
    this.drawCourtSurface(ctx);
    this.drawCourtLines(ctx);

    if (ballLandingX !== undefined && ballLandingX !== null) {
      this.drawLandingMarker(ctx, ballLandingX, ballLandingDepth);
    }

    this.drawNet(ctx);
  }

  private drawCrowd(ctx: CanvasRenderingContext2D): void {
    const crowdY = 50;
    const colors = ['#f83800', '#00a800', '#fce000', '#0078f8', '#ffffff', '#e40058'];

    for (let x = 10; x < CANVAS_WIDTH - 10; x += 12) {
      const offset = (Math.sin(x * 123) > 0 ? 0 : 1);
      const bounce = (this.crowdFrame === offset) ? -1 : 0;
      const col = colors[Math.floor(Math.abs(Math.sin(x * 99)) * colors.length)];

      ctx.fillStyle = '#fca044';
      ctx.fillRect(x + 2, crowdY + bounce, 4, 4);
      ctx.fillStyle = col;
      ctx.fillRect(x + 1, crowdY + 4 + bounce, 6, 6);
    }

    ctx.fillStyle = '#404860';
    ctx.fillRect(0, 62, CANVAS_WIDTH, 3);
  }

  private drawFloor(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = NES_COLORS.FLOOR_DARK;
    ctx.fillRect(0, 66, CANVAS_WIDTH, CANVAS_HEIGHT - 66);

    ctx.fillStyle = NES_COLORS.FLOOR_LIGHT;
    for (let y = 66; y < CANVAS_HEIGHT; y += 6) {
      ctx.fillRect(0, y, CANVAS_WIDTH, 1);
    }
  }

  private drawCourtSurface(ctx: CanvasRenderingContext2D): void {
    const nearLeft = projectCourtPosition(COURT_LEFT, 1);
    const nearRight = projectCourtPosition(COURT_RIGHT, 1);
    const farRight = projectCourtPosition(COURT_RIGHT, 0);
    const farLeft = projectCourtPosition(COURT_LEFT, 0);
    ctx.fillStyle = NES_COLORS.COURT_FILL;
    ctx.beginPath();
    ctx.moveTo(nearLeft.x, nearLeft.y);
    ctx.lineTo(nearRight.x, nearRight.y);
    ctx.lineTo(farRight.x, farRight.y);
    ctx.lineTo(farLeft.x, farLeft.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#174820';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawCourtLines(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = NES_COLORS.COURT_LINE;
    ctx.lineWidth = 1.5;
    this.drawWorldLine(ctx, COURT_LEFT, 0, COURT_LEFT, 1);
    this.drawWorldLine(ctx, COURT_RIGHT, 0, COURT_RIGHT, 1);
    this.drawWorldLine(ctx, COURT_LEFT, 0, COURT_RIGHT, 0);
    this.drawWorldLine(ctx, COURT_LEFT, 1, COURT_RIGHT, 1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    this.drawWorldLine(ctx, PLAYER_ATTACK_X, 0, PLAYER_ATTACK_X, 1);
    this.drawWorldLine(ctx, CPU_ATTACK_X, 0, CPU_ATTACK_X, 1);
  }

  private drawWorldLine(ctx: CanvasRenderingContext2D, x1: number, depth1: number, x2: number, depth2: number, height: number = 0): void {
    const start = projectCourtPosition(x1, depth1, height);
    const end = projectCourtPosition(x2, depth2, height);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  private drawReferee(ctx: CanvasRenderingContext2D): void {
    const chairX = NET_X - 16;
    const chairTopY = NET_TOP_Y - 14;

    ctx.fillStyle = '#6c7a89';
    ctx.fillRect(chairX, chairTopY + 12, 3, FLOOR_Y - (chairTopY + 12));
    ctx.fillRect(chairX + 10, chairTopY + 12, 3, FLOOR_Y - (chairTopY + 12));

    for (let sy = chairTopY + 16; sy < FLOOR_Y; sy += 10) {
      ctx.fillRect(chairX, sy, 13, 2);
    }
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(chairX - 2, chairTopY + 10, 16, 3);

    ctx.fillStyle = '#fca044';
    ctx.fillRect(chairX + 3, chairTopY - 2, 6, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(chairX + 3, chairTopY - 3, 7, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(chairX + 2, chairTopY + 4, 8, 7);
    ctx.fillStyle = '#000000';
    ctx.fillRect(chairX + 4, chairTopY + 4, 2, 7);
    ctx.fillRect(chairX + 8, chairTopY + 4, 2, 7);
  }

  private drawNet(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(18, 26, 34, 0.78)';
    ctx.beginPath();
    const leftTop = projectCourtPosition(NET_X, 0, NET_HEIGHT);
    const rightTop = projectCourtPosition(NET_X, 1, NET_HEIGHT);
    const rightBottom = projectCourtPosition(NET_X, 1);
    const leftBottom = projectCourtPosition(NET_X, 0);
    ctx.moveTo(leftTop.x, leftTop.y);
    ctx.lineTo(rightTop.x, rightTop.y);
    ctx.lineTo(rightBottom.x, rightBottom.y);
    ctx.lineTo(leftBottom.x, leftBottom.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(230, 240, 244, 0.52)';
    ctx.lineWidth = 0.7;
    for (let depth = 0; depth <= 1.001; depth += 0.1) {
      const top = projectCourtPosition(NET_X, depth, NET_HEIGHT);
      const bottom = projectCourtPosition(NET_X, depth);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    }
    for (let height = 10; height < NET_HEIGHT; height += 10) {
      this.drawWorldLine(ctx, NET_X, 0, NET_X, 1, height);
    }

    ctx.strokeStyle = NES_COLORS.NET_TOP;
    ctx.lineWidth = 3;
    this.drawWorldLine(ctx, NET_X, 0, NET_X, 1, NET_HEIGHT);
    ctx.fillStyle = NES_COLORS.NET_POST;
    for (const depth of [0, 1]) {
      const post = projectCourtPosition(NET_X, depth);
      ctx.fillRect(post.x - 1, post.y - 5, 3, 8);
    }
  }

  private drawLandingMarker(ctx: CanvasRenderingContext2D, x: number, depth: number): void {
    if (x < COURT_LEFT - 30 || x > COURT_RIGHT + 30) return;

    const point = projectCourtPosition(x, depth);
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(point.x - 4, point.y - 3);
    ctx.lineTo(point.x + 4, point.y + 3);
    ctx.moveTo(point.x + 4, point.y - 3);
    ctx.lineTo(point.x - 4, point.y + 3);
    ctx.stroke();
  }
}