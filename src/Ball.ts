import {
  BALL_RADIUS,
  FLOOR_Y,
  GRAVITY,
  AIR_RESISTANCE,
  BALL_BOUNCE,
  Team,
  NET_X,
  NET_TOP_Y
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
  public lastHitPlayerLeftContact: boolean = false;
  public touches: { [key in Team]: number } = {
    [Team.PLAYER]: 0,
    [Team.CPU]: 0
  };

  public hasBounced: boolean = false;
  public bounceCount: number = 0;
  public trail: BallTrailPoint[] = [];
  public netHitCooldown: number = 0;
  public lastHitIsBlock: boolean = false;

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
    this.lastHitPlayerLeftContact = false;
    this.lastHitIsBlock = false;
    this.touches[Team.PLAYER] = 0;
    this.touches[Team.CPU] = 0;
    this.hasBounced = false;
    this.bounceCount = 0;
    this.trail = [];
    this.netHitCooldown = 0;
  }

  private prepareForHit(): void {
    this.hasBounced = false;
    this.bounceCount = 0;
    this.lastHitPlayerLeftContact = false;
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
    if (this.netHitCooldown > 0) {
      this.netHitCooldown--;
    }

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
    this.prepareForHit();
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
    this.lastHitIsBlock = false;
    this.touches[team]++;
    const otherTeam = team === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.touches[otherTeam] = 0;
    this.isServed = false;
  }

  // 2nd Touch: Toss/Set (lofted beautifully near the net with optimal hangtime for spiking)
  public hitToss(toX: number, team: Team, playerId: number, toDepth: number = 0.5): void {
    const deltaX = toX - this.x;
    this.prepareForHit();
    // Apex at ideal spike strike zone (approx 80px above net top tape: 430 - 215 = 215)
    const apexY = FLOOR_Y - 215;
    // Lower effective gravity during toss gives satisfying float and reaction window
    this.gravity = GRAVITY * 0.62;
    this.framesSinceHit = 0;

    const initialVy = -Math.sqrt(2 * this.gravity * Math.max(25, this.y - apexY));
    const timeToApex = -initialVy / this.gravity;
    const targetY = FLOOR_Y - 135;
    const timeToTarget = Math.sqrt(2 * Math.max(15, targetY - apexY) / this.gravity);
    // 44+ frames provides ~0.75s for the spiker to run up and jump
    const totalTime = Math.max(44, timeToApex + timeToTarget);

    this.vx = deltaX / totalTime;
    this.vy = initialVy;
    this.depthVelocity = (toDepth - this.depth) / totalTime;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.lastHitIsBlock = false;
    this.touches[team]++;
  }

  // 3rd Touch: Spike (explosive smash downward with net clearance)
  public hitSpike(vx: number, vy: number, team: Team, playerId: number, depthVelocity: number = 0): void {
    this.prepareForHit();
    this.vx = vx;
    this.vy = vy;
    this.gravity = GRAVITY;
    this.framesSinceHit = 0;
    this.depthVelocity = depthVelocity;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.lastHitIsBlock = false;
    this.touches[team]++;
    const otherTeam = team === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.touches[otherTeam] = 0;

    // Ensure spike trajectory clears the net tape (NET_TOP_Y) before angling downward
    const isPlayer = team === Team.PLAYER;
    const distToNet = isPlayer ? (NET_X - this.x) : (this.x - NET_X);
    const speedX = Math.abs(this.vx);

    if (distToNet > 0 && speedX > 0.1) {
      const framesToNet = distToNet / speedX;
      // Net safety margin: 16px above net top tape
      const targetNetY = NET_TOP_Y - 16;
      // Projected Y when ball reaches the net plane: yNet = y + vy * t + 0.5 * g * t^2
      const projectedNetY = this.y + this.vy * framesToNet + 0.5 * this.gravity * framesToNet * framesToNet;

      if (projectedNetY >= targetNetY) {
        // Trajectory would clip or hit the net. Cap vertical velocity so it clears the net cleanly.
        const maxSafeVy = (targetNetY - this.y - 0.5 * this.gravity * framesToNet * framesToNet) / framesToNet;
        this.vy = Math.min(this.vy, maxSafeVy);
      }
    }
  }

  // 3rd Touch or Free Ball: Lofted return safely over net to opponent court
  public hitOver(targetX: number, team: Team, playerId: number, targetDepth: number = 0.5): void {
    const startX = this.x;
    const startY = this.y;
    this.prepareForHit();
    this.gravity = GRAVITY * 0.85;
    this.framesSinceHit = 0;

    // High arc to clear net comfortably
    const netApexY = FLOOR_Y - 170;
    const apexY = Math.min(startY - 50, netApexY);
    const initialVy = -Math.sqrt(Math.max(14, 2 * this.gravity * Math.max(20, startY - apexY)));
    const timeToApex = -initialVy / this.gravity;
    const targetY = FLOOR_Y - 100;
    const timeToTarget = Math.sqrt(Math.max(1, 2 * (targetY - apexY) / this.gravity));
    const totalTime = Math.max(38, timeToApex + timeToTarget);

    this.vx = (targetX - startX) / totalTime;
    this.vy = initialVy;
    this.depthVelocity = (targetDepth - this.depth) / totalTime;
    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.lastHitIsBlock = false;
    this.touches[team]++;
    const otherTeam = team === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.touches[otherTeam] = 0;
  }

  // Serve Hit: Guaranteed to arc cleanly over the net
  public hitServe(targetX: number, targetDepth: number, team: Team, playerId: number, flightFrames: number = 55): void {
    const startX = this.x;
    const startY = this.y;
    this.prepareForHit();
    this.gravity = GRAVITY * 0.82;
    this.framesSinceHit = 0;

    const landingY = FLOOR_Y - this.radius + 1;
    const horizontalDistance = targetX - startX;
    const netLeft = NET_X - this.radius;
    const netRight = NET_X + this.radius;
    let trajectoryFound = false;

    for (let totalTime = Math.max(1, Math.ceil(flightFrames)); totalTime <= 180; totalTime++) {
      const horizontalFactor = AIR_RESISTANCE *
        (1 - AIR_RESISTANCE ** totalTime) / (1 - AIR_RESISTANCE);
      const candidateVx = horizontalDistance / horizontalFactor;
      const depthFactor = 0.98 * (1 - 0.98 ** totalTime) / (1 - 0.98);
      const candidateDepthVelocity = (targetDepth - this.depth) / depthFactor;
      const candidateVy = (
        landingY - startY - this.gravity * totalTime * (totalTime + 1) / 2
      ) / totalTime;
      let clearsNet = true;

      for (let frame = 1; frame <= totalTime; frame++) {
        const x = startX + candidateVx * AIR_RESISTANCE *
          (1 - AIR_RESISTANCE ** frame) / (1 - AIR_RESISTANCE);
        const y = startY + frame * candidateVy + this.gravity * frame * (frame + 1) / 2;

        if (frame < totalTime && y + this.radius >= FLOOR_Y) {
          clearsNet = false;
          break;
        }
        if (
          x + this.radius >= netLeft &&
          x - this.radius <= netRight &&
          y >= NET_TOP_Y - this.radius - 6
        ) {
          clearsNet = false;
          break;
        }
      }

      if (clearsNet) {
        this.vx = candidateVx;
        this.vy = candidateVy;
        this.depthVelocity = candidateDepthVelocity;
        trajectoryFound = true;
        break;
      }
    }

    if (!trajectoryFound) {
      throw new Error('Could not calculate a serve trajectory that clears the net.');
    }

    this.lastHitTeam = team;
    this.lastHitPlayerId = playerId;
    this.lastHitIsBlock = false;
    this.touches[team]++;
    const otherTeam = team === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.touches[otherTeam] = 0;
  }

  // Defensive Block
  public hitBlock(backToTeam: Team, playerId: number): void {
    this.prepareForHit();
    this.gravity = GRAVITY;
    this.framesSinceHit = 0;
    const dir = backToTeam === Team.PLAYER ? -1 : 1;
    this.vx = dir * (2.8 + Math.random() * 2.2);
    this.vy = 2.0 + Math.random() * 2.5; // Steeper downward bounce
    this.depthVelocity = (Math.random() - 0.5) * 0.02;
    this.lastHitTeam = backToTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
    this.lastHitPlayerId = playerId;
    this.lastHitIsBlock = true;
  }

  public getHeight(): number {
    return Math.max(0, FLOOR_Y - (this.y + this.radius));
  }
}