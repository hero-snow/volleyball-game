import {
  Vec2,
  TeamSide,
  PlayerState,
  PlayerRole,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_JUMP_POWER,
  GRAVITY,
  COURT_FLOOR_Y,
  HIT_COOLDOWN,
  COLORS,
  getTeamBounds
} from './constants';

export class Player {
  public id: number;
  public teamSide: TeamSide;
  public role: PlayerRole;
  public numberIndex: number; // 1 to 6
  public pos: Vec2;
  public vel: Vec2 = { x: 0, y: 0 };
  public homePos: Vec2;
  public state: PlayerState = 'idle';
  public facing: 'left' | 'right';
  public isGrounded: boolean = true;
  public isControlled: boolean = false;
  public hitCooldown: number = 0;
  public animationTimer: number = 0;

  // Visual Customization
  public hairColor: string;
  public skinColor: string;
  public jerseyColor: string;
  public shortsColor: string;

  constructor(
    id: number,
    teamSide: TeamSide,
    numberIndex: number,
    homePos: Vec2,
    role: PlayerRole = 'allround'
  ) {
    this.id = id;
    this.teamSide = teamSide;
    this.numberIndex = numberIndex;
    this.homePos = { ...homePos };
    this.pos = { ...homePos };
    this.role = role;
    this.facing = teamSide === 'left' ? 'right' : 'left';

    const teamColors = teamSide === 'left' ? COLORS.team1 : COLORS.team2;
    this.jerseyColor = teamColors.jersey;
    this.shortsColor = teamColors.shorts;
    this.skinColor = teamColors.skin;

    // Hair color variations per player
    const hairOptions = [teamColors.hairDark, teamColors.hairBrown, teamColors.hairBlonde];
    this.hairColor = hairOptions[numberIndex % hairOptions.length];
  }

  public reset(homePos?: Vec2): void {
    if (homePos) {
      this.homePos = { ...homePos };
    }
    this.pos = { ...this.homePos };
    this.vel = { x: 0, y: 0 };
    this.state = 'idle';
    this.isGrounded = true;
    this.hitCooldown = 0;
    this.facing = this.teamSide === 'left' ? 'right' : 'left';
  }

  public update(): void {
    this.animationTimer++;
    if (this.hitCooldown > 0) this.hitCooldown--;

    // Apply gravity
    if (!this.isGrounded) {
      this.vel.y += GRAVITY;
      this.pos.y += this.vel.y;

      if (this.pos.y >= COURT_FLOOR_Y) {
        this.pos.y = COURT_FLOOR_Y;
        this.vel.y = 0;
        this.isGrounded = true;
        if (this.state === 'jump' || this.state === 'spike' || this.state === 'block') {
          this.state = 'idle';
        }
      }
    }

    // Horizontal movement
    this.pos.x += this.vel.x;

    // Clamp inside team court boundaries
    const bounds = getTeamBounds(this.teamSide);
    if (this.pos.x < bounds.minX) {
      this.pos.x = bounds.minX;
      this.vel.x = 0;
    } else if (this.pos.x > bounds.maxX) {
      this.pos.x = bounds.maxX;
      this.vel.x = 0;
    }

    // Auto update state animations
    if (this.isGrounded) {
      if (Math.abs(this.vel.x) > 0.3) {
        if (this.state !== 'receive' && this.state !== 'serve' && this.state !== 'fall') {
          this.state = 'run';
        }
      } else if (this.state === 'run') {
        this.state = 'idle';
      }
    }
  }

  public move(dirX: number): void {
    this.vel.x = dirX * PLAYER_SPEED;
    if (dirX > 0) this.facing = 'right';
    if (dirX < 0) this.facing = 'left';
  }

  public stopHorizontal(): void {
    this.vel.x = 0;
  }

