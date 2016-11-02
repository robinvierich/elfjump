var ORNAMENT_DATA = [
  {
    "position": {
      "x": 517.5,
      "y": 1679.993836671803
    },
    "type": 1
  },
  {
    "position": {
      "x": 1010.3503320158364,
      "y": 1696.4264243843502
    },
    "type": 2
  },
  {
    "position": {
      "x": 756,
      "y": 1298.915254237288
    },
    "type": 3
  },
  {
    "position": {
      "x": 1803.5127251782296,
      "y": 1422.8099666768135
    },
    "type": 2
  },
  {
    "position": {
      "x": 1707.786229451734,
      "y": 1122.4946864138506
    },
    "type": 1
  },
  {
    "position": {
      "x": 1048.640930306435,
      "y": 1056.368393142408
    },
    "type": 4
  },
  {
    "position": {
      "x": 1437.016998682503,
      "y": 872.3469859520466
    },
    "type": 2
  },
  {
    "position": {
      "x": 1109.897985786455,
      "y": 770.4776579352852
    },
    "type": 1
  },
  {
    "position": {
      "x": 1406.897985786455,
      "y": 594.0832049306625
    },
    "type": 4
  },
  {
    "position": {
      "x": 1222.4717633465498,
      "y": 459.291217257319
    },
    "type": 2
  },
  {
    "position": {
      "x": 2038.726400391905,
      "y": 1699.0503364765054
    },
    "type": 5
  },
  {
    "position": {
      "x": 1152.5725542380587,
      "y": 1387.863895798539
    },
    "type": 6
  },
  {
    "position": {
      "x": 1456.1622978278024,
      "y": 1657.4478711452264
    },
    "type": 3
  },
  {
    "position": {
      "x": 1364.693985568772,
      "y": 322.8351309707242
    },
    "type": 5
  }
];

var startingOrnaments = [
    ORNAMENT_DATA[0]
];

var finalOrnament = ORNAMENT_DATA[ORNAMENT_DATA.length - 1];
var g_edges = [
  [ORNAMENT_DATA[0], ORNAMENT_DATA[1]],
  [ORNAMENT_DATA[1], ORNAMENT_DATA[2]],
  [ORNAMENT_DATA[1], ORNAMENT_DATA[3]],
  [ORNAMENT_DATA[2], ORNAMENT_DATA[5]],
  [ORNAMENT_DATA[3], ORNAMENT_DATA[4]],
  [ORNAMENT_DATA[4], ORNAMENT_DATA[5]],
  [ORNAMENT_DATA[5], ORNAMENT_DATA[6]],
  [ORNAMENT_DATA[6], ORNAMENT_DATA[7]],
  [ORNAMENT_DATA[7], ORNAMENT_DATA[8]],
  [ORNAMENT_DATA[8], ORNAMENT_DATA[9]],
  [ORNAMENT_DATA[9], ORNAMENT_DATA[13]]
];
