import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private justPressedKeys: { [key: string]: boolean } = {};

  // Touch UI Button hitboxes (defined in virtual canvas 960x540 space)
  public readonly dpadCenter = { x: 120, y: 440, radius: 60 };
  public readonly actionBtn = { x: 840, y: 440, radius: 50 };

  private touchMoveX: number = 0; // -1 to 1
  private touchJump: boolean = false;
  private touchAction: boolean = false;
  private touchActionJustPressed: boolean = false;

  private activeTouches: Map<number, { x: number; y: number }> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.setupKeyboard();
    this.setupTouch(canvas);
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      const key = e.key;

      if (
        code === 'Space' ||
        key === ' ' ||
        code.startsWith('Arrow') ||
        key.startsWith('Arrow') ||
        ['z', 'Z', 'x', 'X', 'Enter'].includes(key)
      ) {
        e.preventDefault();
      }

      const keyName = key.toLowerCase();
      if (!this.keys[keyName] && !this.keys[code]) {
        this.justPressedKeys[keyName] = true;
        this.justPressedKeys[code] = true;
      }

      this.keys[keyName] = true;
      this.keys[code] = true;
    });

    window.addEventListener('keyup', (e) => {
      const keyName = e.key.toLowerCase();
      this.keys[keyName] = false;
      this.keys[e.code] = false;
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

    const handleCanvasClick = () => {
      // Allow canvas click to trigger action (e.g. starting game or hitting)
      this.touchActionJustPressed = true;
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouch, { passive: false });
    canvas.addEventListener('touchcancel', handleTouch, { passive: false });
    canvas.addEventListener('click', handleCanvasClick);
  }

  private processTouchInputs(): void {
    this.touchMoveX = 0;
    this.touchJump = false;
    const prevTouchAction = this.touchAction;
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

    if (this.touchAction && !prevTouchAction) {
      this.touchActionJustPressed = true;
    }
  }

  public endFrame(): void {
    // Clear justPressed flags at the end of the frame loop
    this.justPressedKeys = {};
    this.touchActionJustPressed = false;
  }

  public getMoveX(): number {
    if (this.keys['arrowleft'] || this.keys['a'] || this.keys['KeyA']) return -1;
    if (this.keys['arrowright'] || this.keys['d'] || this.keys['KeyD']) return 1;
    return this.touchMoveX;
  }

  public isJumpPressed(): boolean {
    return (
      this.keys['arrowup'] ||
      this.keys['w'] ||
      this.keys['KeyW'] ||
      this.keys['x'] ||
      this.keys['KeyX'] ||
      this.justPressedKeys['arrowup'] ||
      this.justPressedKeys['KeyW'] ||
      this.touchJump
    );
  }

  public isActionJustPressed(): boolean {
    const spaceJustPressed =
      this.justPressedKeys[' '] ||
      this.justPressedKeys['Space'] ||
      this.justPressedKeys['space'];

    const zJustPressed =
      this.justPressedKeys['z'] ||
      this.justPressedKeys['KeyZ'];

    const enterJustPressed =
      this.justPressedKeys['enter'] ||
      this.justPressedKeys['Enter'];

    return spaceJustPressed || zJustPressed || enterJustPressed || this.touchActionJustPressed;
  }

  public isActionHeld(): boolean {
    return (
      this.keys[' '] ||
      this.keys['Space'] ||
      this.keys['z'] ||
      this.keys['KeyZ'] ||
      this.keys['enter'] ||
      this.touchAction
    );
  }
}
