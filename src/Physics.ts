import { Ball } from './Ball';
import { Player } from './Player';
import {
  COURT_LEFT,
  COURT_RIGHT,
  COURT_FLOOR_Y,
  NET_X,
  NET_TOP_Y,
  NET_WIDTH,
  TeamSide,
  PLAYER_HEIGHT,
  PLAYER_WIDTH
} from './constants';

export class Physics {
  /**
   * Check collision between player and ball
   */
  public static checkPlayerBallHit(player: Player, ball: Ball): boolean {
    if (player.hitCooldown > 0) return false;

    // Player bounding box
    const pLeft = player.pos.x - PLAYER_WIDTH / 2 - 4;
    const pRight = player.pos.x + PLAYER_WIDTH / 2 + 4;
    const pTop = player.pos.y - PLAYER_HEIGHT - 6;
    const pBottom = player.pos.y;

    // Ball bounds
    const bX = ball.pos.x;
    const bY = ball.pos.y;
    const r = ball.radius;

    // Quick distance or box check
    const isIntersecting =
      bX + r >= pLeft &&
      bX - r <= pRight &&
      bY + r >= pTop &&
      bY - r <= pBottom;

    return isIntersecting;
  }

  /**
   * Execute hit physics depending on action type / state
   */
  public static executeHit(
    player: Player,
    ball: Ball,
    actionType: 'serve' | 'receive' | 'toss' | 'spike' | 'block' | 'auto'
  ): void {
    player.hitCooldown = 22;

    const isLeft = player.teamSide === 'left';
    const targetDir = isLeft ? 1 : -1;

    switch (actionType) {
      case 'serve':
        // Underhand or Jump Serve trajectory towards opponent court
        ball.vel.x = targetDir * (6.5 + Math.random() * 2.5);
        ball.vel.y = -8.5 - Math.random() * 2.0;
        ball.isSpiked = false;
        player.state = 'serve';
        break;

      case 'receive':
        // High arc towards own court's setter position (center of own team half)
        const setterTargetX = isLeft ? 290 : 670;
        const dist = setterTargetX - ball.pos.x;
        ball.vel.x = dist * 0.04;
        ball.vel.y = -9.5;
        ball.isSpiked = false;
        player.state = 'receive';
        break;

      case 'toss':
        // High arc set up near net for spiker
        const spikeTargetX = isLeft ? 400 : 560;
        const tossDist = spikeTargetX - ball.pos.x;
        ball.vel.x = tossDist * 0.045;
        ball.vel.y = -11.0;
        ball.isSpiked = false;
        player.state = 'toss';
        break;

      case 'spike':
        // Hard downward trajectory into opponent court
        ball.vel.x = targetDir * (8.5 + Math.random() * 3.5);
        ball.vel.y = 7.0 + Math.random() * 3.0;
        ball.isSpiked = true;
        player.state = 'spike';
        break;

      case 'block':
        // Deflect back down to opposite side
        ball.vel.x = -targetDir * 3.5;
        ball.vel.y = 6.0;
        ball.isSpiked = false;
        player.state = 'block';
        break;

      case 'auto':
      default:
        // Context sensitive automatic hit based on player position & ball relative height
        const ballAboveHead = ball.pos.y < player.pos.y - PLAYER_HEIGHT + 10;
        if (!player.isGrounded && ballAboveHead) {
          // Jump spike
          ball.vel.x = targetDir * (9.0 + Math.random() * 3.0);
          ball.vel.y = 6.5 + Math.random() * 2.5;
          ball.isSpiked = true;
          player.state = 'spike';
        } else if (ballAboveHead) {
          // Set / Overhead pass
          const targetX = isLeft ? 380 : 580;
          ball.vel.x = (targetX - ball.pos.x) * 0.04;
          ball.vel.y = -10.0;
          ball.isSpiked = false;
          player.state = 'toss';
        } else {
          // Underhand Receive
          const targetX = isLeft ? 280 : 680;
          ball.vel.x = (targetX - ball.pos.x) * 0.04;
          ball.vel.y = -9.0;
          ball.isSpiked = false;
          player.state = 'receive';
        }
        break;
    }
  }

  /**
   * Determine where the ball landed (In or Out, and which team's side)
   */
  public static checkBallLanding(ball: Ball): { landed: boolean; side: TeamSide | null; isInBounds: boolean } {
    if (ball.pos.y >= COURT_FLOOR_Y - ball.radius) {
      const x = ball.pos.x;
      const isInBounds = x >= COURT_LEFT && x <= COURT_RIGHT;

      let side: TeamSide | null = null;
      if (x < NET_X) {
        side = 'left';
      } else {
        side = 'right';
      }

      return { landed: true, side, isInBounds };
    }

    return { landed: false, side: null, isInBounds: false };
  }
}
