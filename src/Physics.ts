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
  type: 'serve' | 'receive' | 'toss' | 'spike' | 'block' | 'dive' | 'touch';
  player: Player;
  quality: 'perfect' | 'good' | 'normal';
}

export interface LandingPrediction {
  x: number;
  depth: number;
  frames: number;
}

export class Physics {
  // Net collision check
  public static checkNetCollision(ball: Ball): boolean {
    const netLeft = NET_X - NET_WIDTH;
    const netRight = NET_X + NET_WIDTH;

    // Check if ball is at net horizontal location
    if (ball.x + ball.radius >= netLeft && ball.x - ball.radius <= netRight) {
      // If hitting the net tape top cord
      if (Math.abs(ball.y - NET_TOP_Y) <= ball.radius + 6) {
        ball.vy = -Math.abs(ball.vy) * 0.45;
        ball.vx *= 0.65;
        return true;
      }

      // If hitting below the top cord (the net mesh)
      if (ball.y >= NET_TOP_Y && ball.y <= FLOOR_Y) {
        ball.vx = -ball.vx * 0.55;
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

  // Hit detection between ball and player
  public static checkPlayerBallHit(ball: Ball, player: Player): HitResult | null {
    // Avoid double hitting within a few frames by the exact same player
    if (ball.lastHitPlayerId === player.id && ball.lastHitTeam === player.team && ball.framesSinceHit < 18) {
      return null;
    }

    const hand = player.getHandPos();
    let hitRadius = 38;

    if (player.state === PlayerState.SPIKE) {
      hitRadius = 45; // Generous spike zone
    } else if (player.state === PlayerState.BLOCK) {
      hitRadius = 42;
    } else if (player.state === PlayerState.DIVE) {
      hitRadius = 50; // Wide dive reach
    } else if (player.state === PlayerState.RECEIVE || player.state === PlayerState.TOSS) {
      hitRadius = 42;
    }

    const dx = ball.x - hand.x;
    const dy = ball.y - hand.y;
    const depthDiff = (ball.depth - player.depth) * 85;
    const dist = Math.hypot(dx, dy, depthDiff);

    if (dist <= hitRadius + ball.radius) {
      let type: 'serve' | 'receive' | 'toss' | 'spike' | 'block' | 'dive' | 'touch' = 'touch';
      let quality: 'perfect' | 'good' | 'normal' = 'normal';

      if (dist < (hitRadius + ball.radius) * 0.4) {
        quality = 'perfect';
      } else if (dist < (hitRadius + ball.radius) * 0.75) {
        quality = 'good';
      }

      if (player.state === PlayerState.SERVE_HIT || player.state === PlayerState.SERVE_PREPARE || player.state === PlayerState.SERVE_TOSS) {
        type = 'serve';
      } else if (player.state === PlayerState.SPIKE) {
        type = 'spike';
      } else if (player.state === PlayerState.BLOCK) {
        type = 'block';
      } else if (player.state === PlayerState.TOSS) {
        type = 'toss';
      } else if (player.state === PlayerState.DIVE) {
        type = 'dive';
      } else if (player.state === PlayerState.RECEIVE) {
        type = 'receive';
      } else {
        // Automatic context mapping based on touches if player is close
        const teamTouches = ball.touches[player.team];
        if (teamTouches === 0) {
          type = 'receive';
        } else if (teamTouches === 1) {
          type = 'toss';
        } else if (!player.isGrounded) {
          type = 'spike';
        } else {
          type = 'receive';
        }
      }

      return { hit: true, type, player, quality };
    }

    return null;
  }

  // Predict where the ball will land on the court
  public static predictLanding(ball: Ball): LandingPrediction {
    let simX = ball.x;
    let simY = ball.y;
    let simDepth = ball.depth;
    let simVx = ball.vx;
    let simVy = ball.vy;
    let simDepthVelocity = ball.depthVelocity;

    let frames = 0;
    for (let step = 0; step < 160; step++) {
      frames++;
      simVy += ball.gravity;
      simVx *= 0.994;
      simX += simVx;
      simY += simVy;
      simDepth += simDepthVelocity;
      simDepthVelocity *= 0.98;

      if (simY + ball.radius >= FLOOR_Y) {
        break;
      }
    }

    return {
      x: simX,
      depth: Math.max(0.08, Math.min(0.92, simDepth)),
      frames
    };
  }

  // Evaluate point scoring and in/out boundaries
  public static evaluateLanding(ball: Ball): {
    isInside: boolean;
    landingTeam: Team;
    scoringTeam: Team;
    reason: 'in' | 'out' | 'touch_out';
  } {
    const isInside = ball.x >= COURT_LEFT && ball.x <= COURT_RIGHT && ball.depth >= 0.05 && ball.depth <= 0.95;
    const landingTeam = ball.x < NET_X ? Team.PLAYER : Team.CPU;

    let scoringTeam: Team;
    let reason: 'in' | 'out' | 'touch_out' = 'in';

    if (isInside) {
      scoringTeam = landingTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
      reason = 'in';
    } else {
      if (ball.lastHitTeam) {
        scoringTeam = ball.lastHitTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
      } else {
        scoringTeam = landingTeam === Team.PLAYER ? Team.CPU : Team.PLAYER;
      }
      reason = 'out';
    }

    return {
      isInside,
      landingTeam,
      scoringTeam,
      reason
    };
  }
}