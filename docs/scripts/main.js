
var getTickerDt = function(ticker) {
  var ms = Math.min(ticker.elapsedMS, ticker._maxElapsedMS);
  return ms / 1000 * ticker.speed;
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
  { position: { x: 600, y: 1650 }, assetPath: ASSET_PATHS.ORNAMENT1, type: 1 },
  { position: { x: 800, y: 1600 }, assetPath: ASSET_PATHS.ORNAMENT2, type: 2 },
  { position: { x: 700, y: 1500 }, assetPath: ASSET_PATHS.ORNAMENT3, type: 3 }
];

var startingOrnaments = [
    ORNAMENT_DATA[0]
];

var edges = [
    [ORNAMENT_DATA[0], ORNAMENT_DATA[1]],
    [ORNAMENT_DATA[1], ORNAMENT_DATA[2]]
];

var HEIGHT = 1080;
var WIDTH = 1920;

var FPS = 60;

var ELF_SPEED = 10000; // units/sec

var eventQueue = [];
var g_currOrnament = null;
var g_elfJumpTweens = [];

var EMPTY_LIST = [];

var canJumpToOrnament = function(currOrnament, nextOrnament) {
  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
        
    if ( edge.indexOf(currOrnament) !== -1 && edge.indexOf(nextOrnament) !== -1) {
      return true;
    }
  }

  return false;
}

var getAvailableOrnaments = function (currOrnament) {
    if (currOrnament == null) {
        return startingOrnaments;
    }

    var availableOrnaments = [];

    for (var i = 0; i < edges.length; i++) {
        var edge = edges[i];

        var currOrnamentIndex = edge.indexOf(currOrnament);
        if (currOrnamentIndex == -1) { continue; }

        // Note: tightly coupled to edge data structure here
        var otherOrnament = edge[(currOrnamentIndex + 1) % 2]
        availableOrnaments.push(otherOrnament);
    }

    return availableOrnaments;
}

var linear = function(t, start, end) {
  return start + (end - start) * t;
};

// var expoInOut = function(t, start, end) {
//   if (t === 0) { return start; }
//   if (t === 1) { return end; }

//   var t2 = t * 2;

//   if (t2 < 1) { 
//     return ((end - start) / 2) * (Math.pow(2, 10 * (t2 - 1)) + start);
//   } else {
//     return ((end - start) / 2) * (-Math.pow(2, -10 * (t2 - 1)) + 2) + start; 
//   }
// };

// var quadIn = function(t, start, end) {
//   return (end - start) * (t * t) + start;
// };

// var quadOut = function(t, start, end) {
//   return (start - end) * (t * (t - 2)) + start;
// };

// var quadOutIn = function(t, start, end) {
//   var t2 = t * 2;

//   if (t2 < 1) {
//     return quadOut(t2, start, end / 2);
//   } else {
//     return quadIn(t2-1, end / 2, end);
//   }
// }

// fast -> slow -> fast
var lutEasing = function (lut, t) {
  var idx = Math.floor(linear(t, 0, lut.length)); 
  return lut[idx];
};


// var GRAVITY = 9.8;

// var quad = function(t, start, end) {
//   return (GRAVITY / 2) * (t * t) + (start - end + (GRAVITY / 2)) * t + start;
// };


var createJumpLut = function(startx, starty, endx, endy, duration) {
  var t = 0;
  var bezier = new Bezier(
    startx, starty,
    startx, starty - BEZIER_JUMP_HEIGHT,
    endx, endy - BEZIER_JUMP_HEIGHT,
    endx, endy
  );3

  var lut = new Array(Math.floor(duration * FPS));

  for (var i = 0; i < duration * FPS; i++) {
//    lut[i] = bezier.get(t / duration);
    lut[i] = {
      x: linear(t / duration, startx, endx),
//       x: bezier.get(t / duration).x,//quad(t / duration, starty, endy)
      y: bezier.get(t / duration).y//quad(t / duration, starty, endy)
    }
    t += (1 / FPS);
    //t = quadOutIn(i/lut.length, 0, duration);
    //t = quadOutIn(i/lut.length, 0, duration);
  }

  return lut;
};

var BEZIER_JUMP_HEIGHT = 150;
// TODO: precalc all of these on startup and create LUTs for each edge direction
var createJumpEasingFn = function (startX, startY, endX, endY, duration) {
//   var bezier = new Bezier(
//     startX, startY,
//     startX, startY - BEZIER_JUMP_HEIGHT,
//     endX, endY - BEZIER_JUMP_HEIGHT,
//     endX, endY
//   );

  //return bezierEasing.bind(null, bezier.getLUT(FPS * duration));
  return lutEasing.bind(null, createJumpLut(startX, startY, endX, endY, duration));
};


