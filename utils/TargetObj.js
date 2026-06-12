// Helper class for move animation
export default class TargetObj {

  constructor(callOnComplete) {
    this.value = 0;
    this.target = 0;
    this.callOnComplete = callOnComplete;
  }
  increment() {
    if (++this.value == this.target)
      this.callOnComplete();
  }

};

