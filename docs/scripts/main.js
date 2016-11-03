var DEBUG = false;
var DEBUG_ORNAMENT_NUMBERS = true;

var getTickerDt = function(ticker) {
  var ms = Math.min(ticker.elapsedMS, ticker._maxElapsedMS);
  return ms / 1000 * ticker.speed;
};

var ASSET_PATHS = {
    TRANSPARENT: 'images/transparent.png',
    BG: {
      WALL: 'images/bg-1px.png',
      FLOOR: 'images/bg-floor-1px.png',
    },
    TREE: 'images/tree.png',
    ELF: {
      STAND: 'images/elf-idle.png',
      JUMP: 'images/elf-up.png',
      FALL: 'images/elf-down.png',
      PLACE_STAR: 'images/elf-place-star.png'
    },
    CANDY_CANE: 'images/candycane.png',
    ORNAMENTS: {
      1: 'images/ball1.png',
      2: 'images/ball2.png',
      3: 'images/ball3.png',
      4: 'images/ball4.png',
      5: 'images/ball5.png',
      6: 'images/ball6.png'
    },
    STAR: 'images/final-star.png'
};

var getOrnamentAssetPath = function(ornamentDatum) {
  return ASSET_PATHS.ORNAMENTS[ornamentDatum.type];
};

var findFinalOrnament = function(ornamentData) {
  for (var i = 0; i < ornamentData.length; i++) {
    var ornamentDatum = ornamentData[i];
    if (ornamentDatum.final) {
      return ornamentDatum;
    }
  }

  return null;
};

//var ORNAMENT_DATA = [
//  { id: 0, position: { x: 600, y: 1650 }, assetPath: ASSET_PATHS.ORNAMENTS[1], type: 1 },
//  { id: 1, position: { x: 900, y: 1600 }, assetPath: ASSET_PATHS.ORNAMENTS[2], type: 2 },
//  { id: 2, position: { x: 700, y: 1400 }, assetPath: ASSET_PATHS.ORNAMENTS[3], type: 3 },
//];

//var g_startingOrnaments = [
//    ORNAMENT_DATA[0]
//];

//var edges = [
//    [ORNAMENT_DATA[0], ORNAMENT_DATA[1]],1
//    [ORNAMENT_DATA[1], ORNAMENT_DATA[2]],
//];

var HEIGHT = 1080;
var WIDTH = 1920;

var FPS = 60;

var ELF_SPEED = 10000; // units/sec
var ELF_JUMP_DURATION = 0.5;

var TOP_OF_TREE_OFFSET = 800;

var CAMERA_SPEED = 3000;
var CAMERA_MOVEMENT_CUTOFF = 10; // how many px away from center until we skip movement?

var g_ornamentSpriteToData = new Map();
var g_ornamentDataToSprite = new Map();
var g_candyCaneSpriteToData = new Map();

var g_eventQueue = [];
var g_currOrnamentDatum = null;
var g_tweens = [];
var g_score = 0;
var g_startTime = 0; // set in startGame

var EMPTY_LIST = [];

var g_finalOrnament = findFinalOrnament(ORNAMENT_DATA);
var g_startingOrnaments = [ORNAMENT_DATA[0]];

var canJumpToOrnament = function(currOrnament, nextOrnament) {
  for (var i = 0; i < g_edges.length; i++) {
    var edge = g_edges[i];

    if ( edge.indexOf(currOrnament) !== -1 && edge.indexOf(nextOrnament) !== -1) {
      return true;
    }
  }

  return false;
}

