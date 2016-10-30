
var getTickerDt = function(ticker) {
  var ms = Math.min(ticker.elapsedMS, ticker._maxElapsedMS);
  return ms / 1000 * ticker.speed;
};

var ASSET_PATHS = {
    BG: 'images/bg.jpg',
    ELF: 'images/elfboy.jpg',
    CANDY_CANE: 'images/candycane.gif',
    ORNAMENTS: {
      1: 'images/ornament1.jpg',
      2: 'images/ornament2.jpg',
      3: 'images/ornament3.jpg',
      4: 'images/ornament4.jpg'
    }
};

//var ORNAMENT_DATA = [
//  { id: 0, position: { x: 600, y: 1650 }, assetPath: ASSET_PATHS.ORNAMENTS[1], type: 1 },
//  { id: 1, position: { x: 900, y: 1600 }, assetPath: ASSET_PATHS.ORNAMENTS[2], type: 2 },
//  { id: 2, position: { x: 700, y: 1400 }, assetPath: ASSET_PATHS.ORNAMENTS[3], type: 3 },
//];

//var startingOrnaments = [
//    ORNAMENT_DATA[0]
//];

//var edges = [
//    [ORNAMENT_DATA[0], ORNAMENT_DATA[1]],1
//    [ORNAMENT_DATA[1], ORNAMENT_DATA[2]],
//];

var CANDY_CANE_DATA = [
  { position: { x: 800, y: 1500 }, assetPath: ASSET_PATHS.CANDY_CANE},
]

var HEIGHT = 1080;
var WIDTH = 1920;

var FPS = 60;

var ELF_SPEED = 10000; // units/sec


var g_ornamentSpriteToData = new Map();
var g_ornamentDataToSprite = new Map();

var eventQueue = [];
var g_currOrnamentDatum = null;
var g_elfJumpTweens = [];
var g_score = 0;
var g_startTime = 0; // set in startGame

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

