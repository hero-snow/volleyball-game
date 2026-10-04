import {
  BALL_RADIUS,
  FLOOR_Y,
  GRAVITY,
  AIR_RESISTANCE,
  BALL_BOUNCE,
  Team,
  NET_X
} from './constants';

export interface BallTrailPoint {
  x: number;
  y: number;
  depth: number;
  alpha: number;
}

export class Ball {
  public x: number = 0;
  public y: number = 0;
  public depth: number = 0.5;
  public depthVelocity: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public gravity: number = GRAVITY;
  public framesSinceHit: number = 0;
  public radius: number = BALL_RADIUS;
  public rotation: number = 0;
  public speed: number = 0;

  public inPlay: boolean = false;
  public isServed: boolean = false;
  public lastHitTeam: Team | null = null;
  public lastHitPlayerId: number | null = null;
  public touches: { [key in Team]: number } = {
    [Team.PLAYER]: 0,
    [Team.CPU]: 0
  };

  public hasBounced: boolean = false;
  public bounceCount: number = 0;
  public trail: BallTrailPoint[] = [];

  constructor() {
    this.reset(200, 300);
  }

  public reset(x: number, y: number, depth: number = 0.5): void {
    this.x = x;
    this.y = y;
    this.depth = depth;
    this.depthVelocity = 0;
    this.vx = 0;
    this.vy = 0;
    this.gravity = GRAVITY;
    this.framesSinceHit = 0;
    this.rotation = 0;
    this.speed = 0;
    this.inPlay = false;
    this.isServed = false;
    this.lastHitTeam = null;
    this.lastHitPlayerId = null;
    this.touches[Team.PLAYER] = 0;
    this.touches[Team.CPU] = 0;
    this.hasBounced = false;
    this.bounceCount = 0;
    this.trail = [];
  }

  public update(): void {
    if (!this.inPlay && !this.isServed) return;

    this.vy += this.gravity;
    this.vx *= AIR_RESISTANCE;

    this.x += this.vx;
    this.y += this.vy;
    this.depth += this.depthVelocity;
    this.depth = Math.max(0.05, Math.min(0.95, this.depth));
    this.depthVelocity *= 0.98;
    this.framesSinceHit++;

    this.speed = Math.hypot(this.vx, this.vy);
    this.rotation += this.vx * 0.08 + (this.vy > 0 ? 0.04 : -0.04);

    // Record motion trail for high speed shots
    if (this.speed > 5.5) {
      this.trail.unshift({
        x: this.x,
        y: this.y,
        depth: this.depth,
        alpha: Math.min(1.0, (this.speed - 5.5) / 6.0)
      });
      if (this.trail.length > 7) {
        this.trail.pop();
      }
    } else if (this.trail.length > 0) {
      this.trail.pop();
    }

    // Floor collision
    if (this.y + this.radius >= FLOOR_Y) {
      this.y = FLOOR_Y - this.radius;
      if (Math.abs(this.vy) > 1.8 && this.bounceCount < 3) {
        this.vy = -this.vy * BALL_BOUNCE;
        this.vx *= 0.72;
        this.hasBounced = true;
        this.bounceCount++;
      } else {
        this.vy = 0;
        this.vx = 0;
        this.hasBounced = true;
      }
    }
  }

  // 1st Touch: Receive (passes smoothly to the setter zone near the net)
  public hitReceive(toX: number, team: Team, playerId: number, toDepth: number = 0.5): void {
    const startX = this.x;
    const startY = this.y;
    const targetY = FLOOR_Y - 140; // High arc above the floor
    this.gravity = GRAVITY * 0.78;
    this.framesSinceHit = 0;

    const apexY = Math.min(startY - 90, FLOOR_Y - 260);
    const initialVy = -Math.sqrt(Math.max(16, 2 * this.gravity * Math.max(25, startY - apexY)));
    const timeToApex = -initialVy / this.gravity;
    const timeToTarget = Math.sqrt(Math.max(1, 2 * (targetY - apexY) / this.gravity));
    const totalTime = Math.max(28, timeToApex + timeToTarget);

    this.vx = (toX - startX) / totalTime;
    this.vy = initialVy;
    this.depthVelocity = (toDepth - this.depth) / totalTime;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.touches[team]++;
    const otherTeam = team === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.touches[otherTeam] = 0;
  }

  // 2nd Touch: Toss/Set (lofted high near the net for an explosive spike)
  public hitToss(toX: number, team: Team, playerId: number, toDepth: number = 0.5): void {
    const deltaX = toX - this.x;
    const apexY = FLOOR_Y - 280; // High majestic toss
    this.gravity = GRAVITY * 0.8;
    this.framesSinceHit = 0;

    const initialVy = -Math.sqrt(2 * this.gravity * Math.max(30, this.y - apexY));
    const timeToApex = -initialVy / this.gravity;
    const targetY = FLOOR_Y - 120;
    const timeToTarget = Math.sqrt(2 * Math.max(15, targetY - apexY) / this.gravity);
    const totalTime = Math.max(32, timeToApex + timeToTarget);

    this.vx = deltaX / totalTime;
    this.vy = initialVy;
    this.depthVelocity = (toDepth - this.depth) / totalTime;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.touches[team]++;
  }

  // 3rd Touch: Spike (explosive smash downward)
  public hitSpike(vx: number, vy: number, team: Team, playerId: number, depthVelocity: number = 0): void {
    this.vx = vx;
    this.vy = vy;
    this.gravity = GRAVITY;
    this.framesSinceHit = 0;
    this.depthVelocity = depthVelocity;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.touches[team]++;
    const otherTeam = team === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.touches[otherTeam] = 0;
  }

  // Serve Hit
  public hitServe(targetX: number, targetDepth: number, team: Team, playerId: number, flightFrames: number = 55): void {
    const startX = this.x;
    const startY = this.y;
    this.gravity = GRAVITY * 0.82;
    this.framesSinceHit = 0;

    // Loft over the net
    const netClearanceY = FLOOR_Y - 180;
    const apexY = Math.min(startY - 40, netClearanceY);
    const vy = -Math.sqrt(Math.max(12, 2 * this.gravity * Math.max(20, startY - apexY)));
    const totalTime = flightFrames;

    this.vx = (targetX - startX) / totalTime;
    this.vy = vy;
    this.depthVelocity = (targetDepth - this.depth) / totalTime;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.touches[team]++;
    const otherTeam = team === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.touches[otherTeam] = 0;
  }

  // Defensive Block
  public hitBlock(backToTeam: Team, playerId: number): void {
    this.gravity = GRAVITY;
    this.framesSinceHit = 0;
    const dir = backToTeam === Team.PLAYER ? -1 : 1;
    this.vx = dir * (2.8 + Math.random() * 2.2);
    this.vy = 2.0 + Math.random() * 2.5; // Steeper downward bounce
    this.depthVelocity = (Math.random() - 0.5) * 0.02;
    this.lastHitTeam = backToTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.lastHitPlayerId = playerId;
  }

  public getHeight(): number {
    return Math.max(0, FLOOR_Y - (this.y + this.radius));
  }
}