var getAvailableOrnaments = function (currOrnament) {
    if (currOrnament == null) {
        return g_startingOrnaments;
    }

    var availableOrnaments = [];

    for (var i = 0; i < g_edges.length; i++) {
        var edge = g_edges[i];

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

var quadOut = function(t, start, end) {
  return (start - end) * (t * (t - 2)) + start;
};

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

var getOrnamentWorldPosition = function(ornamentSprite) {
  return new PIXI.Point(
    ornamentSprite.position.x + ornamentSprite.parent.x,
    ornamentSprite.position.y + ornamentSprite.parent.y
  );
};

var BEZIER_JUMP_HEIGHT = 300;

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

var startTween = function(tween) {
  var onComplete = tween.onComplete;

  tween.onComplete = function(t) {
    if (onComplete) { onComplete(t); }
    g_tweens.splice(g_tweens.indexOf(tween), 1);
  }

  g_tweens.push(tween);

  return tween;
};

var createTimerTween = function(duration, onComplete) {
  return createTween({}, {}, null, duration, linear, onComplete);
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

var jumpToPosition = function(elf, position, onComplete) {
  var startPoint = new PIXI.Point(elf.x, elf.y);
  var endPoint = new PIXI.Point(
    position.x,// + worldContainer.x,
    position.y// + worldContainer.y
  );

  var bezierEasing = createJumpEasingFn(startPoint.x, startPoint.y, endPoint.x, endPoint.y, ELF_JUMP_DURATION);

  var jumpTexture = PIXI.utils.TextureCache[ASSET_PATHS.ELF.JUMP];
  var fallTexture = PIXI.utils.TextureCache[ASSET_PATHS.ELF.FALL];
  elf.texture = jumpTexture;

  if (endPoint.x < startPoint.x) {
    elf.scale.x = -1;
  } else if (endPoint.x > startPoint.x) {
    elf.scale.x = 1;
  }

  var jumpTween = createTween(elf.position, startPoint, endPoint, ELF_JUMP_DURATION, bezierEasing, onComplete);
  startTween(jumpTween);

  var switchToFallTimerTween = createTimerTween((2/3) *   ELF_JUMP_DURATION, function() {
    elf.texture = fallTexture;
    // elf.position.y -= 250;
  });
  startTween(switchToFallTimerTween);
};

var jumpToOrnament = function (elf, ornamentDatum) {
  var ornamentSprite = g_ornamentDataToSprite.get(ornamentDatum);
  var ornamentWorldPosition = getOrnamentWorldPosition(ornamentSprite);
  ornamentWorldPosition.y += (1/2) * elf.height

  // SUPER HAXX - need to actually get full parent transform


  jumpToPosition(elf, ornamentWorldPosition, function(tween) {
    g_currOrnamentDatum = ornamentDatum;
    var standTexture = PIXI.utils.TextureCache[ASSET_PATHS.ELF.STAND];
    elf.texture = standTexture;
  });
};


var getKeyForOrnament = function (ornament) {
  return ornament.type.toString();
};

var isJumping = function () {
  return g_tweens.length > 0;
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

      jumpToOrnament(sceneIndex.elf, ornament, sceneIndex.worldContainer);
  }
}

var createOrnament = function(ornamentContainer, ornamentDatum) {
  var ornament = PIXI.Sprite.fromFrame(getOrnamentAssetPath(ornamentDatum));
  ornament.position.set(ornamentDatum.position.x, ornamentDatum.position.y);
  ornament.anchor.set(0.5, 0);
  ornament.scale.set(1);
  ornamentContainer.addChild(ornament);
  g_ornamentSpriteToData.set(ornament, ornamentDatum);
  g_ornamentDataToSprite.set(ornamentDatum, ornament);

  if (DEBUG_ORNAMENT_NUMBERS) {
    var ornamentKeyText = new PIXI.Text(ornamentDatum.type.toString(), {fontFamily: 'Arial', fontSize: 256, fill: 0x220000, align: 'left' });
    ornamentKeyText.anchor.set(0.5, 0);
    ornamentKeyText.y = ornament.height / 4;
    ornament.addChild(ornamentKeyText);
  }
};

var removeOrnament = function(ornamentSpriteToRemove, sceneIndex) {
  var ornamentDatum = g_ornamentSpriteToData.get(ornamentSpriteToRemove);

  var ornaments = sceneIndex.ornamentContainer.children;

  for (var i = 0; i < ornaments.length; i++) {
    var ornament = ornaments[i];
    if (ornament === ornamentSpriteToRemove) { continue; }

    var edge = findEdgeBetweenOrnaments(ornament, ornamentSpriteToRemove);
    if (edge) { removeEdge(ornament, ornamentSpriteToRemove); }
  }

  g_ornamentSpriteToData.delete(ornamentSpriteToRemove);
  g_ornamentDataToSprite.delete(ornamentDatum);
  ornamentSpriteToRemove.parent.removeChild(ornamentSpriteToRemove);

  var idx = ORNAMENT_DATA.indexOf(ornamentDatum);
  ORNAMENT_DATA.splice(idx, 1);
};

var createCandyCane = function(candyCaneContainer, candyCaneDatum) {
  var candyCane = PIXI.Sprite.fromFrame(candyCaneDatum.assetPath);
  candyCane.position.set(candyCaneDatum.position.x, candyCaneDatum.position.y);
  candyCane.anchor.set(0.5);
  g_candyCaneSpriteToData.set(candyCane, candyCaneDatum);
  candyCaneContainer.addChild(candyCane);
};

var removeCandyCane = function(candyCaneSpriteToRemove) {
  var candyCaneDatum = g_candyCaneSpriteToData.get(candyCaneSpriteToRemove);
  g_candyCaneSpriteToData.delete(candyCaneSpriteToRemove);
  CANDY_CANE_DATA.splice(CANDY_CANE_DATA.indexOf(candyCaneDatum), 1);
  candyCaneSpriteToRemove.parent.removeChild(candyCaneSpriteToRemove);
};

var getEdgeStr = function(ornamentIdx1, ornamentIdx2) {
  return "[ORNAMENT_DATA[" + ornamentIdx1 + "], ORNAMENT_DATA[" + ornamentIdx2 + "]],";
}

var serializeEdges = function(edges) {
  var ornamentIdx1;
  var ornamentIdx2;

  var serializedEdges = "[\n";

  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];

    var ornamentIdx1 = ORNAMENT_DATA.indexOf(edge[0]);
    var ornamentIdx2 = ORNAMENT_DATA.indexOf(edge[1]);

    var edgeStr = getEdgeStr(ornamentIdx1, ornamentIdx2);
    serializedEdges += (edgeStr + "\n");
  }

  serializedEdges += "]"

  return serializedEdges;
};

