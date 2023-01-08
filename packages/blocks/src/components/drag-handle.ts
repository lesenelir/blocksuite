import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { IPoint } from '../__internal__/index.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { EditingState } from '../page-block/default/utils.js';
import { assertExists, getBlockElementByModel } from '../__internal__/index.js';

@customElement('affine-drag-indicator')
export class DragIndicator extends LitElement {
  static styles = css`
    .affine-drag-indicator {
      position: fixed;
      height: 3px;
      background: var(--affine-primary-color);
      transition: top, left 300ms, 100ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,
        transform 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    }
  `;

  @property()
  targetRect: DOMRect | null = null;

  @property()
  cursorPosition: IPoint | null = null;

  override render() {
    if (!this.targetRect || !this.cursorPosition) {
      return null;
    }
    const rect = this.targetRect;
    const distanceToTop = Math.abs(rect.top - this.cursorPosition.y);
    const distanceToBottom = Math.abs(rect.bottom - this.cursorPosition.y);
    return html`
      <div
        class="affine-drag-indicator"
        style=${styleMap({
          width: `${rect.width + 10}px`,
          left: `${rect.left}px`,
          top: `${distanceToTop < distanceToBottom ? rect.top : rect.bottom}px`,
        })}
      ></div>
    `;
  }
}

export type DragHandleGetModelStateCallback = (
  pageX: number,
  pageY: number,
  skipX?: boolean
) => EditingState | null;

@customElement('affine-drag-handle')
export class DragHandle extends LitElement {
  static styles = css`
    .affine-drag-handle {
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 24px;
      border-radius: 3px;
      fill: rgba(55, 53, 47, 0.35);
      background: rgba(55, 53, 47, 0.08);
    }
  `;

  constructor(options: {
    onDropCallback: (
      e: DragEvent,
      startModelState: EditingState,
      lastModelState: EditingState
    ) => void;
    getBlockEditingStateByPosition: DragHandleGetModelStateCallback;
    setSelectedBlocks: (selectedBlocks: Element[]) => void;
  }) {
    super();
    this.onDropCallback = options.onDropCallback;
    this.setSelectedBlocks = options.setSelectedBlocks;
    this._getBlockEditingStateByPosition =
      options.getBlockEditingStateByPosition;
  }

  @property()
  public onDropCallback: (
    e: DragEvent,
    startModelState: EditingState,
    lastModelState: EditingState
  ) => void;

  @property()
  public setSelectedBlocks: (selectedBlocks: Element[]) => void;

  private _startModelState: EditingState | null = null;

  private _lastModelState: EditingState | null = null;
  private _indicator!: DragIndicator;

  private _getBlockEditingStateByPosition: DragHandleGetModelStateCallback | null =
    null;

  protected firstUpdated() {
    this.setAttribute('draggable', 'true');
    this.style.display = 'none';
  }

  public show(startModelState: EditingState) {
    this._startModelState = startModelState;
    const rect = this._startModelState.position;
    this.style.position = 'absolute';
    this.style.display = 'block';
    this.style.left = `${rect.left - 20}px`;
    this.style.top = `${rect.top + 8}px`;
  }

  public hide() {
    this.style.display = 'none';
    this._startModelState = null;
    this._lastModelState = null;
    this._indicator.cursorPosition = null;
    this._indicator.targetRect = null;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._indicator = <DragIndicator>(
      document.createElement('affine-drag-indicator')
    );
    document.body.appendChild(this._indicator);
    this.addEventListener('mousedown', this._onMouseDown);
    this.addEventListener('mouseleave', this._onMouseLeave);
    this.addEventListener('dragstart', this._onDragStart);
    this.addEventListener('drag', this._onDrag);
    this.addEventListener('dragend', this._onDragEnd);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._indicator.remove();
    this.removeEventListener('mousedown', this._onMouseDown);
    this.removeEventListener('mouseleave', this._onMouseLeave);
    this.removeEventListener('dragstart', this._onDragStart);
    this.removeEventListener('drag', this._onDrag);
    this.removeEventListener('dragend', this._onDragEnd);
  }

  private _onMouseDown = (e: MouseEvent) => {
    const clickDragState = this._getBlockEditingStateByPosition?.(
      e.pageX,
      e.pageY,
      true
    );
    if (clickDragState) {
      this.setSelectedBlocks([
        getBlockElementByModel(clickDragState.model) as HTMLElement,
      ]);
    }
  };

  private _onMouseLeave = (_: MouseEvent) => {
    this.setSelectedBlocks([]);
  };

  private _onDragStart = (e: DragEvent) => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  private _onDrag = (e: DragEvent) => {
    const modelState = this._getBlockEditingStateByPosition?.(
      e.pageX,
      e.pageY,
      true
    );
    if (modelState) {
      this._lastModelState = modelState;
      this._indicator.targetRect = modelState.position;
    }
    this._indicator.cursorPosition = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  private _onDragEnd = (e: DragEvent) => {
    assertExists(this._lastModelState);
    assertExists(this._startModelState);

    this.onDropCallback?.(e, this._startModelState, this._lastModelState);

    this.hide();
  };

  override render() {
    return html`
      <div class="affine-drag-handle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 128 512"
          style="width: 14px; height: 14px; display: block; flex-shrink: 0; backface-visibility: hidden;"
        >
          <path
            d="M64 360c30.9 0 56 25.1 56 56s-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56zm0-160c30.9 0 56 25.1 56 56s-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56zM120 96c0 30.9-25.1 56-56 56S8 126.9 8 96S33.1 40 64 40s56 25.1 56 56z"
          />
        </svg>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-drag-handle': DragHandle;
    'affine-drag-indicator': DragIndicator;
  }
}