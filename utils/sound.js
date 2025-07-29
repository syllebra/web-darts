class Sound {
  static zone(zone) {
    var audio = new Audio(`../sound/hits/${zone}.mp3`);
    audio.play();
  }
}
