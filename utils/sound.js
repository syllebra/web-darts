class Sound {
  static zone(zone) {
    var audio = new Audio(`../sound/hits/${zone}.mp3`);
    audio.play();
  }

  static play(sound_url) {
    console.log("Playing sound:", sound_url);
    var audio = new Audio(`../sound/${sound_url}`);
    audio.play();
  }
}
