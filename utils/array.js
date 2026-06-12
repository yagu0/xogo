export const ArrayFun = {

  // Double array intialization
  init: function(size1, size2, initElem) {
    return [...Array(size1)].map(() => Array(size2).fill(initElem));
  },

  range: function(min, max) {
    if (!max) {
      max = min;
      min = 0;
    }
    return [...Array(max - min).keys()].map(k => k + min);
  },

};
