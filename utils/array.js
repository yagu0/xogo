export const ArrayFun = {

  // Double array intialization
  init: function(size1, size2, initElem) {
    return [...Array(size1)].map(() => Array(size2).fill(initElem));
  },

  range: function(max) {
    return [...Array(max).keys()];
  }

};
