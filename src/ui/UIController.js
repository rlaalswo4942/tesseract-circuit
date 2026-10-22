import { STAGES } from '../data/stages.js';

const $ = (id) => document.getElementById(id);
const QUALITY_LABEL = { low: '낮음', medium: '중간', high: '높음' };

/** DOM only. Reads game state through the controller, never owns rules. */
export class UIController {
  constructor(game) {
    this.game = game;
    this.selected = game.progress.unlocked - 1;

    $('btn-start').onclick = () => game.play(this.selected);
    $('btn-reset-path').onclick = () => game.resetPath();
    $('btn-reset-view').onclick = () => game.resetView();
    $('btn-menu').onclick = () => game.openMenu();
    $('btn-next').onclick = () => game.play(game.stage.index + 1);
    $('btn-replay').onclick = () => game.play(game.stage.index);
    $('btn-complete-menu').onclick = () => game.openMenu();
    $('btn-tutorial-close').onclick = () => this.hideTutorial();
    $('quality-select').value = game.progress.quality;
    $('quality-select').onchange = (e) => game.setQuality(e.target.value);
    this.renderStageGrid();
  }

  renderStageGrid() {
    const { unlocked, cleared } = this.game.progress;
    this.selected = Math.min(this.selected, unlocked - 1);
    $('stage-grid').replaceChildren(
      ...STAGES.map((s, i) => {
        const b = document.createElement('button');
        b.innerHTML = `<b>${i + 1}</b>${s.name}`;
        b.disabled = i >= unlocked;
        b.title = b.disabled ? '이전 스테이지를 클리어하면 열립니다' : s.name;
        b.classList.toggle('cleared', cleared.includes(i));
        b.classList.toggle('selected', i === this.selected);
        b.onclick = () => {
          this.selected = i;
          this.renderStageGrid();
          this.game.preview(i);
        };
        return b;
      }),
    );
    $('btn-start').textContent = this.selected === 0 && !cleared.length ? '시작 — STAGE 1부터' : `STAGE ${this.selected + 1} 시작`;
  }

  showMenu() {
    this.renderStageGrid();
    $('menu').hidden = false;
    $('hud').hidden = true;
    $('complete').hidden = true;
    this.hideTutorial();
  }

  showGame(stage) {
    $('menu').hidden = true;
    $('complete').hidden = true;
    $('hud').hidden = false;
    $('hud-stage').textContent = `STAGE ${stage.index + 1} / ${STAGES.length}`;
    $('hud-name').textContent = stage.name.toUpperCase();
    if (stage.index === 0) {
      $('tutorial').hidden = false;
      clearTimeout(this.tutorialTimer);
      this.tutorialTimer = setTimeout(() => this.hideTutorial(), 14000);
    } else {
      this.hideTutorial();
    }
  }

  hideTutorial() {
    $('tutorial').hidden = true;
  }

  updateHud(pathLength, facesVisited, facesRequired) {
    $('hud-path').textContent = `경로 ${pathLength}`;
    $('hud-faces').textContent = `면 ${facesVisited}/${facesRequired}`;
    if (pathLength >= 3) this.hideTutorial();
  }

  showComplete(stage, moves, seconds) {
    const last = stage.index === STAGES.length - 1;
    $('complete-stats').textContent = `STAGE ${stage.index + 1} · ${moves}칸 · ${seconds.toFixed(1)}초${last ? ' — 모든 회로 복구 완료' : ''}`;
    $('btn-next').hidden = last;
    $('complete').hidden = false;
    $('hud').hidden = true;
    (last ? $('btn-replay') : $('btn-next')).focus();
  }

  setQuality(preset, auto) {
    $('quality-current').textContent = auto ? `현재: ${QUALITY_LABEL[preset]}` : '';
  }
}
