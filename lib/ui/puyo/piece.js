/* eslint-env browser */
import { el, mount } from 'redom';
import isEqual from 'lodash/isEqual';

import Block from './block';
import { touchmove, touchend } from './touch-events';

import { emptyPuyo } from '../../common/puyo/basic';

function limitX(x, rotation, width) {
  let minX = 0;
  let maxX = width - 1;

  rotation -= Math.floor(rotation / 4) * 4;
  if (rotation === 3) {
    minX = 1;
  } else if (rotation === 1) {
    maxX = width - 2;
  }
  return Math.max(minX, Math.min(maxX, x));
}

function getXY2(x, rotation) {
  let x2 = x;
  let y2 = 0;
  if (rotation === 1) {
    ++x2;
    y2 = 1;
  } else if (rotation === 2) {
    y2 = 2;
  } else if (rotation === 3) {
    --x2;
    y2 = 1;
  }
  return [x2, y2];
}

function makePuyos(x, rotation, deal, width) {
  const rows = Array(3 * width).fill(emptyPuyo);
  const [x2, y2] = getXY2(x, rotation);

  rows[x + width] = deal[0];
  rows[x2 + (width * y2)] = deal[1];
  return rows;
}

export default class Piece {
  constructor({ grid, x, rotation, deal, canPlay = true }) {
    this.grid = grid;
    this.el = el('.piece');
    if (canPlay) {
      this.el.classList.add('active');
    } else {
      this.el.classList.add('pending');
    }
    this.state = { x, rotation, deal, canPlay };
    this.previewX = x;
    this.previewRotation = rotation;

    // Construct blocks and mount them.
    const blocks = this.blocks;

    this.blockEls = [];
    for (let y = 0; y < 3; ++y) {
      for (let x = 0; x < this.grid.width; ++x) {
        const block = new Block({ x, y });

        mount(this.el, block);
        block.update({ color: blocks[this.blockEls.length] });
        this.blockEls.push(block);
      }
    }
  }

  installEventListeners() {
    this.blockEls.forEach((block) => {
      block.el.addEventListener('mouseenter', (ev) => {
        ev.preventDefault();
        this.x = block.x;
      });
      block.el.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (block.y === 0) {
          this.rotation -= 1;
        } else {
          this.rotation += 1;
        }
        this.x = block.x;
      });
      block.el.addEventListener('touchstart', (ev) => {
        ev.preventDefault();  // Prevents the emulated mouse event
        if (block.y === 0) {
          this.rotation -= 1;
        } else {
          this.rotation += 1;
        }
      });

      // Touch semi-hacks
      block.el.dataset.x = block.x;
      block.el.dataset.y = block.y;
      block.el.addEventListener('touchmove', ev => touchmove.bind(this)(ev));
      block.el.addEventListener('touchend', ev => touchend.bind(this)(ev));
    });
  }

  get x() {
    return this.state.x;
  }

  set x(x) {
    x = limitX(x, this.state.rotation, this.grid.width);
    this.update({ x });
    this.grid.update();
  }

  get rotation() {
    return this.state.rotation;
  }

  set rotation(rotation) {
    const x = limitX(this.x, rotation, this.grid.width);

    rotation -= Math.floor(rotation / 4) * 4;
    this.update({ x, rotation });
    this.grid.update();
  }

  get deal() {
    return this.state.deal;
  }

  set deal(deal) {
    this.update({ deal });
  }

  get canPlay() {
    return this.state.canPlay;
  }

  set canPlay(canPlay) {
    this.update({ canPlay });
    this.grid.update();
  }

  get blocks() {
    return makePuyos(this.state.x, this.state.rotation, this.state.deal, this.grid.width);
  }

  get previewPuyos() {
    const puyos = [];
    const blocks = this.grid.previousState.blocks;
    const x = this.previewX;
    const rotation = this.previewRotation;
    const [x2, y2] = getXY2(x, rotation);
    let y;

    for (y = 0; y * this.grid.width < blocks.length; ++y) {
      if (blocks[x + (y * this.grid.width)]) {
        break;
      }
    }
    if (y2 === 2) {
      --y;
    }
    if (y > 0) {
      puyos.push({ x, y: (y - 1), color: this.deal[0] });
    }
    for (y = 0; y * this.grid.width < blocks.length; ++y) {
      if (blocks[x2 + (y * this.grid.width)]) {
        break;
      }
    }
    if (y2 === 0) {
      --y;
    }
    if (y > 0) {
      puyos.push({ x: x2, y: (y - 1), color: this.deal[1] });
    }

    return puyos;
  }

  update({ x = this.state.x, rotation = this.state.rotation, deal = this.deal, canPlay = this.canPlay }) {
    if (
      x === this.state.x && rotation === this.state.rotation &&
      isEqual(deal, this.deal) && canPlay === this.canPlay
    ) {
      return;
    }
    this.state = { x, rotation, deal, canPlay };
    if (canPlay) {
      this.previewX = x;
      this.previewRotation = rotation;
      this.el.classList.add('active');
      this.el.classList.remove('pending');
    } else {
      this.el.classList.remove('active');
      this.el.classList.add('pending');
    }

    this.blocks.forEach((color, index) => {
      this.blockEls[index].update({ color });
    });
  }
}
