import {
  COURT_LEFT,
  COURT_RIGHT,
  FLOOR_Y,
  NET_TOP_Y,
  NET_WIDTH,
  NET_X,
  PlayerState,
  Team
} from './constants';
import { Ball } from './Ball';
import { Player } from './Player';

export interface HitResult {
  hit: boolean;
  type: 'serve' | 'receive' | 'toss' | 'spike' | 'block' | 'touch';
  player: Player;
}

export interface NetTouchResult {
  hasFoul: boolean;
  fouledTeam: Team | null;
}

export class Physics {
  public static checkNetCollision(ball: Ball): boolean {
    const netLeft = NET_X - NET_WIDTH / 2;
    const netRight = NET_X + NET_WIDTH / 2;

    if (ball.depth >= 0 && ball.depth <= 1 && ball.y + ball.radius >= NET_TOP_Y && ball.y - ball.radius <= FLOOR_Y) {
      if (Math.abs(ball.y - NET_TOP_Y) <= ball.radius + 2 && ball.x >= netLeft - ball.radius && ball.x <= netRight + ball.radius) {
        ball.vy = -Math.abs(ball.vy) * 0.4;
        ball.vx *= 0.7;
        return true;
      }

      if (ball.x + ball.radius >= netLeft && ball.x - ball.radius <= netRight) {
        ball.vx = -ball.vx * 0.45;
        if (ball.x < NET_X) {
          ball.x = netLeft - ball.radius;
        } else {
          ball.x = netRight + ball.radius;
        }
        return true;
      }
    }
    return false;
  }

  public static checkNetTouch(players: Player[]): NetTouchResult {
    for (const player of players) {
      if (player.team === Team.PLAYER) {
        if (player.x + player.width >= NET_X - 1) {
          return { hasFoul: true, fouledTeam: Team.PLAYER };
        }
      } else {
        if (player.x <= NET_X + 1) {
          return { hasFoul: true, fouledTeam: Team.CPU };
        }
      }
    }
    return { hasFoul: false, fouledTeam: null };
  }

  public static checkPlayerBallHit(ball: Ball, player: Player): HitResult | null {
    if (ball.lastHitPlayerId === player.id && ball.lastHitTeam === player.team) {
      const dist = Math.hypot(ball.x - (player.x + player.width / 2), ball.y - (player.y + player.height / 2));
      if (dist < 18) {
        return null;
      }
    }

    const hand = player.getHandPos();
    const hitRadius = (player.state === PlayerState.SPIKE || player.state === PlayerState.BLOCK)
      ? 14
      : (player.state === PlayerState.RECEIVE || player.state === PlayerState.DIVE) ? 24 : 16;

    const dx = ball.x - hand.x;
    const dy = ball.y - hand.y;
    const depthDistance = (ball.depth - player.depth) * 48;
    const distSq = dx * dx + dy * dy + depthDistance * depthDistance;

    if (distSq <= (hitRadius + ball.radius) * (hitRadius + ball.radius)) {
      let type: 'serve' | 'receive' | 'toss' | 'spike' | 'block' | 'touch' = 'touch';

      if (player.state === PlayerState.SERVE_HIT || player.state === PlayerState.SERVE_PREPARE) {
        type = 'serve';
      } else if (player.state === PlayerState.SPIKE) {
        type = 'spike';
      } else if (player.state === PlayerState.BLOCK) {
        type = 'block';
      } else if (player.state === PlayerState.TOSS) {
        type = 'toss';
      } else if (player.state === PlayerState.RECEIVE || player.state === PlayerState.DIVE) {
        type = 'receive';
      }

      return { hit: true, type, player };
    }

    return null;
  }

  public static evaluateLanding(ball: Ball): {
    isInside: boolean;
    landingTeam: Team;
    scoringTeam: Team;
    reason: 'floor_in' | 'floor_out' | 'over_touches';
  } {
    const isInside = ball.x >= COURT_LEFT && ball.x <= COURT_RIGHT && ball.depth >= 0 && ball.depth <= 1;
    const landingTeam = ball.x < NET_X ? Team.PLAYER : Team.CPU;

    let scoringTeam: Team;
    let reason: 'floor_in' | 'floor_out' | 'over_touches' = 'floor_in';

    if (isInside) {
      scoringTeam = landingTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
      reason = 'floor_in';
    } else {
      if (ball.lastHitTeam) {
        scoringTeam = ball.lastHitTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
      } else {
        scoringTeam = landingTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
      }
      reason = 'floor_out';
    }

    return {
      isInside,
      landingTeam,
      scoringTeam,
      reason
    };
  }

  public static predictLandingX(ball: Ball): number | null {
    if (ball.vy <= 0 && ball.y >= FLOOR_Y - ball.radius) {
      return null;
    }

    let simX = ball.x;
    let simY = ball.y;
    let simVx = ball.vx;
    let simVy = ball.vy;

    for (let step = 0; step < 120; step++) {
      simVy += ball.gravity;
      simVx *= 0.995;
      simX += simVx;
      simY += simVy;

      if (simY + ball.radius >= FLOOR_Y) {
        return simX;
      }
    }
    return simX;
  }

  public static predictLandingDepth(ball: Ball): number {
    let simY = ball.y;
    let simDepth = ball.depth;
    let simVy = ball.vy;
    let simDepthVelocity = ball.depthVelocity;

    for (let step = 0; step < 120; step++) {
      simVy += ball.gravity;
      simY += simVy;
      simDepth += simDepthVelocity;
      simDepthVelocity *= 0.995;
      if (simY + ball.radius >= FLOOR_Y) return simDepth;
    }
    return simDepth;
  }
}