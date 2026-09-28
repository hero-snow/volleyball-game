import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { Game } from './Game';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const resizeCanvas = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const targetAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    const currentAspect = windowWidth / windowHeight;

    let displayWidth: number;
    let displayHeight: number;

    if (currentAspect > targetAspect) {
      displayHeight = windowHeight;
      displayWidth = windowHeight * targetAspect;
    } else {
      displayWidth = windowWidth;
      displayHeight = windowWidth / targetAspect;
    }

    canvas.style.width = `${Math.floor(displayWidth)}px`;
    canvas.style.height = `${Math.floor(displayHeight)}px`;
  };

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);
  resizeCanvas();

  const game = new Game(canvas);
  game.start();
});