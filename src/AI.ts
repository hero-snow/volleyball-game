import {
  COURT_LEFT,
  COURT_RIGHT,
  FLOOR_Y,
  NET_X,
  PlayerState,
  Team
} from './constants';
import { Player } from './Player';
import { Ball } from './Ball';
import { Physics } from './Physics';

export type AIDifficulty = 'CASUAL' | 'PRO' | 'MASTER';

export class AIController {
  public difficulty: AIDifficulty = 'PRO';
  private reactionDelay: number = 0;

  constructor(difficulty: AIDifficulty = 'PRO') {
    this.difficulty = difficulty;
  }

  public updateCPU(
    cpuPlayers: Player[],
    playerTeam: Player[],
    ball: Ball,
    onCpuServe: () => void,
    onCpuHit: (player: Player, type: 'receive' | 'toss' | 'spike' | 'block') => void
  ): void {
    const isBallInCpuCourt = ball.x >= NET_X - 20 && ball.x <= COURT_RIGHT + 60;
    const prediction = Physics.predictLanding(ball);

    // 1. Handle CPU Serve
    const server = cpuPlayers.find(p => p.state === PlayerState.SERVE_PREPARE);
    if (server) {
      if (Math.random() < 0.035) {
        onCpuServe();
      }
      return;
    }

    // 2. Defensive Blocking at the Net
    const isHumanSpiking = playerTeam.some(p => p.state === PlayerState.SPIKE || (p.role === 'spiker' && !p.isGrounded));
    if (isHumanSpiking && ball.x < NET_X && ball.x > NET_X - 140) {
      const blockers = cpuPlayers.filter(p => p.x < NET_X + 90 && p.isGrounded);
      for (const blocker of blockers) {
        const blockProbability = this.difficulty === 'MASTER' ? 0.75 : (this.difficulty === 'PRO' ? 0.5 : 0.2);
        if (Math.random() < blockProbability) {
          blocker.triggerBlock();
          break;
        }
      }
    }

    // 3. Find target player for the ball
    let activePlayer: Player | null = null;
    const cpuTouches = ball.touches[Team.CPU];

    if (isBallInCpuCourt && ball.inPlay) {
      if (cpuTouches === 0) {
        // Receivers first
        const receivers = cpuPlayers.filter(p => p.role === 'receiver');
        activePlayer = this.getClosestToTarget(receivers, prediction.x, prediction.depth) || cpuPlayers[0];
      } else if (cpuTouches === 1) {
        // Setter takes 2nd touch
        activePlayer = cpuPlayers.find(p => p.role === 'setter') || cpuPlayers[0];
      } else {
        // Spiker takes 3rd touch
        const spikers = cpuPlayers.filter(p => p.role === 'spiker');
        activePlayer = this.getClosestToTarget(spikers, prediction.x, prediction.depth) || cpuPlayers[1];
      }
    }

    // Speed and precision by difficulty
    const speedMult = this.difficulty === 'MASTER' ? 1.05 : (this.difficulty === 'PRO' ? 0.92 : 0.78);
    const posTolerance = this.difficulty === 'MASTER' ? 8 : (this.difficulty === 'PRO' ? 14 : 22);

    // 4. Update each CPU player movement & state
    for (const p of cpuPlayers) {
      if (!p.isGrounded || p.state === PlayerState.SERVE_PREPARE || p.state === PlayerState.CELEBRATE || p.state === PlayerState.DISAPPOINTED) {
        continue;
      }

      if (p === activePlayer && isBallInCpuCourt) {
        const targetX = Math.max(NET_X + 25, Math.min(COURT_RIGHT + 20, prediction.x));
        const diffX = targetX - p.x;
        const diffDepth = prediction.depth - p.depth;

        // Move towards landing spot
        if (Math.abs(diffX) > posTolerance) {
          p.moveAnalog(Math.sign(diffX), Math.sign(diffDepth), speedMult);
        } else {
          p.moveAnalog(0, Math.sign(diffDepth) * 0.5, speedMult);
        }

        const hand = p.getHandPos();
        const dist = Math.hypot(ball.x - hand.x, ball.y - hand.y, (ball.depth - p.depth) * 85);

        // Action trigger based on touch count
        if (cpuTouches === 0 && ball.framesSinceHit >= 6) {
          if (dist < 48 && ball.y > FLOOR_Y - 140) {
            p.triggerReceive();
            onCpuHit(p, 'receive');
          }
        } else if (cpuTouches === 1 && ball.framesSinceHit >= 8) {
          if (dist < 44 && ball.y > FLOOR_Y - 120) {
            p.triggerToss();
            onCpuHit(p, 'toss');
          }
        } else if (cpuTouches === 2) {
          // Time the spike jump: jump when ball is descending into spike zone
          const shouldJumpToSpike = ball.vy > 0 && ball.y > FLOOR_Y - 220 && ball.y < FLOOR_Y - 130 && Math.abs(diffX) < 40;
          if (shouldJumpToSpike && p.isGrounded) {
            p.triggerSpike();
          } else if (!p.isGrounded && dist < 50) {
            onCpuHit(p, 'spike');
          }
        }
      } else {
        // Return smoothly to home position
        const homeDiffX = p.homeX - p.x;
        const homeDiffDepth = p.homeDepth - p.depth;
        if (Math.abs(homeDiffX) > 15 || Math.abs(homeDiffDepth) > 0.08) {
          p.moveAnalog(Math.sign(homeDiffX) * 0.4, Math.sign(homeDiffDepth) * 0.4, 0.6);
        } else {
          p.moveAnalog(0, 0);
          p.state = PlayerState.IDLE;
        }
      }
    }
  }

  private getClosestToTarget(players: Player[], tx: number, tDepth: number): Player | null {
    if (players.length === 0) return null;
    let closest = players[0];
    let minD = 99999;
    for (const p of players) {
      const d = Math.hypot(p.x - tx, (p.depth - tDepth) * 85);
      if (d < minD) {
        minD = d;
        closest = p;
      }
    }
    return closest;
  }
}