var jumpToOrnament = function (elf, ornamentDatum) {
  var duration = 0.5;

  var ornamentSprite = g_ornamentDataToSprite.get(ornamentDatum);

  var startPoint = new PIXI.Point(elf.x, elf.y);
  var endPoint = new PIXI.Point(ornamentSprite.x, ornamentSprite.y);

  var bezierEasing = createJumpEasingFn(startPoint.x, startPoint.y, endPoint.x, endPoint.y, duration);

  var jumpTween = createTween(elf.position, startPoint, endPoint, duration, bezierEasing, function (tween) {
    var tweenIdx = g_elfJumpTweens.indexOf(tween);
    g_elfJumpTweens.splice(tweenIdx, 1);
    g_currOrnamentDatum = ornamentDatum;
  });
  g_elfJumpTweens.push(jumpTween);
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
  var availableOrnaments = isJumping() ? EMPTY_LIST : getAvailableOrnaments(g_currOrnamentDatum);

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

var createOrnament = function(ornamentContainer, ornamentDatum) {
  var ornament = PIXI.Sprite.fromFrame(ornamentDatum.assetPath);
  ornament.position.set(ornamentDatum.position.x, ornamentDatum.position.y);
  ornament.anchor.set(0.5);
  ornament.scale.set(0.5);
  ornamentContainer.addChild(ornament);
  g_ornamentSpriteToData.set(ornament, ornamentDatum);  
  g_ornamentDataToSprite.set(ornamentDatum, ornament);  
};

var removeOrnament = function(ornamentSprite) {
  var ornamentDatum = g_ornamentSpriteToData.get(ornamentSprite);
  g_ornamentSpriteToData.delete(ornamentSprite);
  g_ornamentDataToSprite.delete(ornamentDatum);
  ornamentSprite.parent.removeChild(ornamentSprite);
};

var serializeOrnament = function(ornamentSprite) {
  var ornamentDatum = g_ornamentSpriteToData.get(ornamentSprite);
  return {
    position: {
      x: ornamentSprite.x,
      y: ornamentSprite.y
    },
    type: ornamentDatum.type,
    assetPath: ornamentDatum.assetPath,
  };
};

var serializeOrnaments = function(sceneIndex) {
  var ornaments = sceneIndex.ornamentContainer.children;
  var serializedOrnaments = [];

  ornaments.forEach(function(ornament) {
    serializedOrnaments.push(serializeOrnament(ornament));
  });

  return JSON.stringify(serializedOrnaments);
};

var deserializeOrnaments = function(sceneIndex, serializedOrnaments) {
  JSON.parse(serializedOrnaments).forEach(function(ornamentDatum) {
    createOrnament(sceneIndex.ornamentContainer, ornamentDatum)
  });
}

var saveOrnaments = function(sceneIndex) {
//   var serializedOrnaments = serializeOrnaments(sceneIndex);
//   localStorage['ornaments'] = serializeOrnaments(sceneIndex);
}

var loadOrnaments = function(sceneIndex) {
//   if (localStorage['ornaments']) {
//     while(sceneIndex.ornamentContainer.children.length) {
//       removeOrnament(sceneIndex.ornamentContainer.children[0]);
//     }
//     deserializeOrnaments(sceneIndex, localStorage['ornaments']);
//   }
};

var g_ornamentDragging = null;

var getWorldCoordsFromMouseEvent = function(event, worldContainer) {

  return event.getLocalPosition(worldContainer);
}

var mouseHitSprite = function(sprite, mouseEvent, worldContainer) {
  var spriteScreenBounds = sprite.getBounds();
  var spriteWorldBounds = new PIXI.Rectangle(
    spriteScreenBounds.x - worldContainer.x, 
    spriteScreenBounds.y - worldContainer.y,
    spriteScreenBounds.width, 
    spriteScreenBounds.height
  );

  var worldCoords = getWorldCoordsFromMouseEvent(mouseEvent, sceneIndex.worldContainer);

  return spriteWorldBounds.contains(worldCoords.x, worldCoords.y);
};

var processMouseDown = function(event, sceneIndex) {
  var worldCoords = getWorldCoordsFromMouseEvent(event, sceneIndex.worldContainer);  

  if (event.originalEvent.ctrlKey) {
    var strType = window.prompt("Enter type (1, 2, 3, or 4)");
    var type = parseInt(strType.trim(), 10);
    if (type < 1 || type > 4) {
      alert('Invalid type! Please enter number from 1 - 4');
    }
    createOrnament(sceneIndex.ornamentContainer, {
      position: {
        x: worldCoords.x,
        y: worldCoords.y
      },
      type: type,
      assetPath: ASSET_PATHS.ORNAMENTS[type]
    });
  }

  for (var i = 0; i < sceneIndex.ornamentContainer.children.length; i++) {
    var ornament = sceneIndex.ornamentContainer.children[i];
    
    if (mouseHitSprite(ornament, event, sceneIndex.worldContainer)) {
      g_ornamentDragging = ornament;
      break;
    }
  }

  if (event.originalEvent.shiftKey && g_ornamentDragging) {
    removeOrnament(g_ornamentDragging);
    g_ornamentDragging = null;
  }
};

var processMouseMove = function(event, sceneIndex) {
  if (event.originalEvent.buttons !== 1) { return; } // left mouse button not pressed
  if (!g_ornamentDragging) { return; } // no ornament is being dragged

  var worldCoords = getWorldCoordsFromMouseEvent(event, sceneIndex.worldContainer);

  g_ornamentDragging.position.set(worldCoords.x, worldCoords.y);

};

var processMouseUp = function(event, sceneIndex) {
  if (event.originalEvent.buttons & 1) { return; } // left button in still down

  saveOrnaments(sceneIndex);
  g_ornamentDragging = null;
};

var processInput = function(dt, sceneIndex) {
  while (eventQueue.length) {
    var eventData = eventQueue.shift();
    switch (eventData.type) {
    case 'keydown':
      processKeyDown(dt, eventData.event, sceneIndex);
      break;

    case 'mousedown':
      processMouseDown(eventData.event, sceneIndex);
      break;

    case 'mousemove':
      processMouseMove(eventData.event, sceneIndex);
      break;

    case 'mouseup':
      processMouseUp(eventData.event, sceneIndex);
      break;

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

var rectHitTest = function(rect1, rect2) {
  return (
    ((rect1.x + rect1.width >= rect2.x) && (rect1.x <= rect2.x + rect2.width)) &&
    ((rect1.y + rect1.height >= rect2.y) && (rect1.y <= rect2.y + rect2.height))
  );
};

var increaseScore = function(amount) {
  g_score += amount;
};

var collectCandyCanes = function(sceneIndex) {
  var elf = sceneIndex.elf;
  var elfBounds = elf.getBounds();

  var candyCaneContainer = sceneIndex.candyCaneContainer;

  for (var i = 0; i < candyCaneContainer.children.length; i++) {
    var candyCane = candyCaneContainer.children[i];
    var candyCaneBounds = candyCane.getBounds();

    if (rectHitTest(candyCaneBounds, elfBounds)) {
      candyCane.parent.removeChild(candyCane);
      increaseScore(1);
    }
  }
};

var updateScoreText = function(sceneIndex) {
  var scoreContainer = sceneIndex.scoreContainer;
  var worldContainer = sceneIndex.worldContainer;

  scoreContainer.y = -worldContainer.y;

  var scoreText = sceneIndex.scoreText;
  var scoreSymbol = sceneIndex.scoreSymbol;

  scoreText.x = scoreSymbol.width;
  scoreText.y = scoreSymbol.height / 2;

  scoreText.text = g_score.toString();
};

var checkForWin = function () {
  if (g_currOrnamentDatum === finalOrnament) {
    var duration = Date.now() - g_startTime;

    alert('You win! Your score was ' + g_score + ' and your time was ' + Math.round(duration / 10) / 100 + ' seconds!');

    PIXI.ticker.stop();

    window.location.reload();
  }
}

var update = function (dt, sceneIndex) {
   processInput(dt, sceneIndex);
   followElf(dt, sceneIndex);

   for (var i = 0; i < g_elfJumpTweens.length; i++) {
     updateTween(dt, g_elfJumpTweens[i]);
   }

  collectCandyCanes(sceneIndex);
  updateScoreText(sceneIndex);

  checkForWin(sceneIndex);
};

var run = function(renderer, sceneIndex) {
  update(getTickerDt(PIXI.ticker.shared), sceneIndex);
  renderer.render(sceneIndex.root);
};

var setupElf = function(elf, bg) {
  elf.scale.set(0.25);
  elf.anchor.set(0.5, 1); // anchor at feet
  elf.x = WIDTH / 2;
  elf.y = bg.height - 1;
};

var setupBg = function(bg) {
  bg.scale.set(5);
}

var setupScore = function(scoreContainer, scoreSymbol, scoreText) {
  scoreContainer.position.set(0,0);

  scoreSymbol.x = 0;
  scoreSymbol.scale.set(0.10);

  scoreText.x = scoreSymbol.x + 10;
  scoreText.anchor.set(0, 0.5);
};

var setupOrnaments = function(ornamentContainer) {
//   ornamentContainer.children.forEach(function(ornament) {
      
//   });
};

var setupCamera = function(worldContainer) {
  worldContainer.x = 0;
  worldContainer.y = -worldContainer.height + HEIGHT;
}

var setupCandyCanes = function(candyCaneContainer) {
  candyCaneContainer.children.forEach(function(candyCane) {
    candyCane.anchor.set(0.5);
    candyCane.scale.set(0.25);
    candyCane.rotation = Math.PI * -0.3;
  });
};

var setupScene = function(sceneIndex) {
  setupBg(sceneIndex.bg);
  setupScore(sceneIndex.scoreContainer, sceneIndex.scoreSymbol, sceneIndex.scoreText);
  setupElf(sceneIndex.elf, sceneIndex.bg);
  setupOrnaments(sceneIndex.ornamentContainer);
  setupCandyCanes(sceneIndex.candyCaneContainer);
  setupCamera(sceneIndex.worldContainer);

  loadOrnaments(sceneIndex)
};

var startGame = function(renderer, sceneIndex) {
  setupScene(sceneIndex);
  PIXI.ticker.shared.add(run.bind(null, renderer, sceneIndex));

  g_startTime = Date.now();
};



// returns an index of {name: element}
var buildSceneGraph = function() {

  var root = new PIXI.Container();

    var worldContainer = new PIXI.Container();
    root.addChild(worldContainer);

      var bg = PIXI.Sprite.fromFrame(ASSET_PATHS.BG);
      worldContainer.addChild(bg);

      var scoreContainer = new PIXI.Container();
      worldContainer.addChild(scoreContainer);

        var scoreSymbol = PIXI.Sprite.fromFrame(ASSET_PATHS.CANDY_CANE);
        var scoreText = new PIXI.Text('', {fontFamily: 'Arial', fontSize: 32, fill: 0x000000, align: 'left' });
        scoreContainer.addChild(scoreSymbol);
        scoreContainer.addChild(scoreText);

      var ornamentContainer =  new PIXI.Container();
      worldContainer.addChild(ornamentContainer);
        // ornaments
        ORNAMENT_DATA.forEach(function(ornamentDatum) {
          createOrnament(ornamentContainer, ornamentDatum);
        });
      
      var candyCaneContainer = new PIXI.Container();
      worldContainer.addChild(candyCaneContainer);
        
        CANDY_CANE_DATA.forEach(function(candyCaneDatum) {
          var candyCane =  PIXI.Sprite.fromFrame(candyCaneDatum.assetPath);
          candyCane.position.set(candyCaneDatum.position.x, candyCaneDatum.position.y);
          candyCaneContainer.addChild(candyCane);
        });

      var elf = PIXI.Sprite.fromFrame(ASSET_PATHS.ELF);
      worldContainer.addChild(elf);

  return {
    root: root,
      worldContainer: worldContainer,
        bg: bg,
        scoreContainer: scoreContainer,
        scoreSymbol: scoreSymbol,
        scoreText: scoreText,
        ornamentContainer: ornamentContainer,
        candyCaneContainer: candyCaneContainer,
        elf: elf,
  };
};

var addKeyHandlers = function(renderer, worldContainer) {
  window.addEventListener('keydown', function(e) {
    // push keydown event to event queue
    eventQueue.push({type: 'keydown', event: e});
  });

  window.addEventListener('keyup', function(e) {
    // push keyup event to event queue
    eventQueue.push({type: 'keyup', event: e});
  });

  var interactionManager = new PIXI.interaction.InteractionManager(renderer);

  interactionManager.on('mousedown', function(e) {
    // push keyup event to event queue

    eventQueue.push({type: 'mousedown', event: interactionManager.mouse});
  });

  interactionManager.on('mousemove', function(e) {
    // push keyup event to event queue
    eventQueue.push({type: 'mousemove', event: interactionManager.mouse});
  });

  interactionManager.on('mouseup', function(e) {
    // push keyup event to event queue
    eventQueue.push({type: 'mouseup', event: interactionManager.mouse});
  });
};

var loadAssetObject = function(loader, assetObj) {
  for (let reference in assetObj) {
    var assetDesc = assetObj[reference];
    if (typeof assetDesc === 'object') {
      loadAssetObject(loader, assetDesc);
    } else {
      loader.add(assetObj[reference]);  
    }
  }
}

var load = function() {
  return new Promise(function(resolve, reject){
    var loader = new PIXI.loaders.Loader();

    loadAssetObject(loader, ASSET_PATHS);

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
    addKeyHandlers(renderer, sceneIndex.worldContainer);

    // DEBUGGING
    window.sceneIndex = sceneIndex;

    startGame(renderer, sceneIndex);
  })
  .catch(function(e) {
    window.console.error('error loading resources!');
    window.console.error(e);
  })
};
