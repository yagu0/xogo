// https://stackoverflow.com/a/47593316/12660887
function mulberry32(a) {
	return function() {
		let t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

export const Random = {

  rand: null,

  setSeed: function(a) {
    Random.rand = mulberry32(a);
  },

  randInt: function(min, max) {
    if (!max) {
      max = min;
      min = 0;
    }
    if (!Random.rand)
      Random.setSeed(Math.floor(Math.random() * 1984));
    return Math.floor(Random.rand() * (max - min)) + min;
  },

  // Inspired by https://github.com/jashkenas/underscore
  sample: function(arr, n) {
    n = n || 1;
    let cpArr = arr.map(e => e);
    for (let index = 0; index < n; index++) {
      const rand = randInt(index, arr.length);
      [ cpArr[index], cpArr[rand] ] = [ cpArr[rand], cpArr[index] ];
    }
    return cpArr.slice(0, n);
  },

  shuffle: function(arr) {
    return sample(arr, arr.length);
  }

};
