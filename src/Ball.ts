import {
  BALL_RADIUS,
  FLOOR_Y,
  GRAVITY,
  AIR_RESISTANCE,
  BALL_BOUNCE,
  Team
} from './constants';

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

  constructor() {
    this.reset(100, 150);
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
    this.inPlay = false;
    this.isServed = false;
    this.lastHitTeam = null;
    this.lastHitPlayerId = null;
    this.touches[Team.PLAYER] = 0;
    this.touches[Team.CPU] = 0;
    this.hasBounced = false;
    this.bounceCount = 0;
  }

  public update(): void {
    if (!this.inPlay && !this.isServed) return;

    this.vy += this.gravity;
    this.vx *= AIR_RESISTANCE;

    this.x += this.vx;
    this.y += this.vy;
    this.depth += this.depthVelocity;
    this.depthVelocity *= AIR_RESISTANCE;
    this.framesSinceHit++;

    this.rotation += this.vx * 0.1;

    if (this.y + this.radius >= FLOOR_Y) {
      this.y = FLOOR_Y - this.radius;
      if (Math.abs(this.vy) > 1.2 && this.bounceCount < 4) {
        this.vy = -this.vy * BALL_BOUNCE;
        this.vx *= 0.75;
        this.hasBounced = true;
        this.bounceCount++;
      } else {
        this.vy = 0;
        this.vx = 0;
        this.hasBounced = true;
      }
    }
  }

  public hitReceive(toX: number, heightPeak: number, team: Team, playerId: number, toDepth: number = this.depth): void {
    const startX = this.x;
    const startY = this.y;
    const targetY = FLOOR_Y - 50;
    this.gravity = GRAVITY * 0.5;
    this.framesSinceHit = 0;

    const deltaYPeak = startY - heightPeak;
    const initialVy = -Math.sqrt(Math.max(8, 2 * this.gravity * Math.max(15, deltaYPeak)));
    const timeToPeak = -initialVy / this.gravity;
    const timeFromPeakToTarget = Math.sqrt(Math.max(1, 2 * (targetY - heightPeak) / this.gravity));
    const totalTime = Math.max(15, timeToPeak + timeFromPeakToTarget);

    const initialVx = (toX - startX) / totalTime;

    this.vx = initialVx;
    this.vy = initialVy;
    this.depthVelocity = (toDepth - this.depth) / totalTime;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.touches[team]++;
    const otherTeam = team === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.touches[otherTeam] = 0;
  }

  public hitToss(toX: number, tossHeight: number, team: Team, playerId: number, toDepth: number = this.depth): void {
    const deltaX = toX - this.x;
    const apexY = FLOOR_Y - tossHeight;
    this.gravity = GRAVITY * 0.5;
    this.framesSinceHit = 0;
    const initialVy = -Math.sqrt(2 * this.gravity * Math.max(15, this.y - apexY));
    const timeToApex = -initialVy / this.gravity;
    const targetY = FLOOR_Y - 45;
    const timeToTarget = Math.sqrt(2 * Math.max(10, targetY - apexY) / this.gravity);
    const totalTime = Math.max(15, timeToApex + timeToTarget);

    this.vx = deltaX / totalTime;
    this.vy = initialVy;
    this.depthVelocity = (toDepth - this.depth) / totalTime;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.touches[team]++;
  }

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

  public hitServe(targetX: number, targetDepth: number, team: Team, playerId: number, flightFrames: number = 60): void {
    const dragDistanceX = AIR_RESISTANCE * (1 - AIR_RESISTANCE ** flightFrames) / (1 - AIR_RESISTANCE);
    const dragDistanceDepth = (1 - AIR_RESISTANCE ** flightFrames) / (1 - AIR_RESISTANCE);
    const vx = (targetX - this.x) / dragDistanceX;
    const serveGravity = GRAVITY * 0.55;
    const vy = (FLOOR_Y - this.radius - this.y - serveGravity * flightFrames * (flightFrames + 1) / 2) / flightFrames;
    const depthVelocity = (targetDepth - this.depth) / dragDistanceDepth;

    this.hitSpike(vx, vy, team, playerId, depthVelocity);
    this.gravity = serveGravity;
  }

  public hitBlock(backToTeam: Team, playerId: number): void {
    this.gravity = GRAVITY;
    this.framesSinceHit = 0;
    const dir = backToTeam === Team.PLAYER ? -1 : 1;
    this.vx = dir * (1.5 + Math.random() * 1.5);
    this.vy = -1.5 - Math.random() * 2.0;
    this.depthVelocity *= -0.7;
    this.lastHitTeam = backToTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.lastHitPlayerId = playerId;
  }

  public getHeight(): number {
    return Math.max(0, FLOOR_Y - (this.y + this.radius));
  }
}