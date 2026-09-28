import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FLOOR_Y,
  NES_COLORS,
  PlayerState,
  Team,
  projectCourtPosition
} from './constants';
import { Player } from './Player';
import { Ball } from './Ball';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public clear(): void {
    this.ctx.fillStyle = NES_COLORS.BLACK;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  public drawBall(ball: Ball): void {
    const ctx = this.ctx;

    const height = Math.max(0, FLOOR_Y - ball.y);
    const shadowScale = Math.max(0.3, 1 - height / 140);
    const shadowAlpha = Math.max(0.15, 0.45 * (1 - height / 160));
    const ground = projectCourtPosition(ball.x, ball.depth);
    const point = projectCourtPosition(ball.x, ball.depth, height);
    const size = 0.75 + ball.depth * 0.25;

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 2, ball.radius * 1.4 * shadowScale * size, ball.radius * 0.5 * shadowScale * size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.scale(size, size);
    ctx.rotate(ball.rotation);

    ctx.fillStyle = NES_COLORS.BALL_WHITE;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = NES_COLORS.BALL_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0.2, Math.PI * 0.8);
    ctx.stroke();

    ctx.strokeStyle = '#d89800';
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.strokeStyle = '#303030';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  public drawPlayer(player: Player): void {
    const ctx = this.ctx;
    ctx.save();

    const scale = 0.78 + player.depth * 0.22;
    const jumpHeight = Math.max(0, FLOOR_Y - player.height - player.y);
    const ground = projectCourtPosition(player.x + player.width / 2, player.depth);
    const shadowWidth = player.isGrounded ? player.width * 0.9 : player.width * 0.6;
    ctx.fillStyle = NES_COLORS.SHADOW;
    ctx.beginPath();
    ctx.ellipse(ground.x, ground.y + 1, shadowWidth * scale / 2, 2.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const isPlayerTeam = player.team === Team.PLAYER;
    const skinColor = isPlayerTeam ? NES_COLORS.TEAM_PLAYER_SKIN : NES_COLORS.TEAM_CPU_SKIN;
    const hairColor = isPlayerTeam ? NES_COLORS.TEAM_PLAYER_HAIR : NES_COLORS.TEAM_CPU_HAIR;
    const shirtColor = isPlayerTeam ? NES_COLORS.TEAM_PLAYER_SHIRT : NES_COLORS.TEAM_CPU_SHIRT;
    const pantsColor = isPlayerTeam ? NES_COLORS.TEAM_PLAYER_PANTS : NES_COLORS.TEAM_CPU_PANTS;
    const shoesColor = isPlayerTeam ? NES_COLORS.TEAM_PLAYER_SHOES : NES_COLORS.TEAM_CPU_SHOES;

    ctx.translate(ground.x, ground.y - player.height * scale - jumpHeight);
    ctx.scale(scale, scale);
    if (player.facing < 0) {
      ctx.scale(-1, 1);
    }

    const px = -player.width / 2;

    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 4, 0, 8, 4);
    ctx.fillRect(px + 3, 2, 2, 4);

    ctx.fillStyle = skinColor;
    ctx.fillRect(px + 4, 4, 8, 7);

    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 9, 6, 2, 2);

    switch (player.state) {
      case PlayerState.SERVE_PREPARE:
      case PlayerState.SERVE_TOSS:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 11, 8, 10);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 10, 13, 6, 3);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 21, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 4, 26, 3, 4);
        ctx.fillRect(px + 9, 26, 3, 4);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px + 4, 30, 4, 2);
        ctx.fillRect(px + 9, 30, 4, 2);
        break;

      case PlayerState.RECEIVE:
      case PlayerState.DIVE:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 3, 13, 9, 8);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 10, 16, 7, 3);
        ctx.fillRect(px + 12, 19, 4, 2);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 2, 21, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 1, 26, 4, 3);
        ctx.fillRect(px + 8, 25, 4, 4);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px + 0, 29, 5, 3);
        ctx.fillRect(px + 8, 29, 5, 3);
        break;

      case PlayerState.TOSS:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 11, 8, 9);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 3, 1, 3, 10);
        ctx.fillRect(px + 10, 1, 3, 10);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 20, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 4, 25, 3, 5);
        ctx.fillRect(px + 9, 25, 3, 5);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px + 4, 30, 4, 2);
        ctx.fillRect(px + 9, 30, 4, 2);
        break;

      case PlayerState.SPIKE:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 11, 8, 9);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 10, 2, 4, 8);
        ctx.fillRect(px + 12, 9, 4, 5);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 20, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 2, 25, 3, 4);
        ctx.fillRect(px + 0, 28, 3, 3);
        ctx.fillRect(px + 7, 25, 3, 5);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px - 1, 30, 4, 2);
        ctx.fillRect(px + 8, 30, 4, 2);
        break;

      case PlayerState.BLOCK:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 11, 8, 9);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 8, -4, 3, 15);
        ctx.fillRect(px + 11, -4, 3, 15);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 20, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 4, 25, 3, 5);
        ctx.fillRect(px + 9, 25, 3, 5);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px + 4, 30, 4, 2);
        ctx.fillRect(px + 9, 30, 4, 2);
        break;

      case PlayerState.JUMP:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 11, 8, 9);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 2, 8, 3, 8);
        ctx.fillRect(px + 11, 4, 3, 8);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 20, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 3, 25, 3, 4);
        ctx.fillRect(px + 8, 25, 3, 5);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px + 2, 29, 4, 3);
        ctx.fillRect(px + 8, 30, 4, 2);
        break;

      case PlayerState.RUN:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 11, 8, 9);
        ctx.fillStyle = skinColor;
        const armOffset = (player.animFrame % 2 === 0) ? -2 : 3;
        ctx.fillRect(px + 2, 13 - armOffset, 3, 6);
        ctx.fillRect(px + 11, 13 + armOffset, 3, 6);

        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 20, 8, 5);

        ctx.fillStyle = skinColor;
        if (player.animFrame % 2 === 0) {
          ctx.fillRect(px + 2, 25, 3, 5);
          ctx.fillRect(px + 10, 25, 3, 5);
          ctx.fillStyle = shoesColor;
          ctx.fillRect(px + 1, 30, 4, 2);
          ctx.fillRect(px + 11, 30, 4, 2);
        } else {
          ctx.fillRect(px + 5, 25, 3, 5);
          ctx.fillRect(px + 8, 25, 3, 5);
          ctx.fillStyle = shoesColor;
          ctx.fillRect(px + 5, 30, 4, 2);
          ctx.fillRect(px + 8, 30, 4, 2);
        }
        break;

      case PlayerState.CELEBRATE:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 11, 8, 9);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 1, 3, 3, 9);
        ctx.fillRect(px + 12, 3, 3, 9);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 20, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 4, 25, 3, 5);
        ctx.fillRect(px + 9, 25, 3, 5);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px + 4, 30, 4, 2);
        ctx.fillRect(px + 9, 30, 4, 2);
        break;

      case PlayerState.DISAPPOINTED:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 13, 8, 9);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 2, 17, 3, 8);
        ctx.fillRect(px + 11, 17, 3, 8);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 22, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 4, 27, 3, 3);
        ctx.fillRect(px + 9, 27, 3, 3);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px + 4, 30, 4, 2);
        ctx.fillRect(px + 9, 30, 4, 2);
        break;

      default:
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px + 4, 11, 8, 9);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 2, 14, 3, 6);
        ctx.fillRect(px + 11, 14, 3, 6);
        ctx.fillStyle = pantsColor;
        ctx.fillRect(px + 4, 20, 8, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 4, 25, 3, 5);
        ctx.fillRect(px + 9, 25, 3, 5);
        ctx.fillStyle = shoesColor;
        ctx.fillRect(px + 4, 30, 4, 2);
        ctx.fillRect(px + 9, 30, 4, 2);
        break;
    }

    ctx.restore();

    if (player.isControlled) {
      ctx.save();
      const markerPoint = projectCourtPosition(player.x + player.width / 2, player.depth, jumpHeight + 8);
      const markerX = markerPoint.x;
      const markerY = markerPoint.y;

      ctx.fillStyle = '#fffc00';
      ctx.beginPath();
      ctx.moveTo(markerX - 4, markerY);
      ctx.lineTo(markerX + 4, markerY);
      ctx.lineTo(markerX, markerY + 4);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('1P', markerX, markerY - 2);
      ctx.restore();
    }
  }

  public drawTitleScreen(difficulty: string, isSoundMuted: boolean): void {
    const ctx = this.ctx;
    this.clear();

    ctx.fillStyle = '#081830';
    ctx.fillRect(20, 20, CANVAS_WIDTH - 40, 90);
    ctx.strokeStyle = '#f83800';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, 90);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#fcb800';
    ctx.font = '900 28px monospace';
    ctx.fillText('V O L L E Y B A L L', CANVAS_WIDTH / 2, 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('DISK SYSTEM RETRO CLONE', CANVAS_WIDTH / 2, 85);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`DIFFICULTY: < ${difficulty} >`, CANVAS_WIDTH / 2, 140);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#88a8d8';
    ctx.fillText('(TAP / ARROW TO CHANGE)', CANVAS_WIDTH / 2, 154);

    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 13px monospace';
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    if (blink) {
      ctx.fillText('PRESS START / TAP SCREEN', CANVAS_WIDTH / 2, 185);
    }

    ctx.fillStyle = '#a0a0b0';
    ctx.font = '9px monospace';
    ctx.fillText('TOUCH: LEFT D-PAD (MOVE) | RIGHT (ACTION/JUMP)', CANVAS_WIDTH / 2, 222);
    ctx.fillText('KEYBOARD: ARROWS / WASD | Z/SPACE (ACTION) | X (JUMP)', CANVAS_WIDTH / 2, 236);

    ctx.fillStyle = '#607088';
    ctx.font = '8px monospace';
    ctx.fillText(`SOUND: ${isSoundMuted ? 'MUTED' : 'ON'}`, CANVAS_WIDTH / 2, 255);
  }

  public drawServeGuide(isPlayerServing: boolean, isTossed: boolean = false): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';

    if (isPlayerServing) {
      ctx.fillText(isTossed ? 'HOLD ACTION TO SERVE | ARROWS AIM' : 'HOLD ACTION TO TOSS | ARROWS AIM', CANVAS_WIDTH / 2, 60);
    } else {
      ctx.fillText('OPPONENT SERVING...', CANVAS_WIDTH / 2, 60);
    }
    ctx.restore();
  }

  public drawRallyHint(playerTouches: number, isPlayerAirborne: boolean): void {
    const ctx = this.ctx;
    const hint = playerTouches === 0
      ? 'HOLD ACTION  RECEIVE'
      : playerTouches === 1
        ? 'ACTION  SET TO SPIKER  |  ARROWS AIM'
        : isPlayerAirborne
          ? 'ACTION  ATTACK'
          : 'JUMP + ACTION  SPIKE';

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(CANVAS_WIDTH / 2 - 108, 38, 216, 17);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hint, CANVAS_WIDTH / 2, 46.5);
    ctx.restore();
  }

  public drawGameOver(winner: Team): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (winner === Team.PLAYER) {
      ctx.fillStyle = '#00f840';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('VICTORY!!', CANVAS_WIDTH / 2, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('YOU WON THE MATCH!', CANVAS_WIDTH / 2, 130);
    } else {
      ctx.fillStyle = '#f83800';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('CPU WON THE MATCH', CANVAS_WIDTH / 2, 130);
    }

    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 11px monospace';
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    if (blink) {
      ctx.fillText('TAP SCREEN TO RETURN TO TITLE', CANVAS_WIDTH / 2, 180);
    }
    ctx.restore();
  }
}