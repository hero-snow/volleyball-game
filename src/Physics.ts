import {
  COURT_LEFT,
  COURT_RIGHT,
  FLOOR_Y,
  NET_TOP_Y,
  NET_WIDTH,
  NET_X,
  PlayerState,
  RallyEndReason,
  Team
} from './constants';
import { Ball } from './Ball';
import { Player } from './Player';

export interface HitResult {
  hit: boolean;
  type: 'serve' | 'receive' | 'toss' | 'spike' | 'block' | 'dive' | 'over' | 'touch' | 'double_contact' | 'illegal_block';
  player: Player;
  quality: 'perfect' | 'good' | 'normal';
}

export interface LandingPrediction {
  x: number;
  depth: number;
  frames: number;
}

export class Physics {
  // Check net touch violation (players touching the net)
  public static checkNetTouch(players: Player[]): { hasFoul: boolean; fouledPlayer: Player | null } {
    const netBandX = NET_X;
    for (const p of players) {
      if (p.state === PlayerState.SPIKE || p.state === PlayerState.BLOCK || p.state === PlayerState.JUMP) {
        if (p.team === Team.PLAYER && p.x >= netBandX - 6 && p.y < FLOOR_Y - 40) {
          return { hasFoul: true, fouledPlayer: p };
        }
        if (p.team === Team.CPU && p.x <= netBandX + 6 && p.y < FLOOR_Y - 40) {
          return { hasFoul: true, fouledPlayer: p };
        }
      }
    }
    return { hasFoul: false, fouledPlayer: null };
  }

  // Net collision check with oscillation prevention and cooldown
  public static checkNetCollision(ball: Ball): boolean {
    if (ball.netHitCooldown > 0) {
      return false;
    }

    const netLeft = NET_X - NET_WIDTH;
    const netRight = NET_X + NET_WIDTH;

    // Check if ball is at net horizontal location
    if (ball.x + ball.radius >= netLeft && ball.x - ball.radius <= netRight) {
      // If hitting the net tape top cord
      if (Math.abs(ball.y - NET_TOP_Y) <= ball.radius + 6) {
        ball.y = NET_TOP_Y - ball.radius - 2;
        ball.vy = -Math.max(2.8, Math.abs(ball.vy) * 0.55);
        ball.vx *= 0.7;
        ball.netHitCooldown = 10;
        return true;
      }

      // If hitting below the top cord (the net mesh)
      if (ball.y >= NET_TOP_Y && ball.y <= FLOOR_Y) {
        const pushMargin = ball.radius + 5;
        if (ball.x < NET_X) {
          ball.x = netLeft - pushMargin;
          ball.vx = -Math.max(1.8, Math.abs(ball.vx) * 0.55);
        } else {
          ball.x = netRight + pushMargin;
          ball.vx = Math.max(1.8, Math.abs(ball.vx) * 0.55);
        }
        ball.netHitCooldown = 12;
        return true;
      }
    }
    return false;
  }

  // Hit detection between ball and player
  public static checkPlayerBallHit(ball: Ball, player: Player): HitResult | null {
    const isConsecutiveHit = ball.lastHitPlayerId === player.id && ball.lastHitTeam === player.team;

    // Immediate contact frame ignore (prevents multi-trigger on same hit)
    if (isConsecutiveHit && ball.framesSinceHit < 8) {
      return null;
    }

    const hand = player.getHandPos();
    const teamTouches = ball.touches[player.team];
    const isSpiking = player.state === PlayerState.SPIKE || (!player.isGrounded && teamTouches >= 2);

    let hitRadius = 46;

    if (isSpiking) {
      // Generous, accessible spike strike zone so players can reliably smash tosses
      hitRadius = 82;
    } else if (player.state === PlayerState.BLOCK) {
      hitRadius = 55;
    } else if (player.state === PlayerState.DIVE) {
      hitRadius = 65;
    } else if (player.state === PlayerState.RECEIVE || player.state === PlayerState.TOSS) {
      hitRadius = 52;
    }

    const dx = ball.x - hand.x;
    let dy = ball.y - hand.y;

    // For airborne spikes, soften vertical distance penalty so the player reliably connects
    if (isSpiking && ball.y < player.y + 35 && ball.y > player.y - 80) {
      dy *= 0.55;
    }

    // Reduced depth multiplier for forgiving 2.5D contact
    const depthDiff = (ball.depth - player.depth) * (isSpiking ? 38 : 50);
    const dist = Math.hypot(dx, dy, depthDiff);

    if (isConsecutiveHit && !ball.lastHitPlayerLeftContact) {
      if (ball.framesSinceHit < 8 || dist <= hitRadius + ball.radius) {
        return null;
      }
      ball.lastHitPlayerLeftContact = true;
    }

    if (dist <= hitRadius + ball.radius) {
      // Rule: Double contact fault (same player touching ball twice in a row)
      // Exempt blocks (FIVB rule 9.2.3.2) and first team touches after opponent attack
      const isDoubleContact = isConsecutiveHit &&
        ball.framesSinceHit >= 8 &&
        !ball.lastHitIsBlock &&
        player.state !== PlayerState.BLOCK &&
        ball.touches[player.team] > 0;

      if (isDoubleContact) {
        return { hit: true, type: 'double_contact', player, quality: 'normal' };
      }

      let type: 'serve' | 'receive' | 'toss' | 'spike' | 'block' | 'dive' | 'over' | 'touch' | 'illegal_block' = 'touch';
      let quality: 'perfect' | 'good' | 'normal' = 'normal';

      if (dist < (hitRadius + ball.radius) * 0.4) {
        quality = 'perfect';
      } else if (dist < (hitRadius + ball.radius) * 0.75) {
        quality = 'good';
      }

      const isDefendingAtNet = !player.isGrounded && Math.abs(player.x - NET_X) < 55 && ball.y < NET_TOP_Y + 40;

      if (player.state === PlayerState.BLOCK || (isDefendingAtNet && teamTouches === 0 && ball.lastHitTeam !== player.team)) {
        // FIVB Rule 14.1.3: It is illegal to block an opponent's serve
        if (ball.isServed) {
          type = 'illegal_block';
        } else {
          type = 'block';
        }
      } else if (player.state === PlayerState.SERVE_HIT || player.state === PlayerState.SERVE_PREPARE || player.state === PlayerState.SERVE_TOSS) {
        type = 'serve';
      } else if (player.state === PlayerState.DIVE) {
        type = 'dive';
      } else if (isSpiking) {
        // Airborne attack
        type = 'spike';
      } else if (player.state === PlayerState.TOSS && teamTouches === 1) {
        type = 'toss';
      } else if (player.state === PlayerState.RECEIVE && teamTouches === 0) {
        type = 'receive';
      } else if (teamTouches >= 2) {
        // 3rd Touch must NEVER be a pass to teammates! Must be return over the net!
        type = player.isGrounded ? 'over' : 'spike';
      } else if (teamTouches === 1) {
        type = 'toss';
      } else {
        type = 'receive';
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
    reason: RallyEndReason;
  } {
    const isInside = ball.x >= COURT_LEFT && ball.x <= COURT_RIGHT && ball.depth >= 0.05 && ball.depth <= 0.95;
    const landingTeam = ball.x < NET_X ? Team.PLAYER : Team.CPU;

    let scoringTeam: Team;
    let reason: RallyEndReason = 'in';

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