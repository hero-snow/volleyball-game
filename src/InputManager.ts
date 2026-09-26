import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private prevKeys: { [key: string]: boolean } = {};

  // Touch UI Button hitboxes (defined in virtual canvas 960x540 space)
  public readonly dpadCenter = { x: 120, y: 440, radius: 60 };
  public readonly actionBtn = { x: 840, y: 440, radius: 50 };

  private touchMoveX: number = 0; // -1 to 1
  private touchJump: boolean = false;
  private touchAction: boolean = false;
  private prevTouchAction: boolean = false;

  private activeTouches: Map<number, { x: number; y: number }> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.setupKeyboard();
    this.setupTouch(canvas);
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'z', 'Z', 'x', 'X'].includes(e.key)) {
        e.preventDefault();
      }
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  private setupTouch(canvas: HTMLCanvasElement): void {
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      this.activeTouches.clear();
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const canvasX = (t.clientX - rect.left) * scaleX;
        const canvasY = (t.clientY - rect.top) * scaleY;
        this.activeTouches.set(t.identifier, { x: canvasX, y: canvasY });
      }

      this.processTouchInputs();
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouch, { passive: false });
    canvas.addEventListener('touchcancel', handleTouch, { passive: false });
  }

  private processTouchInputs(): void {
    this.touchMoveX = 0;
    this.touchJump = false;
    this.touchAction = false;

    this.activeTouches.forEach((pos) => {
      // D-Pad check
      const dpadDist = Math.hypot(pos.x - this.dpadCenter.x, pos.y - this.dpadCenter.y);
      if (dpadDist <= this.dpadCenter.radius + 30) {
        const dx = pos.x - this.dpadCenter.x;
        const dy = pos.y - this.dpadCenter.y;

        if (Math.abs(dx) > 10) {
          this.touchMoveX = dx > 0 ? 1 : -1;
        }
        if (dy < -15) {
          this.touchJump = true;
        }
      }

      // Action Button check
      const actionDist = Math.hypot(pos.x - this.actionBtn.x, pos.y - this.actionBtn.y);
      if (actionDist <= this.actionBtn.radius + 20) {
        this.touchAction = true;
      }
    });
  }

  public update(): void {
    // Copy key states to prevKeys
    this.prevKeys = { ...this.keys };
    this.prevTouchAction = this.touchAction;
  }

  public getMoveX(): number {
    if (this.keys['arrowleft'] || this.keys['a']) return -1;
    if (this.keys['arrowright'] || this.keys['d']) return 1;
    return this.touchMoveX;
  }

  public isJumpPressed(): boolean {
    return (
      this.keys['arrowup'] ||
      this.keys['w'] ||
      this.keys['x'] ||
      this.touchJump
    );
  }

  public isActionJustPressed(): boolean {
    const keyJustPressed =
      (this.keys[' '] && !this.prevKeys[' ']) ||
      (this.keys['z'] && !this.prevKeys['z']) ||
      (this.keys['enter'] && !this.prevKeys['enter']);

    const touchJustPressed = this.touchAction && !this.prevTouchAction;

    return keyJustPressed || touchJustPressed;
  }

  public isActionHeld(): boolean {
    return this.keys[' '] || this.keys['z'] || this.keys['enter'] || this.touchAction;
  }
}
