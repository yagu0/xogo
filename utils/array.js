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

  toObject: function(keys, values) {
    if (!Array.isArray(values))
      // Second argument is a scalar
      values = Array(keys.length).fill(values);
    return (
      ArrayFun.range(keys.length)
      .reduce((acc, curr) => (acc[keys[curr]] = values[curr], acc), {})
    );
  }

};
