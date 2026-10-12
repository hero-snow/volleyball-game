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

export interface SlotConfig {
  x: number;
  depth: number;
  role: 'setter' | 'spiker' | 'receiver' | 'server';
  isFrontLine: boolean;
}

export function getSlotConfig(slot: number, team: Team): SlotConfig {
  const isPlayer = team === Team.PLAYER;
  // Volleyball 6-player rotation slots:
  // Slot 1: Back-Right (Server)
  // Slot 2: Front-Right (Attacker / Blocker)
  // Slot 3: Front-Center (Setter / Middle)
  // Slot 4: Front-Left (Attacker / Blocker)
  // Slot 5: Back-Left (Receiver)
  // Slot 6: Back-Center (Receiver / Libero)
  if (isPlayer) {
    switch (slot) {
      case 1:
        return { x: 230, depth: 0.78, role: 'server', isFrontLine: false };
      case 2:
        return { x: 380, depth: 0.78, role: 'spiker', isFrontLine: true };
      case 3:
        return { x: 410, depth: 0.50, role: 'setter', isFrontLine: true };
      case 4:
        return { x: 380, depth: 0.22, role: 'spiker', isFrontLine: true };
      case 5:
        return { x: 230, depth: 0.22, role: 'receiver', isFrontLine: false };
      case 6:
        return { x: 175, depth: 0.50, role: 'receiver', isFrontLine: false };
      default:
        return { x: 230, depth: 0.50, role: 'receiver', isFrontLine: false };
    }
  } else {
    // CPU Team (mirrored across net at NET_X = 480)
    switch (slot) {
      case 1:
        return { x: 730, depth: 0.22, role: 'server', isFrontLine: false };
      case 2:
        return { x: 580, depth: 0.22, role: 'spiker', isFrontLine: true };
      case 3:
        return { x: 550, depth: 0.50, role: 'setter', isFrontLine: true };
      case 4:
        return { x: 580, depth: 0.78, role: 'spiker', isFrontLine: true };
      case 5:
        return { x: 730, depth: 0.78, role: 'receiver', isFrontLine: false };
      case 6:
        return { x: 785, depth: 0.50, role: 'receiver', isFrontLine: false };
      default:
        return { x: 730, depth: 0.50, role: 'receiver', isFrontLine: false };
    }
  }
}

export class Player {
  public id: number;
  public team: Team;
  public slot: number = 1;
  public isFrontLine: boolean = false;
  public x: number = 0;
  public y: number = 0;
  public depth: number = 0.5;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = PLAYER_WIDTH;
  public height: number = PLAYER_HEIGHT;
  public state: PlayerState = PlayerState.IDLE;
  public facing: number = 1;
  public isGrounded: boolean = true;
  public isControlled: boolean = false;

  public homeX: number = 0;
  public homeDepth: number = 0.5;
  public targetX: number = 0;
  public jerseyNumber: number;

  public role: 'setter' | 'spiker' | 'receiver' | 'server' = 'receiver';

  public animTimer: number = 0;
  public animProgress: number = 0;
  public stateTimer: number = 0;
  public diveSpeed: number = 0;

  constructor(
    id: number,
    team: Team,
    slot: number = 1,
    jerseyNumber: number = 1
  ) {
    this.id = id;
    this.team = team;
    this.jerseyNumber = jerseyNumber;
    this.facing = team === Team.PLAYER ? 1 : -1;
    this.applySlot(slot);
    this.x = this.homeX;
    this.depth = this.homeDepth;
    this.y = FLOOR_Y - this.height;
  }

  public applySlot(slot: number): void {
    this.slot = slot;
    const config = getSlotConfig(slot, this.team);
    this.homeX = config.x;
    this.homeDepth = config.depth;
    this.role = config.role;
    this.isFrontLine = config.isFrontLine;
    this.targetX = config.x;
  }

  public rotateClockwise(): void {
    // Rotation: 1 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1
    const nextSlot = this.slot === 1 ? 6 : this.slot - 1;
    this.applySlot(nextSlot);
    this.resetPosition();
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
      this.jump(1.15); // Powerful full jump for attack
    }
    this.state = PlayerState.SPIKE;
    this.stateTimer = 45; // Maintain spike state through peak airborne phase
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
        // High reach above head - wide reach upward
        return { x: forwardX + 8, y: this.y - 18 };
      case PlayerState.BLOCK:
        // Directly overhead
        return { x: centerX + this.facing * 8, y: this.y - 14 };
      case PlayerState.JUMP:
        // Airborne preparation reach
        return { x: forwardX + 6, y: this.y - 12 };
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