import { Player } from './Player';
import { Ball } from './Ball';
import { Physics } from './Physics';
import { NET_X, Difficulty, COURT_FLOOR_Y, PLAYER_HEIGHT } from './constants';

export class AI {
  /**
   * Update Teammate AI (Player Team, Left Side)
   */
  public static updateTeammates(
    players: Player[],
    controlledPlayerId: number,
    ball: Ball,
    touchCount: number
  ): void {
    players.forEach((p) => {
      if (p.id === controlledPlayerId) return; // User handles this player

      // Smooth return towards home position
      const homeX = p.homePos.x;
      const dx = homeX - p.pos.x;

      // Assistance logic: If ball is on left side and heading down towards teammate
      if (ball.pos.x < NET_X && ball.vel.y > 0 && Math.abs(ball.pos.x - p.pos.x) < 70) {
        if (ball.pos.y > COURT_FLOOR_Y - 120) {
          // Attempt assist hit
          if (Physics.checkPlayerBallHit(p, ball)) {
            if (touchCount === 0) {
              Physics.executeHit(p, ball, 'receive');
            } else if (touchCount === 1) {
              Physics.executeHit(p, ball, 'toss');
            } else {
              Physics.executeHit(p, ball, 'spike');
            }
            return;
          }
        }

        // Move towards ball landing point
        if (Math.abs(ball.pos.x - p.pos.x) > 10) {
          p.move(ball.pos.x > p.pos.x ? 1 : -1);
        } else {
          p.stopHorizontal();
        }
      } else {
        // Return home
        if (Math.abs(dx) > 15) {
          p.move(dx > 0 ? 1 : -1);
        } else {
          p.stopHorizontal();
        }
      }

      p.update();
    });
  }

  /**
   * Update Opponent AI (Right Side Team)
   */
  public static updateOpponents(
    opponents: Player[],
    ball: Ball,
    touchCount: number,
    difficulty: Difficulty
  ): void {
    // Find closest opponent player to ball
    let closestPlayer: Player = opponents[0];
    let minDist = Infinity;

    opponents.forEach((p) => {
      const d = Math.hypot(p.pos.x - ball.pos.x, p.pos.y - ball.pos.y);
      if (d < minDist) {
        minDist = d;
        closestPlayer = p;
      }
    });

    const isBallOnOpponentSide = ball.pos.x > NET_X - 20;

    opponents.forEach((p) => {
      // Hit reaction check
      if (Physics.checkPlayerBallHit(p, ball)) {
        if (touchCount === 0) {
          Physics.executeHit(p, ball, 'receive');
        } else if (touchCount === 1) {
          Physics.executeHit(p, ball, 'toss');
        } else {
          Physics.executeHit(p, ball, 'spike');
        }
        return;
      }

      if (isBallOnOpponentSide && p.id === closestPlayer.id) {
        // Main active defender/attacker
        const ballTargetX = ball.pos.x;
        const diffX = ballTargetX - p.pos.x;

        if (Math.abs(diffX) > 12) {
          p.move(diffX > 0 ? 1 : -1);
        } else {
          p.stopHorizontal();
        }

        // Jump condition for spiking or high setting
        if (
          ball.pos.y < COURT_FLOOR_Y - 80 &&
          ball.pos.y > COURT_FLOOR_Y - 180 &&
          Math.abs(diffX) < 25 &&
          p.isGrounded
        ) {
          if (touchCount >= 1 || Math.random() < 0.4) {
            p.jump();
          }
        }
      } else if (!isBallOnOpponentSide && p.homePos.x < NET_X + 100) {
        // Front blockers jump at net when ball is coming fast from user team
        if (ball.pos.x > NET_X - 80 && ball.pos.y < COURT_FLOOR_Y - 90 && p.isGrounded) {
          p.jump();
        }
      } else {
        // Return towards home position
        const dx = p.homePos.x - p.pos.x;
        if (Math.abs(dx) > 15) {
          p.move(dx > 0 ? 1 : -1);
        } else {
          p.stopHorizontal();
        }
      }

      p.update();
    });
  }
}
