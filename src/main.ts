import { Game } from './Game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Game canvas element #game not found!');
    return;
  }

  function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
    const windowRatio = windowWidth / windowHeight;

    let displayWidth: number;
    let displayHeight: number;

    if (windowRatio < targetRatio) {
      displayWidth = windowWidth;
      displayHeight = windowWidth / targetRatio;
    } else {
      displayHeight = windowHeight;
      displayWidth = windowHeight * targetRatio;
    }

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const game = new Game(canvas);
  game.start();
});
