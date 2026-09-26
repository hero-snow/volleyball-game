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

  public role: 'setter' | 'spiker' | 'receiver' | 'server' = 'receiver';

  public animFrame: number = 0;
  public animTimer: number = 0;
  public stateTimer: number = 0;

  constructor(id: number, team: Team, homeX: number, role: 'setter' | 'spiker' | 'receiver' | 'server', depth: number = 0.5) {
    this.id = id;
    this.team = team;
    this.homeX = homeX;
    this.targetX = homeX;
    this.depth = depth;
    this.homeDepth = depth;
    this.x = homeX;
    this.y = FLOOR_Y - this.height;
    this.role = role;
    this.facing = team === Team.PLAYER ? 1 : -1;
  }

  public resetPosition(): void {
    this.x = this.homeX;
    this.depth = this.homeDepth;
    this.targetX = this.homeX;
    this.y = FLOOR_Y - this.height;
    this.depth = this.homeDepth;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.state = PlayerState.IDLE;
    this.facing = this.team === Team.PLAYER ? 1 : -1;
    this.stateTimer = 0;
  }

  public setServePosition(isServer: boolean): void {
    this.depth = this.homeDepth;
    if (isServer) {
      if (this.team === Team.PLAYER) {
        this.x = COURT_LEFT - 15;
        this.facing = 1;
      } else {
        this.x = COURT_RIGHT + 15;
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
    this.animTimer++;
    if (this.animTimer > 8) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer === 0) {
        if (this.isGrounded) {
          this.state = PlayerState.IDLE;
        }
      }
    }

    if (!this.isGrounded) {
      this.vy += GRAVITY;
      this.y += this.vy;

      if (this.y >= FLOOR_Y - this.height) {
        this.y = FLOOR_Y - this.height;
        this.vy = 0;
        this.isGrounded = true;
        if (this.state === PlayerState.JUMP || this.state === PlayerState.SPIKE || this.state === PlayerState.BLOCK) {
          this.state = PlayerState.IDLE;
        }
      }
    }

    this.x += this.vx;

    if (this.team === Team.PLAYER) {
      const minX = (this.state === PlayerState.SERVE_PREPARE || this.state === PlayerState.SERVE_TOSS) ? COURT_LEFT - 25 : COURT_LEFT - 10;
      const maxX = NET_X - this.width - 2;
      if (this.x < minX) this.x = minX;
      if (this.x > maxX) this.x = maxX;
    } else {
      const minX = NET_X + 2;
      const maxX = (this.state === PlayerState.SERVE_PREPARE || this.state === PlayerState.SERVE_TOSS) ? COURT_RIGHT + 25 : COURT_RIGHT + 10;
      if (this.x < minX) this.x = minX;
      if (this.x > maxX) this.x = maxX;
    }

    if (this.isGrounded) {
      if (Math.abs(this.vx) > 0.2) {
        if (this.state === PlayerState.IDLE) {
          this.state = PlayerState.RUN;
        }
      } else if (this.state === PlayerState.RUN) {
        this.state = PlayerState.IDLE;
      }
    }
  }

  public jump(impulse: number = JUMP_IMPULSE): boolean {
    if (this.isGrounded && this.state !== PlayerState.SERVE_PREPARE) {
      this.vy = impulse;
      this.isGrounded = false;
      this.state = PlayerState.JUMP;
      return true;
    }
    return false;
  }

  public move(dirX: number): void {
    if (this.state === PlayerState.SERVE_PREPARE) return;
    this.vx = dirX * PLAYER_SPEED;
    if (dirX !== 0) {
      this.facing = dirX > 0 ? 1 : -1;
    }
  }

  public moveDepth(dir: number): void {
    this.depth = Math.max(0, Math.min(1, this.depth + dir * 0.025));
  }

  public stop(): void {
    this.vx = 0;
  }

  public triggerSpike(): void {
    this.state = PlayerState.SPIKE;
    this.stateTimer = 18;
  }

  public triggerReceive(): void {
    this.state = PlayerState.RECEIVE;
    this.stateTimer = 22;
  }

  public triggerToss(): void {
    this.state = PlayerState.TOSS;
    this.stateTimer = 22;
  }

  public triggerBlock(): void {
    this.state = PlayerState.BLOCK;
    this.stateTimer = 25;
  }

  public triggerDive(dir: number): void {
    this.state = PlayerState.DIVE;
    this.stateTimer = 30;
    this.vx = dir * (PLAYER_SPEED * 1.8);
  }

  public setCelebrate(): void {
    this.state = PlayerState.CELEBRATE;
    this.stateTimer = 90;
    this.vx = 0;
  }

  public setDisappointed(): void {
    this.state = PlayerState.DISAPPOINTED;
    this.stateTimer = 90;
    this.vx = 0;
  }

  public getHandPos(): { x: number; y: number } {
    let offsetX = this.facing * 6;
    let offsetY = 8;

    if (this.state === PlayerState.SPIKE) {
      offsetY = -4;
      offsetX = this.facing * 8;
    } else if (this.state === PlayerState.BLOCK) {
      offsetY = -6;
      offsetX = this.facing * 4;
    } else if (this.state === PlayerState.TOSS) {
      offsetY = 0;
      offsetX = 0;
    } else if (this.state === PlayerState.RECEIVE) {
      offsetY = 18;
      offsetX = this.facing * 10;
    } else if (this.state === PlayerState.DIVE) {
      offsetY = 26;
      offsetX = this.facing * 14;
    }

    return {
      x: this.x + this.width / 2 + offsetX,
      y: this.y + offsetY
    };
  }
}