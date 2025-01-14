import Game from "./game";
import Screen from "./screen";
import GameEngine from "./engine";
import Controller from "./controller";
import MouseInput from "./controller/mouse-input";

import { uid, getData, setData, preLoadAndFetch } from "./util";

preLoadAndFetch();

import areas from "./areas";

let loadingActive = false;
let controllerActive = false;
const isTouchesEnabled = "ontouchstart" in document.documentElement;

const helpBtn = document.getElementById("helpBtn");
const infoBtn = document.getElementById("infoBtn");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const soundBtn = document.getElementById("soundBtn");
const musicBtn = document.getElementById("musicBtn");
const helpScreen = document.getElementById("helpScreen");
const helpCloseBtn = document.getElementById("helpCloseBtn");
const infoScreen = document.getElementById("infoScreen");
const infoCloseBtn = document.getElementById("infoCloseBtn");
const refreshBtn = document.getElementById("refreshBtn");
const startTitle = document.getElementById("startTitle");
const scoreTitle = document.getElementById("scoreTitle");
const startScreen = document.getElementById("startScreen");
const controllers = document.querySelectorAll(".controller");
const loadingScreen = document.getElementById("loadingScreen");
const progressValue = document.getElementById("progressValue");
const persistentControllers = document.querySelectorAll(".persistent-controller");

const toggleSoundBtn = (value) => {
  soundBtn.classList[value ? "add" : "remove"]("cancel-cross");
};

const toggleMusicBtn = (value) => {
  musicBtn.classList[value ? "add" : "remove"]("cancel-cross");
};

const toggleControllers = (value) => {
  controllerActive = value;
  controllers.forEach(
    (controller) => (controller.style.visibility = isTouchesEnabled && value ? "visible" : "hidden")
  );
  persistentControllers.forEach(
    (controller) => (controller.style.visibility = value ? "visible" : "hidden")
  );
};

const toggleHelpScreen = (value) => {
  helpScreen.style.visibility = !value ? "hidden" : "visible";
};

const toggleInfoScreen = (value) => {
  infoScreen.style.visibility = !value ? "hidden" : "visible";
};

const toggleStartScreen = (value) => {
  startScreen.style.visibility = !value ? "hidden" : "visible";
};

const toggleLoadingScreen = (value) => {
  loadingActive = value;
  loadingScreen.style.visibility = !value ? "hidden" : "visible";
};

const setProgressValue = (value) => {
  progressValue.style.width = `${value}%`;
};

