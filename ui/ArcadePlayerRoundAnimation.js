class ArcadePlayerRoundAnimation {
  constructor(containerElement = document.body) {
    this.container = containerElement;
    this.isAnimating = false;
    this.diagonalBands = [];
    this.particles = [];

    this.init();
  }

  injectCSS() {
    const css = `
            .arcade-animation-container {
                width: 100vw;
                height: 100vh;
                position: absolute;
                top:0px;
                left: 0px;
                overflow: hidden;
                z-index: 1000;
                display:none;
            }


            .arcade-screen-container {
                width: 100%;
                height: 100%;
                position: relative;
                background-color: #000000bb;
                opacity: 1;
            }


            .arcade-main-band {
                position: fixed;
                height: 20vh;
                width: 0vw;
                background: linear-gradient(45deg, var(--arcade-player-color, #ff0080), var(--arcade-player-color-dark, #cc0066));
                top: 35%;
                left: -20px;
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12vh;
                font-weight: bold;
                color: white;
                text-shadow: 0 0 30px rgba(255, 255, 255, 1);
                box-shadow:
                    0 0 60px var(--arcade-player-color, #ff0080),
                    inset 0 0 60px rgba(255, 255, 255, 0.2);
                border: 3px solid rgba(255, 255, 255, 0.5);
                z-index: 1009;
                overflow: hidden;
                border-radius: 2vh 10vh 2vh 2vh;
            }

            .arcade-secondary-band {
                position: absolute;
                height: 16vh;
                width: 0vw;
                background: linear-gradient(45deg, var(--arcade-player-color-light, #ff4da6), var(--arcade-player-color, #ff0080));
                top: 51vh;
                right: 0px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 7vh;
                font-weight: bold;
                color: white;
                text-shadow: 0 0 20px rgba(255, 255, 255, 1);
                box-shadow:
                    0 0 40px var(--arcade-player-color, #ff0080),
                    inset 0 0 40px rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.4);
                z-index: 1010;
                overflow: hidden;
                border-radius: 2vh 2vh 2vh 6.9vh;
            }

            .arcade-diagonal-band {
                position: absolute;
                height: calc(min(4.5vh, 4.5vw));
                width: 250vh;
                opacity: 0;
                transform-origin: left center;
                background: linear-gradient(90deg,
                        var(--arcade-player-color, #ff0080) 0%,
                        var(--arcade-player-color-light, #ff4da6) 50%,
                        transparent 100%);
            }

            .arcade-avatar-space {
                position: absolute;
                width: 80px;
                height: 80px;
                right: 60px;
                top: 40%;
                border: 3px solid rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent);
                box-shadow:
                    0 0 20px rgba(255, 255, 255, 0.3),
                    inset 0 0 15px rgba(255, 255, 255, 0.1);
                z-index: 1011;
                opacity: 0;
            }

            .arcade-particle {
                position: absolute;
                width: 3px;
                height: 3px;
                background: white;
                border-radius: 50%;
                opacity: 0;
                box-shadow: 0 0 6px white;
            }

            .arcade-flash-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent);
                opacity: 0;
                pointer-events: none;
                z-index: 2020;
            }

            /* Mobile vertical orientation responsive text sizing */
            @media screen and (max-width: 768px) and (orientation: portrait) {
                .arcade-main-band {
                    font-size: clamp(4vh, 8vw, 10vh);
                    height: 18vh;
                    padding: 0 2vw;
                    white-space: nowrap;
                }

                .arcade-secondary-band {
                    font-size: clamp(3vh, 6vw, 7vh);
                    height: 14vh;
                    padding: 0 2vw;
                    white-space: nowrap;
                }

                .arcade-avatar-space {
                    width: 60px;
                    height: 60px;
                    right: 40px;
                }
            }

            /* Extra small mobile screens */
            @media screen and (max-width: 480px) and (orientation: portrait) {
                .arcade-main-band {
                    font-size: clamp(3vh, 7vw, 8vh);
                    height: 16vh;
                    padding: 0 3vw;
                }

                .arcade-secondary-band {
                    font-size: clamp(2.5vh, 5vw, 6vh);
                    height: 12vh;
                    padding: 0 3vw;
                }

                .arcade-avatar-space {
                    width: 50px;
                    height: 50px;
                    right: 30px;
                }
            }

            /* Very narrow screens - stack text if needed */
            @media screen and (max-width: 360px) and (orientation: portrait) {
                .arcade-main-band {
                    font-size: clamp(2.5vh, 6vw, 7vh);
                    flex-direction: column;
                    height: 20vh;
                    line-height: 1;
                }

                .arcade-secondary-band {
                    font-size: clamp(2vh, 4.5vw, 5vh);
                    flex-direction: column;
                    height: 16vh;
                    line-height: 1;
                }
            }
        `;

    // Check if styles already exist
    if (!document.getElementById("arcade-animation-styles")) {
      const styleElement = document.createElement("style");
      styleElement.id = "arcade-animation-styles";
      styleElement.textContent = css;
      document.head.appendChild(styleElement);
    }
  }

  createElements() {
    // Create main container
    this.animationContainer = document.createElement("div");
    this.animationContainer.className = "arcade-animation-container";

    // Create screen container
    this.screenContainer = document.createElement("div");
    this.screenContainer.className = "arcade-screen-container";

    // Create flash overlay
    this.flashOverlay = document.createElement("div");
    this.flashOverlay.className = "arcade-flash-overlay";

    // Create main band
    this.mainBand = document.createElement("div");
    this.mainBand.className = "arcade-main-band";

    // Create secondary band
    this.secondaryBand = document.createElement("div");
    this.secondaryBand.className = "arcade-secondary-band";

    // Create avatar space
    this.avatarSpace = document.createElement("div");
    this.avatarSpace.className = "arcade-avatar-space";

    // Append elements
    this.screenContainer.appendChild(this.flashOverlay);
    this.screenContainer.appendChild(this.mainBand);
    this.screenContainer.appendChild(this.secondaryBand);
    this.screenContainer.appendChild(this.avatarSpace);
    this.animationContainer.appendChild(this.screenContainer);
    this.container.appendChild(this.animationContainer);
  }

  createDiagonalBands() {
    const bandCount = 30;

    for (let i = 0; i < bandCount; i++) {
      const band = document.createElement("div");
      band.className = "arcade-diagonal-band";

      this.screenContainer.appendChild(band);
      this.diagonalBands.push({
        element: band,
        fromTopLeft: i % 2 === 0,
      });
    }
  }

  createParticles() {
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "arcade-particle";
      this.screenContainer.appendChild(particle);
      this.particles.push(particle);
    }
  }

  generateColorPalette(baseColor) {
    // Simple color palette generation
    const hexToHsl = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h,
        s,
        l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }

      return [h * 360, s * 100, l * 100];
    };

    const hslToHex = (h, s, l) => {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;
      const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, "0");
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    const [h, s, l] = hexToHsl(baseColor);

    return {
      main: baseColor,
      light: hslToHex(h, s, Math.min(l + 20, 100)),
      dark: hslToHex(h, s, Math.max(l - 20, 0)),
    };
  }

  resetPositions() {
    if (!window.gsap) {
      console.warn("GSAP is required for ArcadePlayerRoundAnimation");
      return;
    }

    // Reset main elements
    gsap.set(this.mainBand, { width: "0vw", x: "-20px" });
    gsap.set(this.secondaryBand, { right: "-40px", x: "-20px", width: "0vw" });
    gsap.set(this.avatarSpace, { opacity: 0, scale: 0.5 });
    gsap.set(this.flashOverlay, { opacity: 0 });
    gsap.set(this.screenContainer, { opacity: 0 });

    // Reset diagonal bands
    this.diagonalBands.forEach((bandData, i) => {
      const band = bandData.element;
      const fromTopLeft = bandData.fromTopLeft;

      if (fromTopLeft) {
        gsap.set(band, {
          left: gsap.utils.random(0.4, window.innerWidth * 1.5) + "px",
          top: -30 + "px",
          right: "auto",
          bottom: "auto",
          rotation: 45,
          opacity: 0,
          scaleX: 0,
          translateX: 0,
          translateY: 0,
          transformOrigin: "left center",
        });
      } else {
        gsap.set(band, {
          left: gsap.utils.random(0.4, window.innerWidth * 1.5) + "px",
          bottom: -30 + "px",
          right: "auto",
          top: "auto",
          rotation: 225,
          opacity: 0,
          scaleX: 0,
          translateX: 0,
          translateY: 0,
          transformOrigin: "left center",
        });
      }
    });

    // Reset particles
    this.particles.forEach((particle) => {
      gsap.set(particle, {
        left: gsap.utils.random(0, window.innerWidth) + "px",
        top: gsap.utils.random(0, window.innerHeight) + "px",
        opacity: 0,
        scale: gsap.utils.random(0.5, 1.5),
      });
    });
  }

  init() {
    this.injectCSS();
    this.createElements();
    this.createDiagonalBands();
    this.createParticles();
    this.resetPositions();
  }

  startAnimation(baseColor = "#0080ff", mainText = "PLAYER", secondaryText = "ROUND", onComplete = null) {
    if (this.isAnimating || !window.gsap) return;

    const palette = this.generateColorPalette(baseColor);

    // Set CSS custom properties
    document.documentElement.style.setProperty("--arcade-player-color", palette.main + "dd");
    document.documentElement.style.setProperty("--arcade-player-color-light", palette.light + "dd");
    document.documentElement.style.setProperty("--arcade-player-color-dark", palette.dark + "dd");

    this.mainBand.textContent = mainText;
    this.secondaryBand.textContent = secondaryText;

    this.isAnimating = true;

    this.animationContainer.style.display = "block";

    const outDelay = 5.0;

    this.resetPositions();

    const tl = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        //setTimeout(() => this.resetPositions(), 1000);
        this.animationContainer.style.display = "none";
        this.resetPositions();
        if (onComplete && typeof onComplete === "function") {
          onComplete();
        }
      },
    });

    // Flash effect
    tl.to(this.flashOverlay, {
      opacity: 0.3,
      duration: 0.4,
      ease: "power2.out",
    }).to(this.flashOverlay, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.out",
    });

    // Screen shake and fade in
    tl.to(
      this.screenContainer,
      {
        x: 2,
        duration: 0.05,
        repeat: 8,
        yoyo: true,
        ease: "power2.inOut",
      },
      0
    );

    tl.to(
      this.screenContainer,
      {
        opacity: 1.0,
        duration: 0.2,
        ease: "power2.inOut",
      },
      0
    );

    tl.to(this.screenContainer, { opacity: 0, duration: 0.3 }, outDelay);

    // Sounds
    setTimeout(() => {
      Sound.play("pixabay_free/arcade-ui-30-229499.mp3");
    }, 300);
    setTimeout(() => {
      Sound.play("pixabay_free/arcade-ui-29-229501.mp3");
    }, 900);
    //setTimeout(() => { Sound.play("pixabay_free/bonus-points-190035.mp3") }, outDelay*950);

    if (gsap.utils.random(0, 1.0) > 0.5)
      setTimeout(() => {
        Sound.play("pixabay_free/countdown-sound-effect-8-bit-151797.mp3");
      }, 1700);
    else
      setTimeout(() => {
        Sound.play("pixabay_free/robotic-countdown-43935.mp3");
      }, 1700);

    setTimeout(() => {
      Sound.play("pixabay_free/get-coin-351945.mp3");
    }, outDelay * 950);

    // Main band animation
    tl.to(
      this.mainBand,
      {
        width: "90vw",
        duration: 0.3,
        ease: "back.out(1.7)",
      },
      0.2
    );

    tl.to(
      this.mainBand,
      {
        width: "80vw",
        ease: "elastic.out",
        duration: 1,
      },
      0.5
    );

    tl.to(
      this.mainBand,
      {
        x: "105vw",
        duration: 0.3,
      },
      outDelay
    );

    // Secondary band animation
    tl.to(
      this.secondaryBand,
      {
        width: "50vw",
        duration: 0.3,
        ease: "back.out(1.4)",
      },
      0.8
    );

    tl.to(
      this.secondaryBand,
      {
        width: "40vw",
        ease: "elastic.out",
        duration: 1,
      },
      1.0
    );

    tl.to(
      this.secondaryBand,
      {
        x: "-110vw",
        duration: 0.3,
      },
      outDelay
    );

    // Avatar space animation
    tl.to(
      this.avatarSpace,
      {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: "back.out(2)",
      },
      1.2
    );

    // Avatar pulse effect
    tl.to(
      this.avatarSpace,
      {
        scale: 1.3,
        duration: 0.2,
        repeat: 3,
        yoyo: true,
        ease: "power2.inOut",
      },
      1.5
    );

    // Diagonal bands animation
    this.diagonalBands.forEach((bandData, i) => {
      const band = bandData.element;
      const delay = i * 0.08;

      tl.to(
        band,
        {
          opacity: gsap.utils.random(0.05, 0.4),
          scaleX: gsap.utils.random(0.2, 0.6),
          duration: 1.4,
          ease: "power2.out",
        },
        0.8 + delay
      );

      tl.to(
        band,
        {
          opacity: 0,
          duration: 1.3,
          ease: "power2.out",
        },
        1.8 + delay
      );

      tl.to(
        band,
        {
          translateX: "100vw",
          translateY: "100vw",
          duration: 0.8,
        },
        outDelay - 0.7 + delay * 0.4
      );
    });

    // Particles animation
    this.particles.forEach((particle, i) => {
      const delay = gsap.utils.random(0.6, outDelay - 0.6);
      const targetX = gsap.utils.random(-100, window.innerWidth + 100);
      const targetY = gsap.utils.random(-100, window.innerHeight + 100);

      const targetXout =
        targetX < window.innerWidth * 0.5 ? targetX - window.innerWidth * 0.7 : targetX + window.innerWidth * 0.7;
      const targetYout =
        targetY < window.innerHeight * 0.5
          ? targetY - window.innerHeight * gsap.utils.random(0, 0.8)
          : targetY + window.innerHeight * gsap.utils.random(0, 0.8);

      tl.to(
        particle,
        {
          opacity: 1,
          duration: 0.1,
          ease: "power2.out",
        },
        delay
      );

      tl.to(
        particle,
        {
          left: targetX + "px",
          top: targetY + "px",
          duration: 2.5,
          ease: "power2.out",
        },
        delay
      );

      tl.to(
        particle,
        {
          opacity: 0,
          duration: 0.5,
          ease: "power2.out",
        },
        delay + 1.5
      );

      tl.to(
        particle,
        {
          left: targetXout + "px",
          top: targetYout + "px",
          duration: 1.0,
        },
        outDelay
      );
    });

    return tl;
  }

  destroy() {
    if (this.animationContainer && this.animationContainer.parentNode) {
      this.animationContainer.parentNode.removeChild(this.animationContainer);
    }

    // Clean up arrays
    this.diagonalBands = [];
    this.particles = [];

    // Remove styles if no other instances exist
    const styleElement = document.getElementById("arcade-animation-styles");
    if (styleElement && !document.querySelector(".arcade-animation-container")) {
      styleElement.remove();
    }
  }
}

// Export for use in modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ArcadePlayerRoundAnimation;
}

// Also make available globally
if (typeof window !== "undefined") {
  window.ArcadePlayerRoundAnimation = ArcadePlayerRoundAnimation;
}
