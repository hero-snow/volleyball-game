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
  MODERN_PALETTE,
  projectCourtPosition
} from './constants';

export class Court {
  private stadiumImage: HTMLImageElement | null = null;
  private flashAlpha: number = 0;
  private bannerOffset: number = 0;

  constructor() {
    this.initStadiumImage();
  }

  private initStadiumImage(): void {
    const img = new Image();
    img.src = '/src/assets/images/volleyball_arena_stadium_1791120464495.jpg';
    img.onload = () => {
      this.stadiumImage = img;
    };
  }

  public triggerFlash(): void {
    this.flashAlpha = 0.45;
  }

  public update(): void {
    this.bannerOffset += 0.5;
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - 0.05);
    }
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    landingX: number | null = null,
    landingDepth: number = 0.5,
    landingFrames: number = 0
  ): void {
    // 1. Stadium Backdrop (Arena crowd, rafters, floodlights)
    this.drawArenaBackdrop(ctx);

    // 2. Parquet Floor & Modern Court Zone
    this.drawParquetFloor(ctx);

    // 3. Court Lines & 3m Attack Lines
    this.drawCourtLines(ctx);

    // 4. Landing Target Reticle
    if (landingX !== null) {
      this.drawLandingTarget(ctx, landingX, landingDepth, landingFrames);
    }

    // 5. Modern Volleyball Net & Antennae
    this.drawNet(ctx);

    // 6. Camera Flash Overlay
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
    }
  }

  private drawArenaBackdrop(ctx: CanvasRenderingContext2D): void {
    const arenaHeight = 310;

    if (this.stadiumImage && this.stadiumImage.complete) {
      ctx.save();
      ctx.drawImage(this.stadiumImage, 0, -20, CANVAS_WIDTH, arenaHeight + 40);
      // Dark gradient overlay for visual depth and contrast
      const grad = ctx.createLinearGradient(0, 0, 0, arenaHeight);
      grad.addColorStop(0, 'rgba(11, 17, 30, 0.4)');
      grad.addColorStop(0.7, 'rgba(11, 17, 30, 0.25)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, arenaHeight);
      ctx.restore();
    } else {
      // Modern procedural arena backdrop fallback
      const bgGrad = ctx.createLinearGradient(0, 0, 0, arenaHeight);
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(0.6, '#151d30');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, arenaHeight);

      // Arena floodlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH * 0.2, 50, 160, 0, Math.PI * 2);
      ctx.arc(CANVAS_WIDTH * 0.8, 50, 160, 0, Math.PI * 2);
      ctx.fill();
    }

    // LED Ribbon Banner along the wall
    this.drawLedBanner(ctx);
  }

  private drawLedBanner(ctx: CanvasRenderingContext2D): void {
    const bannerY = 240;
    const bannerH = 26;

    ctx.save();
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, bannerY, CANVAS_WIDTH, bannerH);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, bannerY, CANVAS_WIDTH, bannerH);

    // Scrolling text in LED banner
    ctx.font = '700 11px "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const text = '★ NEO VOLLEYBALL GRAND SLAM ★ WORLD ARCADE CHAMPIONSHIP ★ POWER SPIKE ★ MONSTER BLOCK ★ ';
    const textWidth = ctx.measureText(text).width;
    const scrollX = -(this.bannerOffset % textWidth);

    for (let x = scrollX; x < CANVAS_WIDTH + textWidth; x += textWidth) {
      ctx.fillText(text, x, bannerY + bannerH / 2);
    }

    ctx.restore();
  }

  private drawParquetFloor(ctx: CanvasRenderingContext2D): void {
    const floorTop = 260;
    const floorH = CANVAS_HEIGHT - floorTop;

    ctx.save();
    // Warm hardwood floor base
    const floorGrad = ctx.createLinearGradient(0, floorTop, 0, CANVAS_HEIGHT);
    floorGrad.addColorStop(0, '#c7782b');
    floorGrad.addColorStop(0.5, '#e08f36');
    floorGrad.addColorStop(1, '#ad621f');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorTop, CANVAS_WIDTH, floorH);

    // Draw perspective court playing polygon (Electric Blue International Court)
    const p1 = projectCourtPosition(COURT_LEFT, 0.0);
    const p2 = projectCourtPosition(COURT_RIGHT, 0.0);
    const p3 = projectCourtPosition(COURT_RIGHT, 1.0);
    const p4 = projectCourtPosition(COURT_LEFT, 1.0);

    // Outer border apron (Sunset Orange)
    const b1 = projectCourtPosition(COURT_LEFT - 60, -0.15);
    const b2 = projectCourtPosition(COURT_RIGHT + 60, -0.15);
    const b3 = projectCourtPosition(COURT_RIGHT + 60, 1.15);
    const b4 = projectCourtPosition(COURT_LEFT - 60, 1.15);

    ctx.fillStyle = 'rgba(234, 88, 12, 0.85)'; // Orange apron
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.lineTo(b4.x, b4.y);
    ctx.closePath();
    ctx.fill();

    // Inner court surface (Electric Blue)
    const courtGrad = ctx.createLinearGradient(0, p1.y, 0, p3.y);
    courtGrad.addColorStop(0, '#1d4ed8');
    courtGrad.addColorStop(0.5, '#2563eb');
    courtGrad.addColorStop(1, '#1e40af');

    ctx.fillStyle = courtGrad;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();

    // Polished floor gloss reflection sheen
    const sheen = ctx.createLinearGradient(CANVAS_WIDTH * 0.2, p1.y, CANVAS_WIDTH * 0.8, p3.y);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = sheen;
    ctx.fill();

    ctx.restore();
  }

  private drawCourtLines(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    const p1 = projectCourtPosition(COURT_LEFT, 0.0);
    const p2 = projectCourtPosition(COURT_RIGHT, 0.0);
    const p3 = projectCourtPosition(COURT_RIGHT, 1.0);
    const p4 = projectCourtPosition(COURT_LEFT, 1.0);

    // Court Perimeter Line
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.stroke();

    // Center Line under the net
    const c1 = projectCourtPosition(NET_X, 0.0);
    const c2 = projectCourtPosition(NET_X, 1.0);
    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.stroke();

    // Attack Lines (3m Line in glowing gold)
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.9)';
    ctx.lineWidth = 2.5;

    // Player Attack Line
    const pa1 = projectCourtPosition(PLAYER_ATTACK_X, 0.0);
    const pa2 = projectCourtPosition(PLAYER_ATTACK_X, 1.0);
    ctx.beginPath();
    ctx.moveTo(pa1.x, pa1.y);
    ctx.lineTo(pa2.x, pa2.y);
    ctx.stroke();

    // CPU Attack Line
    const ca1 = projectCourtPosition(CPU_ATTACK_X, 0.0);
    const ca2 = projectCourtPosition(CPU_ATTACK_X, 1.0);
    ctx.beginPath();
    ctx.moveTo(ca1.x, ca1.y);
    ctx.lineTo(ca2.x, ca2.y);
    ctx.stroke();

    ctx.restore();
  }

  private drawLandingTarget(
    ctx: CanvasRenderingContext2D,
    landingX: number,
    landingDepth: number,
    framesLeft: number
  ): void {
    const pt = projectCourtPosition(landingX, landingDepth);
    const isPlayerSide = landingX < NET_X;
    const color = isPlayerSide ? '#38bdf8' : '#f43f5e';

    ctx.save();
    // Inner pulse dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Ground target ellipse
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, 16, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Shrinking timing ring (contracts toward the center as framesLeft -> 0)
    const shrinkRadius = Math.max(16, Math.min(75, 16 + framesLeft * 1.4));
    ctx.strokeStyle = `rgba(${isPlayerSide ? '56, 189, 248' : '244, 63, 94'}, ${Math.max(0.2, 1 - framesLeft / 80)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, shrinkRadius, shrinkRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawNet(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const netDepthFar = 0.0;
    const netDepthNear = 1.0;

    const postFar = projectCourtPosition(NET_X, netDepthFar, 0);
    const postNear = projectCourtPosition(NET_X, netDepthNear, 0);
    const netTopFar = projectCourtPosition(NET_X, netDepthFar, NET_HEIGHT);
    const netTopNear = projectCourtPosition(NET_X, netDepthNear, NET_HEIGHT);
    const netBottomFar = projectCourtPosition(NET_X, netDepthFar, NET_HEIGHT * 0.35);
    const netBottomNear = projectCourtPosition(NET_X, netDepthNear, NET_HEIGHT * 0.35);

    // Far Post (Steel upright)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(postFar.x, postFar.y);
    ctx.lineTo(netTopFar.x, netTopFar.y - 10);
    ctx.stroke();

    // Near Post with safety padding
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(postNear.x, postNear.y);
    ctx.lineTo(netTopNear.x, netTopNear.y - 12);
    ctx.stroke();

    // Net Mesh Polygon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(netTopFar.x, netTopFar.y);
    ctx.lineTo(netTopNear.x, netTopNear.y);
    ctx.lineTo(netBottomNear.x, netBottomNear.y);
    ctx.lineTo(netBottomFar.x, netBottomFar.y);
    ctx.closePath();
    ctx.fill();

    // Net Grid Lines (Vertical & Horizontal cords)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;

    // Horizontal cords
    for (let r = 0.2; r <= 0.8; r += 0.2) {
      const y1 = netTopFar.y + (netBottomFar.y - netTopFar.y) * r;
      const y2 = netTopNear.y + (netBottomNear.y - netTopNear.y) * r;
      ctx.beginPath();
      ctx.moveTo(netTopFar.x, y1);
      ctx.lineTo(netTopNear.x, y2);
      ctx.stroke();
    }

    // Vertical cords
    for (let c = 0.1; c <= 0.9; c += 0.1) {
      const topX = netTopFar.x + (netTopNear.x - netTopFar.x) * c;
      const topY = netTopFar.y + (netTopNear.y - netTopFar.y) * c;
      const botX = netBottomFar.x + (netBottomNear.x - netBottomFar.x) * c;
      const botY = netBottomFar.y + (netBottomNear.y - netBottomFar.y) * c;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(botX, botY);
      ctx.stroke();
    }

    // Net Top White & Red Band (Official Olympic Tape)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(netTopFar.x, netTopFar.y);
    ctx.lineTo(netTopNear.x, netTopNear.y);
    ctx.stroke();

    // Antennae (Red/White striped rods at the court boundaries)
    this.drawAntenna(ctx, projectCourtPosition(NET_X, 0.05, NET_HEIGHT));
    this.drawAntenna(ctx, projectCourtPosition(NET_X, 0.95, NET_HEIGHT));

    ctx.restore();
  }

  private drawAntenna(ctx: CanvasRenderingContext2D, basePt: { x: number; y: number }): void {
    const rodHeight = 35;
    ctx.save();
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = i % 2 === 0 ? '#ef4444' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(basePt.x, basePt.y - i * (rodHeight / 5));
      ctx.lineTo(basePt.x, basePt.y - (i + 1) * (rodHeight / 5));
      ctx.stroke();
    }
    ctx.restore();
  }
}