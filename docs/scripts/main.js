
var getTickerDt = function(ticker) {
  var ms = Math.min(ticker.elapsedMS, ticker._maxElapsedMS);
  return ms / 1000 * ticker.speed;
};

var HEIGHT = 1080;
var WIDTH = 1920;

var ELF_SPEED = 10000; // units/sec

var eventQueue = [];

var processKeyDown = function(dt, event, sceneIndex) {
  var elf = sceneIndex.elf;

  switch(event.key) {
    case 'ArrowUp':
      elf.y -= dt * ELF_SPEED;
      break;

    case 'ArrowDown':
      elf.y += dt * ELF_SPEED;
      break;

    case 'ArrowLeft':
      elf.x -= dt * ELF_SPEED;
      break;

    case 'ArrowRight':
      elf.x += dt * ELF_SPEED;
      break;
  }
}

var processInput = function(dt, sceneIndex) {
  while (eventQueue.length) {
    var eventData = eventQueue.shift();
    switch (eventData.type) {
    case 'keydown':
      processKeyDown(dt, eventData.event, sceneIndex);

      // check for ornament type
      // see if possible to jump to ornament
      // if so, jump to ornament
    }
  }
};

var CAMERA_SPEED = 500;
var CAMERA_MOVEMENT_CUTOFF = 10; // how many px away from center until we skip movement?

var normalizeVector = function(vector) {
  var mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  return new PIXI.Point(vector.x / mag, vector.y / mag);
}

var followElf = function(dt, sceneIndex) {
  var elf = sceneIndex.elf;
  var elfBounds = elf.getLocalBounds();
  var elfPos = elf.position; //new PIXI.Point(
  //   elf.x + (elfBounds.width * elf.anchor.x) + (elfBounds.width / 2),
  //   elf.y - (elfBounds.height * elf.anchor.y) + (elfBounds.height / 2)
  // );

  var worldContainer = sceneIndex.worldContainer;

  var centerScreenInWorld = new PIXI.Point(
    (-worldContainer.x + (WIDTH / 2)),
    (-worldContainer.y + (HEIGHT / 2))
  );

  var vecFromElfToCenterScreen = new PIXI.Point(
    centerScreenInWorld.x - elfPos.x,
    centerScreenInWorld.y - elfPos.y
  );

  var scaledVecFromElfToCenterScreen = new PIXI.Point(
    vecFromElfToCenterScreen.x / (WIDTH / 2),
    vecFromElfToCenterScreen.y / (HEIGHT / 2)
  )

  var newPos = new PIXI.Point(
    worldContainer.x + CAMERA_SPEED * scaledVecFromElfToCenterScreen.x * dt,
    worldContainer.y + CAMERA_SPEED * scaledVecFromElfToCenterScreen.y * dt
  );

  if (Math.abs(vecFromElfToCenterScreen.x) >= CAMERA_MOVEMENT_CUTOFF) {
    worldContainer.x = Math.max(Math.min(newPos.x, 0), -worldContainer.width + WIDTH);
  }
  if (Math.abs(vecFromElfToCenterScreen.y) >= CAMERA_MOVEMENT_CUTOFF) {
    worldContainer.y = Math.max(Math.min(newPos.y, 0), -worldContainer.height + HEIGHT);
  }
};

var update = function (dt, sceneIndex) {
   processInput(dt, sceneIndex);
   followElf(dt, sceneIndex);
   // "follow" elf with camera
};

var run = function(renderer, sceneIndex) {
  update(getTickerDt(PIXI.ticker.shared), sceneIndex);
  renderer.render(sceneIndex.root);
};

var setupElf = function(elf, worldContainer) {
  elf.scale.set(0.5);
  elf.anchor.set(0.5, 1); // anchor at feet
  elf.x = WIDTH / 2;
  elf.y = HEIGHT;
};

var setupBg = function(bg) {
  bg.scale.set(5);
}

var setupOrnaments = function(ornamentContainer) {
  ornamentContainer.children.forEach(function(ornament) {
    ornament.anchor.set(0.5);
  });
};

var setupCamera = function(worldContainer) {
  worldContainer.x = 0;
  worldContainer.y = 0;
}

var setupScene = function(sceneIndex) {
  setupElf(sceneIndex.elf);
  setupBg(sceneIndex.bg);
  setupOrnaments(sceneIndex.ornamentContainer);
  setupCamera(sceneIndex.worldContainer);
};

var startGame = function(renderer, sceneIndex) {
  setupScene(sceneIndex);
  PIXI.ticker.shared.add(run.bind(null, renderer, sceneIndex));
};

var ASSET_PATHS = {
  BG: 'images/bg.jpg',
  ELF: 'images/elfboy.jpg',
  ORNAMENT1: 'images/ornament1.jpg',
  ORNAMENT2: 'images/ornament2.jpg',
  ORNAMENT3: 'images/ornament3.jpg',
  ORNAMENT4: 'images/ornament4.jpg'
}

var ORNAMENT_DATA = [
  {position: {x: 600, y: 600}, assetPath: ASSET_PATHS.ORNAMENT1},
  {position: {x: 500, y: 700}, assetPath: ASSET_PATHS.ORNAMENT2},
  {position: {x: 700, y: 700}, assetPath: ASSET_PATHS.ORNAMENT3}
];

// returns an index of {name: element}
var buildSceneGraph = function() {

  var root = new PIXI.Container();

    var worldContainer = new PIXI.Container();
    root.addChild(worldContainer);

      var bg = PIXI.Sprite.fromFrame(ASSET_PATHS.BG);
      worldContainer.addChild(bg);

      var ornamentContainer =  new PIXI.Container();
      worldContainer.addChild(ornamentContainer);

        // ornaments
        ORNAMENT_DATA.forEach(function(ornamentDatum) {
          var ornament = PIXI.Sprite.fromFrame(ornamentDatum.assetPath);
          ornament.position.set(ornamentDatum.position.x, ornamentDatum.position.y);
          ornamentContainer.addChild(ornament);
        });

      var elf = PIXI.Sprite.fromFrame(ASSET_PATHS.ELF);
      worldContainer.addChild(elf);

  return {
    root: root,
      worldContainer: worldContainer,
        bg: bg,
        ornamentContainer: ornamentContainer,
        elf: elf
  };
};

var addKeyHandlers = function() {
  window.addEventListener('keydown', function(e) {
    // push keydown event to event queue
    eventQueue.push({type: 'keydown', event: e});
  });

  window.addEventListener('keyup', function(e) {
    // push keyup event to event queue
    eventQueue.push({type: 'keyup', event: e});
  });
};

var load = function() {
  return new Promise(function(resolve, reject){
    var loader = new PIXI.loaders.Loader();

    for (let reference in ASSET_PATHS) {
      loader.add(ASSET_PATHS[reference]);
    }

    loader.once('complete', resolve);
    loader.once('error', reject);

    loader.load();
  });
};

var init = function() {
  var canvas = document.getElementById('root-canvas');
  var resolution = document.devicePixelRatio;

  var renderer = new PIXI.WebGLRenderer(WIDTH, HEIGHT, {
    view: canvas,
    resolution: resolution
  });

  load()
  .then(function() {
    // build scene
    var sceneIndex = buildSceneGraph();
    // add key handlers
    addKeyHandlers(canvas);

    // DEBUGGING
    window.sceneIndex = sceneIndex;

    startGame(renderer, sceneIndex);
  })
  .catch(function(e) {
    window.console.error('error loading resources!');
    window.console.error(e);
  })
};
