import Game from "./game";
import Screen from "./screen";
import GameEngine from "./engine";
import Controller from "./controller";

const controller = new Controller();

// GAME
const game = new Game();

// SCREEN
const screen = new Screen(document.querySelector("canvas"));

screen.buffer.canvas.height = game.world.height;
screen.buffer.canvas.width = game.world.width;

// GAME ENGINE
const update = () => {
  if (controller.left.active) {
    game.world.player.moveLeft();
  }
  if (controller.right.active) {
    game.world.player.moveRight();
  }
  if (controller.up.active) {
    game.world.player.jump();
    controller.up.active = false;
  }

  game.update();
};

const render = () => {
  screen.drawBackground();
  screen.drawMap(game.world.map);

  const { direction } = game.world.player;

  screen.drawPlayer(
    game.world.player.animator.frameValue,
    game.world.player.getLeft(),
    game.world.player.getTop(),
    60,
    40,
    direction < 0 ? -32 : -16,
    -24
  );
  screen.render();
};

const resize = () => {
  screen.resize(
    document.documentElement.clientWidth - 32,
    document.documentElement.clientHeight - 32,
    game.world.height / game.world.width
  );
  screen.render();
};

resize();

const engine = new GameEngine(1000 / 30, update, render);
engine.start();

// EVENTS HANDLER
const keyDownUp = ({ type, keyCode }) => {
  controller.keyDownUp(type, keyCode);
};

window.addEventListener("keydown", keyDownUp);
window.addEventListener("keyup", keyDownUp);
window.addEventListener("resize", resize);
