import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FLOOR_Y,
  GameMode,
  MODERN_PALETTE,
  PlayerState,
  Team,
  projectCourtPosition
} from './constants';
import { Player } from './Player';
import { Ball } from './Ball';
import { MatchStats } from './ScoreBoard';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ImpactRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private impactRings: ImpactRing[] = [];
  private cameraShake: number = 0;

  // Title & Trophy Images
  private titleHeroImg: HTMLImageElement | null = null;
  private trophyImg: HTMLImageElement | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.loadAssets();
  }

  private loadAssets(): void {
    const hero = new Image();
    hero.src = '/src/assets/images/volleyball_title_hero_1791120452344.jpg';
    hero.onload = () => {
      this.titleHeroImg = hero;
    };

    const trophy = new Image();
    trophy.src = '/src/assets/images/volleyball_tournament_cup_1791120475016.jpg';
    trophy.onload = () => {
      this.trophyImg = trophy;
    };
  }

  public triggerSpikeImpact(x: number, y: number, isBig: boolean = false): void {
    this.cameraShake = isBig ? 8 : 4;
    const count = isBig ? 24 : 14;
    const colors = isBig ? ['#facc15', '#f97316', '#ffffff'] : ['#38bdf8', '#ffffff', '#818cf8'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (isBig ? 4.5 : 2.5) + Math.random() * 4.0;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: (isBig ? 24 : 16) + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: (isBig ? 3.5 : 2.5) + Math.random() * 2.0
      });
    }

    this.impactRings.push({
      x,
      y,
      radius: 4,
      maxRadius: isBig ? 55 : 32,
      color: isBig ? '#facc15' : '#38bdf8',
      alpha: 1.0
    });
  }

  public update(): void {
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - 0.8);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // Gravity
      p.vx *= 0.95;
      p.life -= 1 / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update impact shockwave rings
    for (let i = this.impactRings.length - 1; i >= 0; i--) {
      const ring = this.impactRings[i];
      ring.radius += (ring.maxRadius - ring.radius) * 0.22 + 1.2;
      ring.alpha -= 0.055;
      if (ring.alpha <= 0) {
        this.impactRings.splice(i, 1);
      }
    }
  }

  public clear(): void {
    this.ctx.fillStyle = '#0b0f19';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  public getCameraShakeOffset(): { x: number; y: number } {
    if (this.cameraShake <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.cameraShake * 2,
      y: (Math.random() - 0.5) * this.cameraShake * 2
    };
  }

  // Draw modern vector ball with rotation, tricolor swirl, and speed trail
  public drawBall(ball: Ball): void {
    const ctx = this.ctx;
    const pt = projectCourtPosition(ball.x, ball.depth, ball.getHeight());
    const ground = projectCourtPosition(ball.x, ball.depth, 0);

    // 1. Soft Floor Shadow
    const height = ball.getHeight();
    const shadowScale = Math.max(0.25, 1 - height / 220);
    const shadowAlpha = Math.max(0.12, 0.45 * (1 - height / 260));

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 4, ball.radius * 1.5 * shadowScale * pt.scale, ball.radius * 0.6 * shadowScale * pt.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. High-speed Motion Trail
    if (ball.trail.length > 0) {
      ctx.save();
      for (let i = 0; i < ball.trail.length; i++) {
        const t = ball.trail[i];
        const tpt = projectCourtPosition(t.x, t.depth, FLOOR_Y - t.y);
        const trailAlpha = t.alpha * (1 - i / ball.trail.length) * 0.45;
        const trailRadius = ball.radius * tpt.scale * (1 - i * 0.08);

        ctx.fillStyle = `rgba(250, 204, 21, ${trailAlpha})`;
        ctx.beginPath();
        ctx.arc(tpt.x, tpt.y, trailRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Modern Volleyball Body
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.scale(pt.scale, pt.scale);
    ctx.rotate(ball.rotation);

    const r = ball.radius;

    // Outer glow for fast balls
    if (ball.speed > 5.5) {
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
    }

    // Ball Base Sphere (White)
    ctx.fillStyle = MODERN_PALETTE.BALL_COLOR_1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Blue & Yellow Olympic Curving Panels
    ctx.fillStyle = MODERN_PALETTE.BALL_COLOR_2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.2, Math.PI * 0.65);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = MODERN_PALETTE.BALL_COLOR_3;
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI * 0.85, Math.PI * 1.35);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Seam Outlines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.stroke();

    // Highlight Gloss
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw modern stylized vector athletic player
  public drawPlayer(player: Player, opponentPalette = MODERN_PALETTE.TEAM_CPU): void {
    const ctx = this.ctx;
    const pt = projectCourtPosition(player.x, player.depth, player.getJumpHeight());
    const ground = projectCourtPosition(player.x, player.depth, 0);

    const isPlayerTeam = player.team === Team.PLAYER;
    const palette = isPlayerTeam ? MODERN_PALETTE.TEAM_PLAYER : opponentPalette;
    const scale = pt.scale;

    ctx.save();

    // 1. Soft Elliptical Ground Shadow
    const jumpH = player.getJumpHeight();
    const shadowScale = Math.max(0.4, 1 - jumpH / 160);
    const shadowAlpha = Math.max(0.15, 0.45 * (1 - jumpH / 200));

    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 6, (player.width / 2 + 8) * scale * shadowScale, 6 * scale * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Active Controlled Player Indicator Ring ("1P" Neon Ring)
    if (player.isControlled) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(ground.x, ground.y + 6, 26 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Overhead Chevron Indicator
      const chevronY = pt.y - player.height * scale - 16;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(pt.x, chevronY + 8);
      ctx.lineTo(pt.x - 7, chevronY);
      ctx.lineTo(pt.x + 7, chevronY);
      ctx.closePath();
      ctx.fill();

      ctx.font = '800 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('1P', pt.x, chevronY - 2);
      ctx.restore();
    }

    // 3. Stylized Athletic Character Rigging
    ctx.translate(pt.x, pt.y);
    ctx.scale(scale * player.facing, scale);

    const bob = Math.sin(player.animTimer * 2) * 1.5;

    switch (player.state) {
      case PlayerState.SPIKE:
        this.renderSpikePose(ctx, palette, player);
        break;
      case PlayerState.RECEIVE:
        this.renderReceivePose(ctx, palette, player);
        break;
      case PlayerState.TOSS:
        this.renderTossPose(ctx, palette, player);
        break;
      case PlayerState.BLOCK:
        this.renderBlockPose(ctx, palette, player);
        break;
      case PlayerState.DIVE:
        this.renderDivePose(ctx, palette, player);
        break;
      case PlayerState.JUMP:
        this.renderJumpPose(ctx, palette, player);
        break;
      case PlayerState.RUN:
        this.renderRunPose(ctx, palette, player, bob);
        break;
      case PlayerState.CELEBRATE:
        this.renderCelebratePose(ctx, palette, player);
        break;
      default:
        this.renderIdlePose(ctx, palette, player, bob);
        break;
    }

    ctx.restore();
  }

  // --- Character State Poses ---

  private renderIdlePose(ctx: CanvasRenderingContext2D, pal: any, p: Player, bob: number): void {
    const headY = -44 + bob;
    const bodyY = -34 + bob;

    // Legs / Shoes
    ctx.fillStyle = pal.shoes;
    ctx.beginPath();
    ctx.roundRect(-10, -5, 8, 6, 2);
    ctx.roundRect(2, -5, 8, 6, 2);
    ctx.fill();

    // Shorts
    ctx.fillStyle = pal.shorts;
    ctx.beginPath();
    ctx.roundRect(-8, bodyY + 16, 16, 12, 3);
    ctx.fill();

    // Jersey Torso
    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY, 18, 18, 4);
    ctx.fill();

    // Jersey Accent Stripe
    ctx.fillStyle = pal.jerseySecondary;
    ctx.fillRect(-9, bodyY + 12, 18, 4);

    // Jersey Number
    ctx.font = '800 9px "Outfit", sans-serif';
    ctx.fillStyle = pal.jerseyNumber;
    ctx.textAlign = 'center';
    ctx.fillText(p.jerseyNumber.toString(), 0, bodyY + 10);

    // Arms relaxed ready
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(-12, bodyY + 2, 4, 14, 2);
    ctx.roundRect(8, bodyY + 2, 4, 14, 2);
    ctx.fill();

    // Head & Hair
    this.renderHead(ctx, pal, 0, headY);
  }

  private renderRunPose(ctx: CanvasRenderingContext2D, pal: any, p: Player, bob: number): void {
    const bodyY = -34 + bob;
    const legSwing = Math.sin(p.animProgress * 8) * 8;

    // Legs running stride
    ctx.fillStyle = pal.shoes;
    ctx.beginPath();
    ctx.roundRect(-10 - legSwing, -5, 8, 6, 2);
    ctx.roundRect(2 + legSwing, -5, 8, 6, 2);
    ctx.fill();

    // Shorts
    ctx.fillStyle = pal.shorts;
    ctx.beginPath();
    ctx.roundRect(-8, bodyY + 16, 16, 12, 3);
    ctx.fill();

    // Torso leaned slightly forward
    ctx.save();
    ctx.rotate(0.08);
    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY, 18, 18, 4);
    ctx.fill();

    ctx.fillStyle = pal.jerseySecondary;
    ctx.fillRect(-9, bodyY + 12, 18, 4);

    ctx.font = '800 9px "Outfit", sans-serif';
    ctx.fillStyle = pal.jerseyNumber;
    ctx.textAlign = 'center';
    ctx.fillText(p.jerseyNumber.toString(), 0, bodyY + 10);

    // Swinging Arms
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(-12 + legSwing * 0.6, bodyY + 2, 4, 13, 2);
    ctx.roundRect(8 - legSwing * 0.6, bodyY + 2, 4, 13, 2);
    ctx.fill();

    this.renderHead(ctx, pal, 1, -44 + bob);
    ctx.restore();
  }

  private renderJumpPose(ctx: CanvasRenderingContext2D, pal: any, p: Player): void {
    const bodyY = -38;

    // Legs tucked up in jump
    ctx.fillStyle = pal.shoes;
    ctx.beginPath();
    ctx.roundRect(-8, -14, 7, 6, 2);
    ctx.roundRect(1, -16, 7, 6, 2);
    ctx.fill();

    ctx.fillStyle = pal.shorts;
    ctx.beginPath();
    ctx.roundRect(-8, bodyY + 14, 16, 12, 3);
    ctx.fill();

    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY, 18, 16, 4);
    ctx.fill();

    // Arms raising
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(-13, bodyY - 6, 4, 14, 2);
    ctx.roundRect(9, bodyY - 10, 4, 14, 2);
    ctx.fill();

    this.renderHead(ctx, pal, 0, -48);
  }

  private renderSpikePose(ctx: CanvasRenderingContext2D, pal: any, p: Player): void {
    const bodyY = -40;

    // Legs in mid-air spike arch
    ctx.fillStyle = pal.shoes;
    ctx.beginPath();
    ctx.roundRect(-12, -18, 7, 6, 2);
    ctx.roundRect(-4, -14, 7, 6, 2);
    ctx.fill();

    ctx.fillStyle = pal.shorts;
    ctx.beginPath();
    ctx.roundRect(-8, bodyY + 14, 16, 12, 3);
    ctx.fill();

    // Arched torso
    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY, 18, 16, 4);
    ctx.fill();

    // Non-hitting arm pointing up
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(-10, bodyY - 12, 4, 14, 2);
    ctx.fill();

    // Powerful Hitting Arm cocked & whipping forward with golden aura
    ctx.save();
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(8, bodyY - 18, 5, 18, 2);
    ctx.fill();
    ctx.restore();

    this.renderHead(ctx, pal, 2, -50);
  }

  private renderReceivePose(ctx: CanvasRenderingContext2D, pal: any, p: Player): void {
    const bodyY = -28; // Low athletic crouch

    // Deep squat legs
    ctx.fillStyle = pal.shoes;
    ctx.beginPath();
    ctx.roundRect(-14, -5, 8, 6, 2);
    ctx.roundRect(6, -5, 8, 6, 2);
    ctx.fill();

    ctx.fillStyle = pal.shorts;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY + 14, 18, 12, 3);
    ctx.fill();

    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY, 18, 16, 4);
    ctx.fill();

    // Both arms locked together forward in classic bump platform
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(0, bodyY + 6, 16, 5, 2);
    ctx.fill();

    this.renderHead(ctx, pal, 0, -38);
  }

  private renderTossPose(ctx: CanvasRenderingContext2D, pal: any, p: Player): void {
    const bodyY = -34;

    ctx.fillStyle = pal.shoes;
    ctx.beginPath();
    ctx.roundRect(-9, -5, 7, 6, 2);
    ctx.roundRect(2, -5, 7, 6, 2);
    ctx.fill();

    ctx.fillStyle = pal.shorts;
    ctx.beginPath();
    ctx.roundRect(-8, bodyY + 16, 16, 12, 3);
    ctx.fill();

    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY, 18, 18, 4);
    ctx.fill();

    // Hands cupped high overhead
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(-8, bodyY - 14, 4, 16, 2);
    ctx.roundRect(4, bodyY - 14, 4, 16, 2);
    ctx.fill();

    this.renderHead(ctx, pal, 0, -44);
  }

  private renderBlockPose(ctx: CanvasRenderingContext2D, pal: any, p: Player): void {
    const bodyY = -42;

    ctx.fillStyle = pal.shoes;
    ctx.beginPath();
    ctx.roundRect(-8, -14, 7, 6, 2);
    ctx.roundRect(1, -14, 7, 6, 2);
    ctx.fill();

    ctx.fillStyle = pal.shorts;
    ctx.beginPath();
    ctx.roundRect(-8, bodyY + 14, 16, 12, 3);
    ctx.fill();

    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY, 18, 16, 4);
    ctx.fill();

    // Both arms thrust upright high above net with open palms
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(-5, bodyY - 20, 4, 22, 2);
    ctx.roundRect(3, bodyY - 20, 4, 22, 2);
    ctx.fill();

    this.renderHead(ctx, pal, 0, -52);
  }

  private renderDivePose(ctx: CanvasRenderingContext2D, pal: any, p: Player): void {
    // Horizontal floor slide
    ctx.save();
    ctx.rotate(0.25);
    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-10, -16, 24, 12, 4);
    ctx.fill();

    // Outstretched slide arm
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(12, -14, 18, 4, 2);
    ctx.fill();

    this.renderHead(ctx, pal, 1, -22);
    ctx.restore();
  }

  private renderCelebratePose(ctx: CanvasRenderingContext2D, pal: any, p: Player): void {
    const bob = Math.sin(p.animTimer * 5) * 4;
    const bodyY = -34 + bob;

    ctx.fillStyle = pal.shoes;
    ctx.beginPath();
    ctx.roundRect(-9, -5 + bob, 7, 6, 2);
    ctx.roundRect(2, -5 + bob, 7, 6, 2);
    ctx.fill();

    ctx.fillStyle = pal.shorts;
    ctx.beginPath();
    ctx.roundRect(-8, bodyY + 16, 16, 12, 3);
    ctx.fill();

    ctx.fillStyle = pal.jerseyPrimary;
    ctx.beginPath();
    ctx.roundRect(-9, bodyY, 18, 18, 4);
    ctx.fill();

    // Fists pumped in air
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.roundRect(-12, bodyY - 14, 4, 16, 2);
    ctx.roundRect(8, bodyY - 14, 4, 16, 2);
    ctx.fill();

    this.renderHead(ctx, pal, 0, -44 + bob);
  }

  private renderHead(ctx: CanvasRenderingContext2D, pal: any, headTilt: number, y: number): void {
    ctx.save();
    ctx.translate(headTilt, y);

    // Head base (Skin)
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Headband
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(0, -2, 8.5, Math.PI, Math.PI * 2);
    ctx.lineTo(8, -1);
    ctx.lineTo(2, 4);
    ctx.lineTo(-4, 2);
    ctx.lineTo(-8, -1);
    ctx.closePath();
    ctx.fill();

    // Athletic Headband
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8, -4, 16, 2.5);

    // Face / Eye
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(3, 1, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw Particles & Shockwave Rings
  public drawEffects(): void {
    const ctx = this.ctx;

    // Rings
    for (const ring of this.impactRings) {
      ctx.save();
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = Math.max(0, ring.alpha);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Modern Title Screen (with generated hero artwork, clean cards, mode select, difficulty select)
  public drawTitleScreen(
    currentMode: GameMode,
    difficulty: string,
    targetScore: number,
    isSoundMuted: boolean
  ): void {
    const ctx = this.ctx;
    this.clear();

    // 1. Hero Artwork Backdrop
    if (this.titleHeroImg && this.titleHeroImg.complete) {
      ctx.drawImage(this.titleHeroImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Dark glass scrim for high legibility
      const scrim = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
      scrim.addColorStop(0, 'rgba(8, 12, 22, 0.94)');
      scrim.addColorStop(0.55, 'rgba(8, 12, 22, 0.82)');
      scrim.addColorStop(1, 'rgba(8, 12, 22, 0.45)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      grad.addColorStop(0, '#0a0f1d');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // 2. Brand Title
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = '900 44px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NEO VOLLEYBALL', 48, 40);

    ctx.font = '800 18px "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('GRAND SLAM ARCADE', 50, 92);

    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Reimagined High-Speed 2.5D Volleyball for the Modern Era', 50, 118);

    // 3. Game Mode Select Tabs
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('SELECT GAME MODE', 50, 156);

    const modes = [
      { id: GameMode.QUICK, title: 'QUICK MATCH', desc: 'Instant 1-Match Exhibition vs CPU' },
      { id: GameMode.TOURNAMENT, title: 'TOURNAMENT', desc: '3-Round Championship Cup' },
      { id: GameMode.PRACTICE, title: 'PRACTICE RALLY', desc: 'Endless Spike & Receive Training' }
    ];

    modes.forEach((m, idx) => {
      const cardY = 175 + idx * 56;
      const isSelected = m.id === currentMode;

      ctx.fillStyle = isSelected ? 'rgba(2, 132, 199, 0.85)' : 'rgba(15, 23, 42, 0.7)';
      ctx.beginPath();
      ctx.roundRect(50, cardY, 360, 48, 8);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      ctx.font = '800 14px "Outfit", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(m.title, 66, cardY + 12);

      ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(m.desc, 66, cardY + 30);
    });

    // 4. Match Settings (Difficulty & Target Score)
    const settingsY = 360;
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('DIFFICULTY', 50, settingsY);
    ctx.fillText('TARGET SCORE', 200, settingsY);
    ctx.fillText('AUDIO', 320, settingsY);

    // Difficulty Button
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(50, settingsY + 12, 130, 32, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();
    ctx.font = '800 12px "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(difficulty, 64, settingsY + 22);

    // Target Score Button
    ctx.beginPath();
    ctx.roundRect(200, settingsY + 12, 100, 32, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillText(`${targetScore} PTS`, 216, settingsY + 22);

    // Audio Button
    ctx.beginPath();
    ctx.roundRect(320, settingsY + 12, 90, 32, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isSoundMuted ? '#f43f5e' : '#34d399';
    ctx.fillText(isSoundMuted ? 'MUTED' : 'ON', 336, settingsY + 22);

    // 5. Big "START MATCH" CTA Button
    const startBtnY = 430;
    const btnGrad = ctx.createLinearGradient(50, startBtnY, 410, startBtnY);
    btnGrad.addColorStop(0, '#f43f5e');
    btnGrad.addColorStop(1, '#e11d48');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(50, startBtnY, 360, 52, 10);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '900 18px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('START MATCH  ►', 230, startBtnY + 16);

    ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('PRESS SPACE / TAP SCREEN TO BEGIN', 230, startBtnY + 36);

    // 6. Controls Legend (Right Side)
    const ctrlX = CANVAS_WIDTH - 280;
    const ctrlY = 320;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(ctrlX, ctrlY, 235, 175, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '800 12px "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CONTROLS GUIDE', ctrlX + 16, ctrlY + 16);

    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MOVE: Arrow Keys / WASD', ctrlX + 16, ctrlY + 44);
    ctx.fillText('ACTION: Space / J / Left Click', ctrlX + 16, ctrlY + 70);
    ctx.fillText('JUMP: K / X', ctrlX + 16, ctrlY + 96);
    ctx.fillText('PAUSE: Esc / P / Pause Icon', ctrlX + 16, ctrlY + 122);

    ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Touch screen: Virtual pad & buttons', ctrlX + 16, ctrlY + 148);

    ctx.restore();
  }

  // Modern Pause Overlay
  public drawPauseOverlay(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 22, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const w = 320;
    const h = 260;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = (CANVAS_HEIGHT - h) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '900 24px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GAME PAUSED', CANVAS_WIDTH / 2, y + 42);

    // Buttons
    const buttons = ['RESUME (ESC)', 'RESTART SET', 'SOUND TOGGLE', 'EXIT TO TITLE'];
    buttons.forEach((lbl, idx) => {
      const by = y + 70 + idx * 42;
      ctx.fillStyle = idx === 0 ? 'rgba(2, 132, 199, 0.8)' : 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(x + 24, by, w - 48, 34, 6);
      ctx.fill();

      ctx.strokeStyle = idx === 0 ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      ctx.font = '700 12px "Outfit", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lbl, CANVAS_WIDTH / 2, by + 21);
    });

    ctx.restore();
  }

  // Modern Game Over / Match End Screen
  public drawGameOver(winner: Team, stats: MatchStats, isTournament: boolean, roundIndex: number): void {
    const ctx = this.ctx;
    ctx.save();

    // Dark backdrop
    ctx.fillStyle = 'rgba(8, 12, 22, 0.88)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const isPlayerWin = winner === Team.PLAYER;
    const isChampionship = isTournament && roundIndex >= 2 && isPlayerWin;

    const w = 480;
    const h = 380;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = (CANVAS_HEIGHT - h) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();

    ctx.strokeStyle = isPlayerWin ? '#facc15' : '#f43f5e';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';

    // Title Banner
    ctx.font = '900 32px "Outfit", sans-serif';
    ctx.fillStyle = isPlayerWin ? '#facc15' : '#f43f5e';
    ctx.fillText(isPlayerWin ? (isChampionship ? 'TOURNAMENT CHAMPIONS!' : 'MATCH VICTORY!') : 'DEFEAT', CANVAS_WIDTH / 2, y + 46);

    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(isPlayerWin ? 'Outstanding performance on the court!' : 'Good rally! Ready for a rematch?', CANVAS_WIDTH / 2, y + 74);

    // Optional Trophy illustration if tournament won
    if (isChampionship && this.trophyImg && this.trophyImg.complete) {
      ctx.drawImage(this.trophyImg, CANVAS_WIDTH / 2 - 40, y + 86, 80, 80);
    }

    // Match Stats Grid
    const statY = isChampionship ? y + 175 : y + 105;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(x + 24, statY, w - 48, 140, 8);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '800 12px "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('MATCH PERFORMANCE STATS', x + 40, statY + 24);

    const rows = [
      { label: 'Successful Spikes', val: stats.spikes },
      { label: 'Monster Blocks', val: stats.blocks },
      { label: 'Service Aces', val: stats.aces },
      { label: 'Longest Continuous Rally', val: `${stats.longestRally} Hits` }
    ];

    rows.forEach((r, idx) => {
      const ry = statY + 50 + idx * 24;
      ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(r.label, x + 40, ry);

      ctx.textAlign = 'right';
      ctx.font = '700 12px "Outfit", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(r.val.toString(), x + w - 40, ry);
      ctx.textAlign = 'left';
    });

    // Play Again / Continue Button
    const btnY = y + h - 54;
    ctx.fillStyle = isPlayerWin ? '#0284c7' : '#e11d48';
    ctx.beginPath();
    ctx.roundRect(x + 36, btnY, w - 72, 40, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '800 14px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    const btnLabel = isTournament && isPlayerWin && roundIndex < 2 ? 'NEXT ROUND ►' : 'PLAY AGAIN ►';
    ctx.fillText(btnLabel, CANVAS_WIDTH / 2, btnY + 25);

    ctx.restore();
  }
}