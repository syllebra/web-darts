// GSAP ticker helper function
// It allows animations to be triggered even if tab is not the current tab, but with less framerate.
// Note that this, nonetheless, can makes the battery usage more intensive.
function tickGSAPWhileHidden(value) {
  if (value === false) {
    document.removeEventListener("visibilitychange", tickGSAPWhileHidden.fn);
    return clearInterval(tickGSAPWhileHidden.id);
  }
  const onChange = () => {
    clearInterval(tickGSAPWhileHidden.id);
    document.hidden && (tickGSAPWhileHidden.id = setInterval(gsap.ticker.tick, 500));
  };
  document.addEventListener("visibilitychange", onChange);
  tickGSAPWhileHidden.fn = onChange;
  onChange();
}
tickGSAPWhileHidden(true);
gsap.ticker.lagSmoothing(0);