var createTween = function (obj, start, end, duration, easingFunc, onComplete) {
  onComplete = onComplete || null;

  var tween =  {
    obj: obj,
    start: start,
    end: end,
    duration: duration,
    easingFunc: easingFunc,
    onComplete: onComplete,
    t: 0
  };

  return tween;
};

var updateTween = function (dt, tween) {
  var obj = tween.obj;

  for (var prop in tween.end) {
    if (!tween.end.hasOwnProperty(prop)) { continue; }

    var newVal = tween.easingFunc(tween.t / tween.duration, tween.start[prop], tween.end[prop]);
    // TODO: CLEAN UP THIS CHECK! There has to be a way..
    if (newVal[prop]) {
      obj[prop] = newVal[prop]; // assume newVal has same props as tween.start/end
    } else {
      obj[prop] = newVal;
    }
  }
  
  tween.t = Math.min(tween.t + dt, tween.duration);

  if (tween.t >= tween.duration && tween.onComplete) {
    tween.onComplete(tween);
  }
};

var jumpToOrnament = function (elf, ornament) {
  var duration = 0.5;

  var bezierEasing = createJumpEasingFn(elf.x, elf.y, ornament.position.x, ornament.position.y, duration);

  var startPoint = new PIXI.Point(elf.x, elf.y);

  var xTween = createTween(elf.position, startPoint, ornament.position, duration, bezierEasing, function (tween) {
    var tweenIdx = g_elfJumpTweens.indexOf(tween);
    g_elfJumpTweens.splice(tweenIdx, 1);
    g_currOrnament = ornament;
  });
  g_elfJumpTweens.push(xTween);
};


var getKeyForOrnament = function (ornament) {
  return ornament.type.toString();
};

var isJumping = function () {
  return g_elfJumpTweens.length > 0;
}

var processKeyDown = function(dt, event, sceneIndex) {
  var elf = sceneIndex.elf;

  // TODO: Precalculate all of this stuff (keep the handler cheap + won't scale with graph size)
  var availableOrnaments = isJumping() ? EMPTY_LIST : getAvailableOrnaments(g_currOrnament);

  var keyToOrnamentMap = {};
  for (var i = 0; i < availableOrnaments.length; i++) {
    var ornament = availableOrnaments[i];
    var key = getKeyForOrnament(ornament);

    if (keyToOrnamentMap[key]) {
      console.warn('WARNING! MULTIPLE ORNAMENTS FOUND FOR KEY ' + key);
    }

    keyToOrnamentMap[key] = ornament;
  }

  console.log("Available Keys: " + Object.keys(keyToOrnamentMap).toString());

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
    
    default:
      var ornament = keyToOrnamentMap[event.key];
      if (!ornament) { break; }

      jumpToOrnament(sceneIndex.elf, ornament);
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

   for (var i = 0; i < g_elfJumpTweens.length; i++) {
     updateTween(dt, g_elfJumpTweens[i]);
   }
};

var run = function(renderer, sceneIndex) {
  update(getTickerDt(PIXI.ticker.shared), sceneIndex);
  renderer.render(sceneIndex.root);
};

var setupElf = function(elf, bg) {
  elf.scale.set(0.25);
  elf.anchor.set(0.5, 1); // anchor at feet
  elf.x = WIDTH / 2;
  elf.y = bg.height;
};

var setupBg = function(bg) {
  bg.scale.set(5);
}

var setupOrnaments = function(ornamentContainer) {
  ornamentContainer.children.forEach(function(ornament) {
      ornament.anchor.set(0.5);
      ornament.scale.set(0.5);
  });
};

var setupCamera = function(worldContainer) {
  worldContainer.x = 0;
  worldContainer.y = -worldContainer.height + HEIGHT;
}

var setupScene = function(sceneIndex) {
  setupBg(sceneIndex.bg);
  setupElf(sceneIndex.elf, sceneIndex.bg);
  setupOrnaments(sceneIndex.ornamentContainer);
  setupCamera(sceneIndex.worldContainer);
};

var startGame = function(renderer, sceneIndex) {
  setupScene(sceneIndex);
  PIXI.ticker.shared.add(run.bind(null, renderer, sceneIndex));
};



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
