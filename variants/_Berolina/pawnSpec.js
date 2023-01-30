export default function (color, initRank) {

  const pawnShift = (color == "w" ? -1 : 1);
  return {
    "class": "pawn",
    moves: [
      {
        steps: [[pawnShift, 1], [pawnShift, -1]],
        range: (initRank ? 2 : 1)
      }
    ],
    attack: [
      {
        steps: [[pawnShift, 0]],
        range: 1
      }
    ]
  };

}
