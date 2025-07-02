autoScoreIsAdjusted = false;
function getAutoTrackedActualScore(s) {
  if (s == 25) return 25;
  if (s.toLowerCase() == "bull") return 50;

  var number = parseInt(s.substring(1, 3));
  var mult = 1;
  switch (s.toUpperCase()[0]) {
    case "S":
      mult = 1;
      break;
    case "D":
      mult = 2;
      break;
    case "T":
      mult = 3;
      break;
  }

  return mult * number;
}

registerAutoTrackDarts();
$("#myAddPlayers").modal("toggle");
startGame();
handleAutoTrackDarts(1, { sector: "S2" });
