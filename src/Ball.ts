import {
  Vec2,
  BALL_RADIUS,
  BALL_GRAVITY,
  BALL_MAX_SPEED,
  BALL_BOUNCE,
  COURT_FLOOR_Y,
  COURT_LEFT,
  COURT_RIGHT,
  NET_X,
  NET_TOP_Y,
  NET_WIDTH,
  COLORS
} from './constants';

export class Ball {
  public pos: Vec2;
  public vel: Vec2;
  public radius: number = BALL_RADIUS;
  public rotation: number = 0;
  public spin: number = 0;
  public isSpiked: boolean = false;
  public trail: Vec2[] = [];

  constructor(x: number = 200, y: number = 200) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
  }

  public reset(x: number, y: number): void {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.rotation = 0;
    this.spin = 0;
    this.isSpiked = false;
    this.trail = [];
  }

  public update(): void {
    // Record trail positions for fast ball effect
    if (this.isSpiked || Math.hypot(this.vel.x, this.vel.y) > 8) {
      this.trail.unshift({ ...this.pos });
      if (this.trail.length > 5) {
        this.trail.pop();
      }
    } else {
      this.trail = [];
    }

    // Update velocity & gravity
    this.vel.y += BALL_GRAVITY;

    // Cap velocity
    const currentSpeed = Math.hypot(this.vel.x, this.vel.y);
    if (currentSpeed > BALL_MAX_SPEED) {
      this.vel.x = (this.vel.x / currentSpeed) * BALL_MAX_SPEED;
      this.vel.y = (this.vel.y / currentSpeed) * BALL_MAX_SPEED;
    }

    // Update position
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    // Update spin rotation
    this.rotation += this.spin || (this.vel.x * 0.08);

    // Floor collision
    if (this.pos.y >= COURT_FLOOR_Y - this.radius) {
      this.pos.y = COURT_FLOOR_Y - this.radius;
      if (Math.abs(this.vel.y) > 1.5) {
        this.vel.y = -this.vel.y * BALL_BOUNCE;
        this.vel.x *= 0.8; // Friction
      } else {
        this.vel.y = 0;
        this.vel.x *= 0.9;
      }
      this.isSpiked = false;
    }

    // Net collision (simple bounding box around net top / tape)
    const netLeft = NET_X - NET_WIDTH / 2 - this.radius;
    const netRight = NET_X + NET_WIDTH / 2 + this.radius;

    if (
      this.pos.x > netLeft &&
      this.pos.x < netRight &&
      this.pos.y > NET_TOP_Y - this.radius &&
      this.pos.y < COURT_FLOOR_Y
    ) {
      // Hit top edge of net (tape bounce)
      if (Math.abs(this.pos.y - NET_TOP_Y) < 10) {
        this.vel.y = -Math.abs(this.vel.y) * 0.5 - 2;
        this.pos.y = NET_TOP_Y - this.radius;
      } else {
        // Hit side of net
        if (this.pos.x < NET_X) {
          this.pos.x = netLeft;
          this.vel.x = -Math.abs(this.vel.x) * 0.5;
        } else {
          this.pos.x = netRight;
          this.vel.x = Math.abs(this.vel.x) * 0.5;
        }
      }
      this.isSpiked = false;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    // 1. Draw Drop Shadow
    const shadowY = COURT_FLOOR_Y;
    const heightDiff = shadowY - this.pos.y;
    const shadowScale = Math.max(0.3, 1 - heightDiff / 350);
    const shadowAlpha = Math.max(0.1, 0.4 - heightDiff / 600);

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(
      this.pos.x,
      shadowY,
      this.radius * 1.2 * shadowScale,
      this.radius * 0.4 * shadowScale,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // 2. Draw Spike Trail Effect
    if (this.trail.length > 0) {
      this.trail.forEach((p, idx) => {
        const alpha = (1 - idx / this.trail.length) * 0.4;
        const r = this.radius * (1 - idx * 0.12);
        ctx.fillStyle = `rgba(255, 220, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 3. Draw Ball (Yellow & Blue Tricolor Retro Volleyball)
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.rotation);

    // Ball Base
    ctx.fillStyle = COLORS.ballYellow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball Curved Stripes (Blue & White)
    ctx.strokeStyle = COLORS.ballBlue;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 0.8);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, Math.PI, Math.PI * 1.8);
    ctx.stroke();

    ctx.strokeStyle = COLORS.ballWhite;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Outer Border Line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
