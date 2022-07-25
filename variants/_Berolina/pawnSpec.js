export default BerolinaPawnSpec = (color) => {

  const pawnShift = (color == "w" ? -1 : 1);
  return {
    moves: [
      {
        steps: [[pawnShift, 1], [pawnShift, -1]],
        range: 1
      }
    ],
    attack: [
      {
        steps: [[pawnShift, 0]],
        range: 1
      }
    ]
  };

};
