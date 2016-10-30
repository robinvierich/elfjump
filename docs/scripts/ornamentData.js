var ORNAMENT_DATA = [
   {
      "position":{
         "x":600,
         "y":1650
      },
      "type":1,
      "assetPath":"images/ornament1.jpg"
   },
   {
      "position":{
         "x":881.1428571428571,
         "y":1547.077936510577
      },
      "type":2,
      "assetPath":"images/ornament2.jpg"
   },
   {
      "position":{
         "x":630.8571428571428,
         "y":1361.7389534597296
      },
      "type":3,
      "assetPath":"images/ornament3.jpg"
   },
   {
      "position":{
         "x":1212.5714285714284,
         "y":1548.2220043071873
      },
      "type":2,
      "assetPath":"images/ornament2.jpg"
   },
   {
      "position":{
         "x":1361.142857142857,
         "y":1334.2813263410856
      },
      "type":1,
      "assetPath":"images/ornament1.jpg"
   },
   {
      "position":{
         "x":986.2857142857142,
         "y":1142.077936510577
      },
      "type":4,
      "assetPath":"images/ornament4.jpg"
   },
   {
      "position":{
         "x":736,
         "y":935.0016653241364
      },
      "type":2,
      "assetPath":"images/ornament2.jpg"
   },
   {
      "position":{
        "x": 1111.0642786562644,
        "y": 741.0870819735674
      },
      "type":1,
      "assetPath":"images/ornament1.jpg"
   },

    {
      "position":{
        "x": 1000,
        "y": 441
      },
      "type":4,
      "assetPath":"images/ornament4.jpg"
    },

    {
      "position":{
        "x": 900,
        "y": 200
      },
      "type":2,
      "assetPath":"images/ornament2.jpg"
    }

]

var startingOrnaments = [
    ORNAMENT_DATA[0]
];

var finalOrnament = ORNAMENT_DATA[ORNAMENT_DATA.length - 1];

var edges = [
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
];