window.addEventListener("load", function () {
  "use strict";

  let areaId = 1;
  let loaded = false;
  let paused = false;
  let areaNumber = 1;
  let worldChanged = false;
  const totalAreaNumber = 4;

  toggleSoundBtn(getData("mute_sounds"));
  toggleMusicBtn(getData("mute_music"));
  clearInterval(loadInterval);
  toggleLoadingScreen(false);
  setProgressValue(0);

  const controller = new Controller();

  // GAME
  const game = new Game((score) => {
    startTitle.textContent = "Game Over";
    scoreTitle.textContent = "Score: " + score;

    const savedScore = getData("high_score") || 0;
    const highScore = savedScore < score ? score : savedScore;
    setData("high_score", savedScore < score ? score : savedScore);

    if (highScore) {
      document.getElementById("highScore").innerHTML = `High Score: ${highScore}`;
    }

    setTimeout(() => {
      toggleStartScreen(true);
    }, 1500);
  });

  const setupWorld = () => {
    game.world.setup(areas[areaId]);
  };

  // SCREEN
  let screen;

  const setupScreen = () => {
    screen = new Screen(document.querySelector("canvas"), areas[areaId].world);

    screen.buffer.canvas.height = game.world.height;
    screen.buffer.canvas.width = game.world.width;
  };

  setupScreen();

  // GAME ENGINE

  const loadPercent = () => {
    const totalAssets = (worldChanged ? 0 : game.world.assetCount) + screen.assetCount;
    const totalLoaded = (worldChanged ? 0 : game.world.loadCount) + screen.loadCount;

    return Math.round((totalLoaded / totalAssets) * 100);
  };

  const isLoaded = () => {
    return game.isLoaded() && screen.isLoaded();
  };

  const update = () => {
    loaded = isLoaded();
    const loadValue = loadPercent();

    if (loadValue < 100) {
      setProgressValue(loadValue == 99 ? 100 : loadValue);
    }

    if (!loaded) {
      if (controllerActive) {
        toggleControllers(false);
      }
      if (!loadingActive) {
        toggleLoadingScreen(true);
      }
    } else {
      if (loadingActive) {
        toggleLoadingScreen(false);
        setProgressValue(0);
      }
      if (!controllerActive) {
        toggleControllers(true);
      }
    }

    if (!game.over && loaded && !paused) {
      const { player } = game.world;

      if (controller.left.active) {
        player.moveLeft();
      }
      if (controller.right.active) {
        player.moveRight();
      }
      if (controller.up.active) {
        if (!player.jumping) {
          game.world.playJumpSound();
        }
        player.jump();
        controller.up.active = false;
      }
      if (controller.fire.active && !player.firing) {
        const { fireballs } = game.world;
        const offsetX = player.direction < 0 ? -32 : 8;

        player.fire();
        game.world.playFireSound();
        fireballs.add(uid(), player.x + offsetX, player.y - 16, player.direction);
        controller.fire.active = false;
      }
    }

    if (game.world.portal) {
      worldChanged = true;
      engine.hold();

      const { direction, destinationArea } = game.world.portal;
      if (destinationArea !== areaId) {
        if (direction < 0) {
          areaNumber--;
        } else {
          areaNumber++;
        }

        if (areaNumber >= totalAreaNumber) {
          areaNumber = 1;
        }
        if (areaNumber <= 0) {
          areaNumber = totalAreaNumber;
        }
      }

      areaId = destinationArea;

      setupWorld();
      setupScreen();

      engine.resume();
    }

    game.update();
  };

  const render = () => {
    screen.drawBackground();
    screen.drawMap(game.world.map);
    screen.drawMapObjects(game.world.objects);
    // screen.drawArea(game.world.portals);
    // screen.drawArea(game.world.enemies.items);

    // draw coins
    if (game.world.coins) {
      for (let index = 0; index < game.world.coins.items.length; index++) {
        const coin = game.world.coins.items[index];

        screen.drawObject(
          coin.animator.frameValue,
          coin.x,
          coin.y,
          coin.width,
          coin.height,
          coin.offsetX,
          coin.offsetY
        );
        // screen.drawText(coin.id, coin.x, coin.y);
        // screen.drawRect(coin);
      }
    }

    // draw water animations
    if (game.world.water) {
      for (let index = 0; index < game.world.water.items.length; index++) {
        const waterItem = game.world.water.items[index];

        screen.drawObject(
          waterItem.animator.frameValue,
          waterItem.x,
          waterItem.y,
          waterItem.width,
          waterItem.height,
          waterItem.offsetX,
          waterItem.offsetY
        );
      }
    }

    // draw fireballs
    if (game.world.fireballs) {
      for (let index = 0; index < game.world.fireballs.items.length; index++) {
        const fireball = game.world.fireballs.items[index];

        screen.drawObject(
          fireball.animator.frameValue,
          fireball.x,
          fireball.y,
          fireball.width,
          fireball.height
        );
      }
    }

    if (game.world.enemies) {
      for (let index = 0; index < game.world.enemies.items.length; index++) {
        const enemy = game.world.enemies.items[index];

        screen.drawObject(
          enemy.animator.frameValue,
          enemy.x,
          enemy.y,
          enemy.width,
          enemy.height,
          0,
          1
        );
      }
    }

    // draw player
    const xOffset = game.world.player.direction < 0 ? -36 : -12;

    screen.drawPlayer(
      game.world.player.animator.frameValue,
      game.world.player.getLeft(),
      game.world.player.getTop(),
      60,
      40,
      xOffset,
      -24
    );

    // draw coin count
    const coinTextOffest =
      game.world.totalCoins >= 10 && game.world.totalCoins <= 99
        ? 3
        : game.world.totalCoins > 99
        ? 3.4
        : 2.7;
    const image = new Image();
    image.src = "./assets/sprites/coin/image 1.webp";
    screen.drawObject(image, (game.world.columns - 1.3) * 16, 8, 10, 10);
    screen.drawText("x", (game.world.columns - 2) * 16, 15);
    screen.drawText(game.world.totalCoins, (game.world.columns - coinTextOffest) * 16, 16.1);

    screen.drawText(areaNumber, 48, 15.3);
    screen.drawText("Area", 12, 15.3);
    screen.drawText("x", 38, 15);

    const score = game.world.totalEnemies * 100 + game.world.totalCoins * 20;
    const scoreTextOffest = score >= score >= 10 && score <= 99 ? 3 : score > 99 ? 3.4 : 2.7;
    screen.drawText(score, (game.world.columns - scoreTextOffest) * 9, 15.3);

    screen.render();
  };

  const resize = () => {
    let width = document.documentElement.clientWidth;
    let height = document.documentElement.clientHeight;

    if (width < 600) {
      [width, height] = [height, width];
    }

    screen.resize(width - 4, height - 4, game.world.height / game.world.width);
    screen.render();
  };

  resize();

  var engine = new GameEngine(1000 / 30, update, render);

  // EVENTS HANDLER
  const keyDownUp = ({ type, keyCode }) => {
    controller.keyDownUp(type, keyCode);
  };

  window.addEventListener("keydown", keyDownUp);
  window.addEventListener("keyup", keyDownUp);
  window.addEventListener("resize", resize);

  const leftMouse = new MouseInput("leftBtn", (e) => {
    clearMouse();
    controller.keyDownUp(e, 37);
  });
  const rightMouse = new MouseInput("rightBtn", (e) => {
    clearMouse();
    controller.keyDownUp(e, 39);
  });
  const upMouse = new MouseInput("jumpBtn", (e) => {
    clearMouse();
    controller.keyDownUp(e, 32);
  });

  const fireMouse = new MouseInput("fireBtn", (e) => {
    clearMouse();
    controller.keyDownUp(e, 13);
  });

  const clearMouse = () => {
    upMouse.actions.clear();
    fireMouse.actions.clear();
    leftMouse.actions.clear();
    rightMouse.actions.clear();
  };

  startBtn.onclick = () => {
    clearMouse();
    startTitle.textContent = "";
    scoreTitle.textContent = "";
    toggleStartScreen(false);

    if (paused) {
      paused = false;

      game.world.playThemeMusic();
      startBtn.textContent = "play";
    } else {
      game.world.reset();
      game.over = false;

      engine.hold();

      areaId = 1;
      areaNumber = 1;

      setupWorld();
      setupScreen();

      resize();

      engine.resume();
    }

    if (!engine.started) {
      engine.start();
    }
  };

  pauseBtn.onclick = () => {
    clearMouse();
    toggleStartScreen(true);

    game.world.pauseThemeMusic();
    startBtn.textContent = "resume";

    paused = true;
  };

  refreshBtn.onclick = () => {
    areaNumber = 1;
    startBtn.click();
  };

  soundBtn.onclick = () => {
    const isMuted = !getData("mute_sounds");

    setData("mute_sounds", isMuted);
    toggleSoundBtn(isMuted);
  };

  musicBtn.onclick = () => {
    const isMuted = !getData("mute_music");

    setData("mute_music", isMuted);
    toggleMusicBtn(isMuted);
  };

  helpBtn.onclick = () => {
    toggleHelpScreen(true);
  };

  helpCloseBtn.onclick = () => {
    toggleHelpScreen(false);
  };

  infoBtn.onclick = () => {
    toggleInfoScreen(true);
  };

  infoCloseBtn.onclick = () => {
    toggleInfoScreen(false);
  };

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      if (!paused) {
        game.world.playThemeMusic();
      }
    } else {
      game.world.pauseThemeMusic();
    }
  });

  // startBtn.click();
});
