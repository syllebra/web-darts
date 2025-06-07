class RoundAnimation {
  constructor() {
    this.animationEl = null;
  }

  show(roundNumber, playerName) {
    // Create animation element if it doesn't exist
    if (!this.animationEl) {
      this.animationEl = document.createElement("div");
      this.animationEl.className = "round-animation";
      document.body.appendChild(this.animationEl);
    }

    // Update content
    this.animationEl.innerHTML = `
            <div class="round-animation-content">
                <h2>Round ${roundNumber}</h2>
                <p>${playerName}'s turn</p>
            </div>
        `;

    // Start animation
    setTimeout(() => {
      this.animationEl.classList.add("animate");
    }, 10);

    // Remove after animation completes
    setTimeout(() => {
      this.hide();
    }, 3000);
  }

  hide() {
    if (this.animationEl) {
      const handleTransitionEnd = () => {
        if (this.animationEl) {
          this.animationEl.removeEventListener("transitionend", handleTransitionEnd);
          this.animationEl.remove();
          this.animationEl = null;
        }
      };

      this.animationEl.addEventListener("transitionend", handleTransitionEnd, { once: true });
      this.animationEl.classList.remove("animate");
    }
  }
}
