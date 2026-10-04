import {
  FLOOR_Y,
  GRAVITY,
  JUMP_IMPULSE,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PlayerState,
  Team,
  NET_X,
  COURT_LEFT,
  COURT_RIGHT
} from './constants';

export class Player {
  public id: number;
  public team: Team;
  public x: number;
  public y: number;
  public depth: number;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = PLAYER_WIDTH;
  public height: number = PLAYER_HEIGHT;
  public state: PlayerState = PlayerState.IDLE;
  public facing: number = 1;
  public isGrounded: boolean = true;
  public isControlled: boolean = false;

  public homeX: number;
  public homeDepth: number;
  public targetX: number;
  public jerseyNumber: number;

  public role: 'setter' | 'spiker' | 'receiver' | 'server' = 'receiver';

  public animTimer: number = 0;
  public animProgress: number = 0;
  public stateTimer: number = 0;
  public diveSpeed: number = 0;

  constructor(
    id: number,
    team: Team,
    homeX: number,
    role: 'setter' | 'spiker' | 'receiver' | 'server',
    depth: number = 0.5,
    jerseyNumber: number = 1
  ) {
    this.id = id;
    this.team = team;
    this.homeX = homeX;
    this.targetX = homeX;
    this.depth = depth;
    this.homeDepth = depth;
    this.x = homeX;
    this.y = FLOOR_Y - this.height;
    this.role = role;
    this.jerseyNumber = jerseyNumber;
    this.facing = team === Team.PLAYER ? 1 : -1;
  }

  public resetPosition(): void {
    this.x = this.homeX;
    this.depth = this.homeDepth;
    this.targetX = this.homeX;
    this.y = FLOOR_Y - this.height;
    this.vx = 0;
    this.vy = 0;
    this.diveSpeed = 0;
    this.isGrounded = true;
    this.state = PlayerState.IDLE;
    this.facing = this.team === Team.PLAYER ? 1 : -1;
    this.stateTimer = 0;
    this.animTimer = 0;
  }

  public setServePosition(isServer: boolean): void {
    this.depth = this.homeDepth;
    if (isServer) {
      if (this.team === Team.PLAYER) {
        this.x = COURT_LEFT - 25;
        this.facing = 1;
      } else {
        this.x = COURT_RIGHT + 25;
        this.facing = -1;
      }
      this.state = PlayerState.SERVE_PREPARE;
    } else {
      this.x = this.homeX;
      this.state = PlayerState.IDLE;
      this.facing = this.team === Team.PLAYER ? 1 : -1;
    }
    this.y = FLOOR_Y - this.height;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
  }

  public update(): void {
    this.animTimer += 0.08;
    this.animProgress += 0.12;

    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer === 0) {
        if (this.isGrounded) {
          this.state = PlayerState.IDLE;
        }
      }
    }

    // Diving motion along floor
    if (this.state === PlayerState.DIVE) {
      this.x += this.facing * this.diveSpeed;
      this.diveSpeed *= 0.88;
      if (this.diveSpeed < 0.3) {
        this.diveSpeed = 0;
      }
    }

    // Jump / airborne physics
    if (!this.isGrounded) {
      this.vy += GRAVITY;
      this.y += this.vy;
      this.x += this.vx * 0.85;

      if (this.y >= FLOOR_Y - this.height) {
        this.y = FLOOR_Y - this.height;
        this.vy = 0;
        this.isGrounded = true;
        if (this.state === PlayerState.JUMP || this.state === PlayerState.SPIKE || this.state === PlayerState.BLOCK) {
          this.state = PlayerState.IDLE;
          this.stateTimer = 12; // Brief landing recovery
        }
      }
    } else {
      // Horizontal motion on floor
      if (this.state !== PlayerState.DIVE) {
        this.x += this.vx;
        this.vx *= 0.78; // Smooth friction
      }
    }

    // Restrict within team court side
    const buffer = 15;
    if (this.team === Team.PLAYER) {
      this.x = Math.max(COURT_LEFT - 40, Math.min(NET_X - buffer, this.x));
    } else {
      this.x = Math.max(NET_X + buffer, Math.min(COURT_RIGHT + 40, this.x));
    }

    // Depth bounds
    this.depth = Math.max(0.1, Math.min(0.9, this.depth));
  }

  public moveAnalog(dirX: number, dirDepth: number, speedMultiplier: number = 1.0): void {
    if (!this.isGrounded || this.state === PlayerState.DIVE) return;

    const spd = PLAYER_SPEED * speedMultiplier;
    this.vx = dirX * spd;

    if (dirDepth !== 0) {
      this.depth += dirDepth * 0.014 * speedMultiplier;
      this.depth = Math.max(0.1, Math.min(0.9, this.depth));
    }

    if (Math.abs(dirX) > 0.1) {
      this.facing = dirX > 0 ? 1 : -1;
      if (this.state === PlayerState.IDLE) {
        this.state = PlayerState.RUN;
      }
    } else if (this.state === PlayerState.RUN) {
      this.state = PlayerState.IDLE;
    }
  }

  public jump(impulseMultiplier: number = 1.0): void {
    if (!this.isGrounded || this.state === PlayerState.DIVE) return;
    this.isGrounded = false;
    this.vy = JUMP_IMPULSE * impulseMultiplier;
    this.state = PlayerState.JUMP;
  }

  public triggerSpike(): void {
    if (this.isGrounded) {
      this.jump(1.05);
    }
    this.state = PlayerState.SPIKE;
    this.stateTimer = 22;
  }

  public triggerReceive(): void {
    if (!this.isGrounded) return;
    this.state = PlayerState.RECEIVE;
    this.stateTimer = 24;
    this.vx *= 0.3;
  }

  public triggerToss(): void {
    if (!this.isGrounded) return;
    this.state = PlayerState.TOSS;
    this.stateTimer = 22;
    this.vx *= 0.3;
  }

  public triggerBlock(): void {
    if (this.isGrounded) {
      this.jump(1.0);
    }
    this.state = PlayerState.BLOCK;
    this.stateTimer = 30;
  }

  public triggerDive(): void {
    if (!this.isGrounded || this.state === PlayerState.DIVE) return;
    this.state = PlayerState.DIVE;
    this.diveSpeed = PLAYER_SPEED * 1.6;
    this.stateTimer = 35;
  }

  public celebrate(): void {
    this.state = PlayerState.CELEBRATE;
    this.stateTimer = 90;
    this.vx = 0;
  }

  public disappointed(): void {
    this.state = PlayerState.DISAPPOINTED;
    this.stateTimer = 90;
    this.vx = 0;
  }

  public getHandPos(): { x: number; y: number } {
    const centerX = this.x + this.width / 2;
    const forwardX = centerX + this.facing * 14;

    switch (this.state) {
      case PlayerState.SPIKE:
        // High reach above head
        return { x: forwardX + 6, y: this.y - 12 };
      case PlayerState.BLOCK:
        // Directly overhead
        return { x: centerX + this.facing * 8, y: this.y - 14 };
      case PlayerState.TOSS:
        // Forehead level
        return { x: centerX + this.facing * 6, y: this.y + 4 };
      case PlayerState.RECEIVE:
        // Waist/knee platform
        return { x: forwardX, y: this.y + 26 };
      case PlayerState.DIVE:
        // Low along floor
        return { x: centerX + this.facing * 24, y: this.y + 46 };
      default:
        return { x: forwardX, y: this.y + 20 };
    }
  }

  public getJumpHeight(): number {
    return Math.max(0, FLOOR_Y - this.height - this.y);
  }
}