  public jump(): boolean {
    if (this.isGrounded) {
      this.vel.y = -PLAYER_JUMP_POWER;
      this.isGrounded = false;
      this.state = 'jump';
      return true;
    }
    return false;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const px = this.pos.x;
    const py = this.pos.y; // Feet level on floor

    ctx.save();

    // 1. Shadow on floor
    const shadowY = COURT_FLOOR_Y;
    const heightAboveFloor = COURT_FLOOR_Y - py;
    const shadowScale = Math.max(0.4, 1 - heightAboveFloor / 200);

    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(px, shadowY, 14 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Active Controlled Player Indicator (Highlight Ring / Triangle Pointer)
    if (this.isControlled) {
      // Golden cursor triangle above head
      const pointerY = py - PLAYER_HEIGHT - 18 - (Math.sin(this.animationTimer * 0.15) * 4);
      ctx.fillStyle = COLORS.textGold;
      ctx.beginPath();
      ctx.moveTo(px, pointerY + 8);
      ctx.lineTo(px - 7, pointerY);
      ctx.lineTo(px + 7, pointerY);
      ctx.closePath();
      ctx.fill();

      // Yellow ring at feet
      ctx.strokeStyle = COLORS.textGold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(px, shadowY, 16, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Cute Modern Chibi Character Sprite
    const facingSign = this.facing === 'right' ? 1 : -1;
    const isLeftTeam = this.teamSide === 'left';

    // Body dimensions
    const headRadius = 12;
    const headY = py - PLAYER_HEIGHT + headRadius;
    const bodyTopY = headY + headRadius - 2;
    const bodyHeight = 16;
    const legHeight = 14;

    // Legs
    ctx.strokeStyle = this.skinColor;
    ctx.lineWidth = 4;
    const runAnimOffset = this.state === 'run' ? Math.sin(this.animationTimer * 0.3) * 6 : 0;

    // Left & Right Legs
    ctx.beginPath();
    ctx.moveTo(px - 4, bodyTopY + bodyHeight);
    ctx.lineTo(px - 5 - runAnimOffset, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px + 4, bodyTopY + bodyHeight);
    ctx.lineTo(px + 5 + runAnimOffset, py);
    ctx.stroke();

    // Shoes (White/Colored Sneakers)
    ctx.fillStyle = isLeftTeam ? COLORS.team1.shoes : COLORS.team2.shoes;
    ctx.fillRect(px - 8 - runAnimOffset, py - 3, 7, 4);
    ctx.fillRect(px + 2 + runAnimOffset, py - 3, 7, 4);

    // Shorts
    ctx.fillStyle = this.shortsColor;
    ctx.fillRect(px - 8, bodyTopY + bodyHeight - 4, 16, 7);

    // Jersey Shirt Body
    ctx.fillStyle = this.jerseyColor;
    ctx.fillRect(px - 8, bodyTopY, 16, bodyHeight - 3);

    // Shirt Stripe Detail
    ctx.fillStyle = isLeftTeam ? COLORS.team1.jerseyDark : COLORS.team2.jerseyDark;
    ctx.fillRect(px - 8, bodyTopY + 1, 16, 3);

    // Shirt Number (1-6)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.numberIndex.toString(), px, bodyTopY + 11);

    // Arms based on state
    ctx.strokeStyle = this.skinColor;
    ctx.lineWidth = 3;

    if (this.state === 'spike') {
      // Raised arm for spike
      ctx.beginPath();
      ctx.moveTo(px + facingSign * 2, bodyTopY + 4);
      ctx.lineTo(px + facingSign * 10, headY - 10);
      ctx.stroke();
    } else if (this.state === 'receive') {
      // Bent arms forward
      ctx.beginPath();
      ctx.moveTo(px, bodyTopY + 4);
      ctx.lineTo(px + facingSign * 12, bodyTopY + 10);
      ctx.stroke();
    } else if (this.state === 'toss' || this.state === 'block') {
      // Both arms up
      ctx.beginPath();
      ctx.moveTo(px - 5, bodyTopY + 4);
      ctx.lineTo(px - 8, headY - 6);
      ctx.moveTo(px + 5, bodyTopY + 4);
      ctx.lineTo(px + 8, headY - 6);
      ctx.stroke();
    } else {
      // Normal idle / run arms
      ctx.beginPath();
      ctx.moveTo(px, bodyTopY + 4);
      ctx.lineTo(px + facingSign * 6 + runAnimOffset, bodyTopY + 12);
      ctx.stroke();
    }

    // Head (Skin Circle)
    ctx.fillStyle = this.skinColor;
    ctx.beginPath();
    ctx.arc(px, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Cute Chibi Eyes
    ctx.fillStyle = '#1e293b';
    const eyeX = px + facingSign * 4;
    ctx.beginPath();
    ctx.arc(eyeX, headY - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye Shine Pixel
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(eyeX + facingSign * 0.5, headY - 2, 1, 1);

    // Hair (Cute modern pixel hair cut)
    ctx.fillStyle = this.hairColor;
    ctx.beginPath();
    ctx.arc(px, headY - 3, headRadius + 1, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();

    // Hair Bangs
    ctx.fillRect(px - 8, headY - headRadius, 16, 6);
    if (facingSign > 0) {
      ctx.fillRect(px + 3, headY - 4, 6, 4);
    } else {
      ctx.fillRect(px - 9, headY - 4, 6, 4);
    }

    ctx.restore();
  }
}