var serializeCandyCane = function(candyCaneSprite) {
  var candyCaneDatum = g_candyCaneSpriteToData.get(candyCaneSprite);

  return {
    position: {
      x: candyCaneSprite.x, y: candyCaneSprite.y
    },
    assetPath: candyCaneDatum.assetPath
  }
};

var serializeCandyCanes = function(sceneIndex) {
  var serializedCandyCanes = [];

  sceneIndex.candyCaneContainer.children.forEach(function(candyCane) {
    serializedCandyCanes.push(serializeCandyCane(candyCane));
  });

  return JSON.stringify(serializedCandyCanes);
}

var serializeOrnament = function(ornamentSprite) {
  var ornamentDatum = g_ornamentSpriteToData.get(ornamentSprite);
  return {
    position: {
      x: ornamentSprite.x,
      y: ornamentSprite.y
    },
    type: ornamentDatum.type,
    final: ornamentDatum.final || false,
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

var serializeData = function(sceneIndex) {
  var ornamentData = serializeOrnaments(sceneIndex);
  var candyCaneData = serializeCandyCanes(sceneIndex);
  var edgeData = serializeEdges(g_edges);

  var fileContents =
    "var ORNAMENT_DATA = " + ornamentData + ";\n" +
    "var CANDY_CANE_DATA = " + candyCaneData + ";\n" +
    "var g_edges = " + edgeData + ";\n";


  return fileContents;
};

// var deserializeOrnaments = function(sceneIndex, serializedOrnaments) {
//   JSON.parse(serializedOrnaments).forEach(function(ornamentDatum) {
//     createOrnament(sceneIndex.ornamentContainer, ornamentDatum)
//   });
// }

var g_ornamentDragging = null;

var getWorldCoordsFromMouseEvent = function(event, worldContainer) {
  return event.getLocalPosition(worldContainer);
}

var hitSprite = function(sprite, worldCoords, worldContainer) {
  var spriteScreenBounds = sprite.getBounds();
  var spriteWorldBounds = new PIXI.Rectangle(
    spriteScreenBounds.x - worldContainer.x,
    spriteScreenBounds.y - worldContainer.y,
    spriteScreenBounds.width,
    spriteScreenBounds.height
  );

  return spriteWorldBounds.contains(worldCoords.x, worldCoords.y);
};

var g_edgeLinkSourceOrnament = null;

var findOrnamentAtWorldPosition = function(worldCoords, worldContainer) {
  for (var i = 0; i < sceneIndex.ornamentContainer.children.length; i++) {
    var ornament = sceneIndex.ornamentContainer.children[i];

    if (hitSprite(ornament, worldCoords, worldContainer)) {
      return ornament;
    }
  }

  return null;
};

var findCandyCaneAtWorldPosition = function(worldCoords, worldContainer) {
  var candyCanes = sceneIndex.candyCaneContainer.children;
  for (var i = 0; i < candyCanes.length; i++) {
    var candyCane = candyCanes[i];

    if (hitSprite(candyCane, worldCoords, worldContainer)) {
      return candyCane;
    }
  }

  return null;
};

var processMouseDown = function(event, sceneIndex) {
  var worldCoords = getWorldCoordsFromMouseEvent(event, sceneIndex.worldContainer);

  if (event.originalEvent.altKey) {
    var strType = window.prompt("Enter type (1, 2, 3, 4, 5, or 6)");
    var type = parseInt(strType.trim(), 10);
    if (type < 1 || type > 6) {
      alert('Invalid type! Please enter number from 1 - 6');
    }

    var ornamentDatum = {
      position: {
        x: worldCoords.x,
        y: worldCoords.y
      },
      type: type,
      assetPath: ASSET_PATHS.ORNAMENTS[type]
    };

    ORNAMENT_DATA.push(ornamentDatum);

    createOrnament(sceneIndex.ornamentContainer, ornamentDatum);
  }

  g_ornamentDragging = findOrnamentAtWorldPosition(worldCoords, sceneIndex.worldContainer);
  if (!g_ornamentDragging) {
    console.warn("couldn't find ornament at position {x: " + worldCoords.x + ", y: " + worldCoords.y + "}");

    if (event.originalEvent.metaKey) {
      var candyCaneDatum = {
        position: {
          x: worldCoords.x - sceneIndex.candyCaneContainer.x,
          y: worldCoords.y - sceneIndex.candyCaneContainer.y
        },
        assetPath: ASSET_PATHS.CANDY_CANE
      };

      CANDY_CANE_DATA.push(candyCaneDatum);

      createCandyCane(sceneIndex.candyCaneContainer, candyCaneDatum);
    } else if (event.originalEvent.shiftKey) {
      var candyCaneSpriteToRemove = findCandyCaneAtWorldPosition(worldCoords, sceneIndex.worldContainer);
      if (candyCaneSpriteToRemove) {
        removeCandyCane(candyCaneSpriteToRemove);
      }
    }
  }

  if (event.originalEvent.metaKey) {
    g_edgeLinkSourceOrnament = g_ornamentDragging;
    g_ornamentDragging = null;
  }

  if (event.originalEvent.shiftKey && !event.originalEvent.metaKey) {
    removeOrnament(g_ornamentDragging, sceneIndex);
    g_ornamentDragging = null;
  }

};

var processMouseMove = function(event, sceneIndex) {
  if (event.originalEvent.buttons !== 1) { return; } // left mouse button not pressed
  if (!g_ornamentDragging) { return; } // no ornament is being dragged

  var worldCoords = getWorldCoordsFromMouseEvent(event, sceneIndex.worldContainer);

  // HAXX
  g_ornamentDragging.position.set(
    worldCoords.x - g_ornamentDragging.parent.x,
    worldCoords.y - g_ornamentDragging.parent.y
  );
};

var findEdgeBetweenOrnaments = function(ornament1Sprite, ornament2Sprite) {
  for (var i = 0; i < g_edges.length; i++) {
    var edge = g_edges[i];
    var ornament1Datum = g_ornamentSpriteToData.get(ornament1Sprite);
    var ornament2Datum = g_ornamentSpriteToData.get(ornament2Sprite);
    if (
      edge[0] === ornament1Datum && edge[1] === ornament2Datum ||
      edge[0] === ornament2Datum && edge[1] === ornament1Datum
    ) {
      return edge;
    }
  }

  return null;
};

var addEdge = function(ornament1Sprite, ornament2Sprite) {
  var ornament1Datum = g_ornamentSpriteToData.get(ornament1Sprite);
  var ornament2Datum = g_ornamentSpriteToData.get(ornament2Sprite);

  g_edges.push([ornament1Datum, ornament2Datum])
};

var removeEdge = function(ornament1Sprite, ornament2Sprite) {
  var ornament1Datum = g_ornamentSpriteToData.get(ornament1Sprite);
  var ornament2Datum = g_ornamentSpriteToData.get(ornament2Sprite);

  var edge = findEdgeBetweenOrnaments(ornament1Sprite, ornament2Sprite);
  if (!edge) { return; }

  g_edges.splice(g_edges.indexOf(edge), 1);
};

var processMouseUp = function(event, sceneIndex) {
  if (event.originalEvent.buttons & 1) { return; } // left button in still down

  if (g_edgeLinkSourceOrnament) {
    var worldCoords = getWorldCoordsFromMouseEvent(event, sceneIndex.worldContainer);
    var targetOrnament = findOrnamentAtWorldPosition(worldCoords, sceneIndex.worldContainer);

    if (!targetOrnament) { return; }
    if (targetOrnament === g_edgeLinkSourceOrnament) { return; }
    var edge = findEdgeBetweenOrnaments(g_edgeLinkSourceOrnament, targetOrnament);
    if (event.originalEvent.shiftKey) {
      if (edge) {
        removeEdge(g_edgeLinkSourceOrnament, targetOrnament);
      }
    } else {
      if (!edge) {
        addEdge(g_edgeLinkSourceOrnament, targetOrnament);
      }
    }
  }

  //saveOrnaments(sceneIndex);
  g_ornamentDragging = null;
  g_edgeLinkSourceOrnament = null;
};

var processInput = function(dt, sceneIndex) {
  while (g_eventQueue.length) {
    var eventData = g_eventQueue.shift();
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



var normalizeVector = function(vector) {
  var mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  return new PIXI.Point(vector.x / mag, vector.y / mag);
}

var followElf = function(dt, sceneIndex) {
  var elf = sceneIndex.elf;
  var elfBounds = elf.getLocalBounds();
  var elfPos = elf.position;

  var worldContainer = sceneIndex.worldContainer;

  var centerScreenInWorld = new PIXI.Point(
    (-worldContainer.x + (WIDTH / 2)),
    (-worldContainer.y + (HEIGHT / 2))
  );

  var vecFromElfToCenterScreen = new PIXI.Point(
    centerScreenInWorld.x - elfPos.x,
    centerScreenInWorld.y - (elfPos.y - elf.height / 2)
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

  scoreContainer.x = -worldContainer.x;
  scoreContainer.y = -worldContainer.y;

  var scoreText = sceneIndex.scoreText;
  var scoreSymbol = sceneIndex.scoreSymbol;

  scoreText.x = scoreSymbol.width;
  scoreText.y = scoreSymbol.height / 2;

  scoreText.text = g_score.toString();
};

var placeStar = function(sceneIndex, onComplete) {
  var elf = sceneIndex.elf;

  var placeStarTexture = PIXI.utils.TextureCache[ASSET_PATHS.ELF.PLACE_STAR];

  jumpToPosition(elf, new PIXI.Point(sceneIndex.star.x, sceneIndex.star.y), function() {
    elf.texture = placeStarTexture;
    var star = sceneIndex.star;
    star.visible = true;

    var timerTween = createTimerTween(0.5, function() {
      onComplete();
    });

    startTween(timerTween);
  });
};

var showFinalMessage = function(sceneIndex, onComplete) {
  var duration = 0.5;
  var gameTime = Date.now() - g_startTime;

  var pluralizedCane = (g_score === 1) ? 'cane' : 'canes';

  var finalMessageText = 'You win!\n' +
    'You did it in ' + (Math.round(gameTime / 10) / 100) + ' seconds\n' +
    'and picked up ' + g_score + ' candy ' + pluralizedCane + '!';

  sceneIndex.finalText.visible = true;
  sceneIndex.finalText.x = (WIDTH / 2) - sceneIndex.worldContainer.x;
  sceneIndex.finalText.y = (HEIGHT / 2) - sceneIndex.worldContainer.y;
  sceneIndex.finalText.scale.set(0);
  sceneIndex.finalText.text = finalMessageText;

  var textTween = createTween(sceneIndex.finalText.scale, {x: 0, y:0}, {x:1, y:1}, duration, quadOut, onComplete);
  startTween(textTween);
};


var won = false;
var checkForWin = function (sceneIndex) {
  if (!won && g_currOrnamentDatum === g_finalOrnament) {
    won = true;

    placeStar(sceneIndex, function() {
      showFinalMessage(sceneIndex, function() {
        PIXI.ticker.shared.stop();
      });
    });
  }
}

var drawEdges = function(sceneIndex) {
  if (!sceneIndex.debugGraphics) {
    return;
  }

  var graphics = sceneIndex.debugGraphics;

  graphics.lineStyle(10, 0x000000);
  graphics.beginFill(0x000000, 1);

  for (var i = 0; i < g_edges.length; i++) {
    var edge = g_edges[i];

    var ornament1Sprite = g_ornamentDataToSprite.get(edge[0]);
    var ornament2Sprite = g_ornamentDataToSprite.get(edge[1]);

    var worldPos1 = getOrnamentWorldPosition(ornament1Sprite);
    var worldPos2 = getOrnamentWorldPosition(ornament2Sprite);

    graphics.moveTo(worldPos1.x, worldPos1.y);
    graphics.lineTo(worldPos2.x, worldPos2.y);
  }

  graphics.endFill();
};

var update = function (dt, sceneIndex) {
  processInput(dt, sceneIndex);
  followElf(dt, sceneIndex);

  if (DEBUG && sceneIndex.debugGraphics) {
    sceneIndex.debugGraphics.clear();
    drawEdges(sceneIndex);
  }

  for (var i = 0; i < g_tweens.length; i++) {
    updateTween(dt, g_tweens[i]);
  }

  collectCandyCanes(sceneIndex);
  updateScoreText(sceneIndex);

  checkForWin(sceneIndex);
};

var run = function(renderer, sceneIndex) {
  update(getTickerDt(PIXI.ticker.shared), sceneIndex);
  renderer.render(sceneIndex.root);
};

var setupElf = function(elf, worldContainer) {
  elf.scale.set(1);
  elf.anchor.set(0.5, 1); // anchor at feet
  elf.x = WIDTH / 2;
  elf.y = worldContainer.height - elf.height - 1;
};

var setupBg = function(bgMargins, bgWall, bgFloor, worldContainer) {
  bgMargins.width = worldContainer.width;
  bgMargins.height = worldContainer.height;

  bgWall.height = worldContainer.height;
  bgWall.width = worldContainer.width;
  bgWall.y = worldContainer.height;
  bgWall.anchor.set(0, 1);

  bgFloor.anchor.set(0, 1);
  bgFloor.y = worldContainer.height;
  bgFloor.width = worldContainer.width;
}

var setupTree = function(tree, worldContainer) {
  tree.y += TOP_OF_TREE_OFFSET;
  tree.scale.set(2);
};

var setupScore = function(scoreContainer, scoreSymbol, scoreText) {
  scoreContainer.position.set(0,0);

  scoreSymbol.x = 0;
  scoreSymbol.scale.set(0.25);

  scoreText.x = scoreSymbol.x + 10;
  scoreText.anchor.set(0, 0.5);
};

var setupCamera = function(worldContainer) {
  worldContainer.x = 0;
  worldContainer.y = -worldContainer.height + HEIGHT;
}

var setupCandyCanes = function(candyCaneContainer) {
  candyCaneContainer.children.forEach(function(candyCane) {
    candyCane.anchor.set(0.5);
    candyCane.scale.set(1);
  });

  candyCaneContainer.y += TOP_OF_TREE_OFFSET;
};

var setupOrnaments = function(ornamentContainer) {
  ornamentContainer.y += TOP_OF_TREE_OFFSET;
  ornamentContainer.children.forEach(function(ornament) {});
}

var setupStar = function(star) {
  star.anchor.set(0.5, 0);
  star.x = 1325 * 2;
  star.y = TOP_OF_TREE_OFFSET - 360;
  star.visible = false;
};

var setupScene = function(sceneIndex) {
  setupTree(sceneIndex.tree, sceneIndex.worldContainer);
  setupBg(sceneIndex.bgMargins, sceneIndex.bgWall, sceneIndex.bgFloor, sceneIndex.worldContainer);
  setupScore(sceneIndex.scoreContainer, sceneIndex.scoreSymbol, sceneIndex.scoreText);
  setupElf(sceneIndex.elf, sceneIndex.worldContainer);
  setupOrnaments(sceneIndex.ornamentContainer);
  setupCandyCanes(sceneIndex.candyCaneContainer);
  setupCamera(sceneIndex.worldContainer);
  setupStar(sceneIndex.star);
};

var startGame = function(renderer, sceneIndex) {
  setupScene(sceneIndex);
  PIXI.ticker.shared.add(run.bind(null, renderer, sceneIndex));

  g_startTime = Date.now();

  jumpToOrnament(sceneIndex.elf, g_startingOrnaments[0]);
};

// returns an index of {name: element}
var buildSceneGraph = function() {

  var root = new PIXI.Container();

    var worldContainer = new PIXI.Container();
    root.addChild(worldContainer);

    // var marginContainer = new PIXI.Container();
    // worldContainer.addChild(marginContainer)

      // var bgContainer = new PIXI.Container();
      // worldContainer.addChild(bgContainer);

      var bgMargins = PIXI.Sprite.fromFrame(ASSET_PATHS.TRANSPARENT);
      worldContainer.addChild(bgMargins);

      var bgWall = PIXI.extras.TilingSprite.fromFrame(ASSET_PATHS.BG.WALL);
      worldContainer.addChild(bgWall);
      // update scale/height

      var bgFloor = PIXI.Sprite.fromFrame(ASSET_PATHS.BG.FLOOR);
      worldContainer.addChild(bgFloor);
          // update scale/height

        var tree = PIXI.Sprite.fromFrame(ASSET_PATHS.TREE);
        worldContainer.addChild(tree);

        var scoreContainer = new PIXI.Container();
        worldContainer.addChild(scoreContainer);

          var scoreSymbol = PIXI.Sprite.fromFrame(ASSET_PATHS.CANDY_CANE);
          var scoreText = new PIXI.Text('', {fontFamily: 'Arial', fontSize: 72, fill: 0x000000, align: 'left' });
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
            createCandyCane(candyCaneContainer, candyCaneDatum);
          });

        var elf = PIXI.Sprite.fromFrame(ASSET_PATHS.ELF.STAND);
        worldContainer.addChild(elf);

        var star = PIXI.Sprite.fromFrame(ASSET_PATHS.STAR);
        worldContainer.addChild(star);

        var finalMessageContainer = new PIXI.Container();
        worldContainer.addChild(finalMessageContainer);

          var finalText = new PIXI.Text('You Won!', {
            fontFamily: 'Arial', fontSize: 128, fill: 0x000000, align: 'left'
          });
          finalMessageContainer.addChild(finalText);
          finalText.anchor.set(0.5);
          finalText.visible = false;

        if (DEBUG) {
          var debugGraphics = new PIXI.Graphics();
          worldContainer.addChild(debugGraphics);
        }


  return {
    root: root,
      worldContainer: worldContainer,
        bgMargins: bgMargins,
        bgWall: bgWall,
        bgFloor: bgFloor,
        tree: tree,
        scoreContainer: scoreContainer,
        scoreSymbol: scoreSymbol,
        scoreText: scoreText,
        ornamentContainer: ornamentContainer,
        candyCaneContainer: candyCaneContainer,
        elf: elf,
        star: star,
        finalMessageContainer: finalMessageContainer,
        finalText: finalText,
        debugGraphics: debugGraphics,
  };
};

var addKeyHandlers = function(renderer, worldContainer) {
  window.addEventListener('keydown', function(e) {
    // push keydown event to event queue
    g_eventQueue.push({type: 'keydown', event: e});
  });

  window.addEventListener('keyup', function(e) {
    // push keyup event to event queue
    g_eventQueue.push({type: 'keyup', event: e});
  });

  var interactionManager = new PIXI.interaction.InteractionManager(renderer);

  interactionManager.on('mousedown', function(e) {
    // push keyup event to event queue

    g_eventQueue.push({type: 'mousedown', event: interactionManager.mouse});
  });

  interactionManager.on('mousemove', function(e) {
    // push keyup event to event queue
    g_eventQueue.push({type: 'mousemove', event: interactionManager.mouse});
  });

  interactionManager.on('mouseup', function(e) {
    // push keyup event to event queue
    g_eventQueue.push({type: 'mouseup', event: interactionManager.mouse});
  });
};

var loadAssetObject = function(loader, assetObj) {
  for (let reference in assetObj) {
    var assetDesc = assetObj[reference];
    if (typeof assetDesc === 'object') {
      loadAssetObject(loader, assetDesc);
    } else {
      var assetPath = assetObj[reference]
      if (loader.resources.hasOwnProperty(assetPath)) {
        continue;
      }
      loader.add(assetPath);
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
