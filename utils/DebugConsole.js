class MobileDebugConsole {
  constructor(options = {}) {
    this.options = {
      startVisible: true,
      maxEntries: 100,
      buttonPosition: "bottom-right",
      maxPreviewLength: 100, // Maximum characters to show in preview
      maxPreviewLines: 2, // Maximum lines to show in preview
      ...options,
    };

    this.entries = [];
    this.isVisible = this.options.startVisible;
    this.originalConsole = {};

    this.init();
  }

  init() {
    this.createStyles();
    this.createConsole();
    this.createToggleButton();
    this.interceptConsole();
    this.setupEventListeners();
    console.log("MobileDebugConsole initialized successfully");
  }

  createStyles() {
    const style = document.createElement("style");
    style.textContent = `
                    .mobile-debug-console {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: 90%;
                        max-width: 500px;
                        height: 60%;
                        max-height: 600px;
                        background: rgba(40, 40, 40, 0.98);
                        border: 2px solid #555;
                        border-radius: 12px;
                        font-family: 'Courier New', Monaco, monospace;
                        font-size: 12px;
                        z-index: 10000;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                        backdrop-filter: blur(10px);
                    }
                    
                    .mobile-debug-console.hidden {
                        display: none;
                    }
                    
                    .debug-console-header {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        padding: 12px 15px;
                        border-radius: 10px 10px 0 0;
                        font-weight: bold;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        user-select: none;
                        cursor: move;
                    }
                    
                    .debug-console-content {
                        flex: 1;
                        overflow-y: auto;
                        padding: 10px;
                        background: #1a1a1a;
                        border-radius: 0 0 10px 10px;
                    }
                    
                    .debug-console-entry {
                        margin: 6px 0;
                        padding: 8px 10px;
                        border-radius: 6px;
                        border-left: 4px solid;
                        background: rgba(255,255,255,0.05);
                        word-wrap: break-word;
                        font-size: 11px;
                        line-height: 1.4;
                        position: relative;
                    }
                    
                    .debug-console-entry.log {
                        border-left-color: #17a2b8;
                        color: #b3d9ff;
                    }
                    
                    .debug-console-entry.info {
                        border-left-color: #007bff;
                        color: #cce7ff;
                    }
                    
                    .debug-console-entry.warn {
                        border-left-color: #ffc107;
                        color: #fff3cd;
                    }
                    
                    .debug-console-entry.error {
                        border-left-color: #dc3545;
                        color: #f8d7da;
                        background: rgba(220, 53, 69, 0.1);
                    }
                    
                    .debug-console-entry.trace {
                        border-left-color: #6f42c1;
                        color: #d1c4e9;
                        background: rgba(111, 66, 193, 0.1);
                    }
                    
                    .debug-entry-header {
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        user-select: none;
                        min-height: 20px;
                    }
                    
                    .debug-entry-expandable .debug-entry-header:hover {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 4px;
                        margin: -2px -4px;
                        padding: 2px 4px;
                    }
                    
                    .debug-entry-icon {
                        margin-right: 6px;
                        transition: transform 0.2s;
                        font-size: 10px;
                        color: rgba(255, 255, 255, 0.6);
                        width: 12px;
                        text-align: center;
                    }
                    
                    .debug-entry-icon.expanded {
                        transform: rotate(90deg);
                    }
                    
                    .debug-entry-preview {
                        flex: 1;
                        overflow: hidden;
                    }
                    
                    .debug-entry-full {
                        margin-top: 8px;
                        display: none;
                        padding-top: 8px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    
                    .debug-entry-full.expanded {
                        display: block;
                    }
                    
                    .debug-entry-truncated {
                        opacity: 0.7;
                        font-style: italic;
                    }
                    
                    .debug-stack-trace {
                        margin-top: 10px;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 4px;
                        overflow: hidden;
                    }
                    
                    .debug-stack-header {
                        background: rgba(220, 53, 69, 0.2);
                        padding: 8px 12px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        font-size: 11px;
                        color: #f8d7da;
                        user-select: none;
                        transition: background 0.2s;
                    }
                    
                    .debug-stack-header.trace {
                        background: rgba(111, 66, 193, 0.2);
                        color: #d1c4e9;
                    }
                    
                    .debug-stack-header:hover {
                        background: rgba(220, 53, 69, 0.3);
                    }
                    
                    .debug-stack-header.trace:hover {
                        background: rgba(111, 66, 193, 0.3);
                    }
                    
                    .debug-stack-icon {
                        margin-right: 8px;
                        transition: transform 0.2s;
                        font-size: 10px;
                    }
                    
                    .debug-stack-icon.expanded {
                        transform: rotate(90deg);
                    }
                    
                    .debug-stack-content {
                        padding: 10px 12px;
                        font-family: 'Courier New', Monaco, monospace;
                        font-size: 10px;
                        line-height: 1.4;
                        color: #e2e8f0;
                        white-space: pre-wrap;
                        word-break: break-all;
                        max-height: 200px;
                        overflow-y: auto;
                        display: none;
                    }
                    
                    .debug-stack-content.expanded {
                        display: block;
                    }
                    
                    .debug-stack-line {
                        margin: 2px 0;
                        padding: 2px 0;
                    }
                    
                    .debug-stack-line.highlight {
                        background: rgba(220, 53, 69, 0.15);
                        color: #ffb3ba;
                        padding: 2px 4px;
                        border-radius: 2px;
                    }
                    
                    .debug-console-timestamp {
                        color: #6c757d;
                        font-size: 10px;
                        margin-right: 8px;
                        white-space: nowrap;
                    }
                    
                    .debug-console-source {
                        color: #6c757d;
                        font-size: 10px;
                        margin-left: 8px;
                        font-style: italic;
                        white-space: nowrap;
                    }
                    
                    .debug-console-toggle {
                        position: fixed !important;
                        bottom: 20px !important;
                        right: 20px !important;
                        width: 50px;
                        height: 50px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border: none;
                        border-radius: 50%;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                        z-index: 10001 !important;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                        transition: all 0.3s ease;
                        display: flex !important;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .debug-console-toggle:hover {
                        transform: scale(1.1);
                        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                    }
                    
                    .debug-console-toggle:active {
                        transform: scale(0.95);
                    }
                    
                    .debug-clear-btn {
                        background: rgba(220, 53, 69, 0.8);
                        border: none;
                        color: white;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                        transition: background 0.3s;
                    }
                    
                    .debug-clear-btn:hover {
                        background: rgba(220, 53, 69, 1);
                    }
                    
                    @media (max-width: 480px) {
                        .mobile-debug-console {
                            top: 10px;
                            right: 10px;
                            left: 10px;
                            width: auto;
                            height: 50%;
                        }
                        
                        .debug-console-toggle {
                            bottom: 15px !important;
                            right: 15px !important;
                            width: 45px;
                            height: 45px;
                            font-size: 18px;
                        }
                    }
                `;
    document.head.appendChild(style);
  }

  createConsole() {
    this.consoleElement = document.createElement("div");
    this.consoleElement.className = `mobile-debug-console ${this.isVisible ? "" : "hidden"}`;

    this.consoleElement.innerHTML = `
                    <div class="debug-console-header">
                        <span>🐛 Debug Console</span>
                        <button class="debug-clear-btn" onclick="window.mobileDebugConsole.clear()">Clear</button>
                    </div>
                    <div class="debug-console-content"></div>
                `;

    document.body.appendChild(this.consoleElement);
    this.contentElement = this.consoleElement.querySelector(".debug-console-content");

    this.makeDraggable();
  }

  createToggleButton() {
    this.toggleButton = document.createElement("button");
    this.toggleButton.className = "debug-console-toggle";
    this.toggleButton.innerHTML = "🐛";
    this.toggleButton.title = "Toggle Debug Console";
    this.toggleButton.onclick = () => this.toggle();

    document.body.appendChild(this.toggleButton);
    console.log("Debug toggle button created and added to page");
  }

  makeDraggable() {
    const header = this.consoleElement.querySelector(".debug-console-header");
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.consoleElement.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      this.consoleElement.style.left = `${startLeft + deltaX}px`;
      this.consoleElement.style.top = `${startTop + deltaY}px`;
      this.consoleElement.style.right = "auto";
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }

  interceptConsole() {
    const methods = ["log", "info", "warn", "error", "trace"];

    methods.forEach((method) => {
      this.originalConsole[method] = console[method];
      console[method] = (...args) => {
        this.originalConsole[method].apply(console, args);

        // Capture stack trace for all methods to get source location
        let capturedStack = null;
        let sourceInfo = null;

        // For errors and warnings, check if there's an Error object first
        if (method === "error" || method === "warn") {
          for (const arg of args) {
            if (arg instanceof Error && arg.stack) {
              capturedStack = arg.stack;
              break;
            }
          }
        }

        // Always try to capture current stack for source location
        try {
          throw new Error("Stack capture");
        } catch (e) {
          if (!capturedStack) {
            capturedStack = e.stack;
          }

          // Extract source info from stack for all message types
          sourceInfo = this.extractSourceInfo(e.stack);
        }

        this.addEntry(method, args, {
          stack: capturedStack,
          sourceInfo: sourceInfo,
          showStackTrace: method === "trace" || method === "error" || method === "warn",
        });
      };
    });

    window.addEventListener("error", (event) => {
      this.addEntry("error", [`Uncaught ${event.error?.name || "Error"}: ${event.message}`], {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        sourceInfo: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const stack = reason?.stack || (reason instanceof Error ? reason.stack : null);
      this.addEntry("error", [`Unhandled Promise Rejection: ${reason}`], {
        stack: stack,
      });
    });
  }

  extractSourceInfo(stack) {
    if (!stack) return null;

    const lines = stack.split("\n");

    // Look for the first line that's not from this debug console
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (
        line &&
        !line.includes("MobileDebugConsole") &&
        !line.includes("at console.") &&
        !line.includes("Stack capture")
      ) {
        // Try different patterns for extracting file info
        let match;

        // Pattern 1: at functionName (file:line:column)
        match = line.match(/at\s+.*?\s*\(([^)]+):(\d+):(\d+)\)/);
        if (match) {
          return {
            filename: match[1],
            lineno: parseInt(match[2]),
            colno: parseInt(match[3]),
          };
        }

        // Pattern 2: at file:line:column
        match = line.match(/at\s+([^:]+):(\d+):(\d+)/);
        if (match) {
          return {
            filename: match[1],
            lineno: parseInt(match[2]),
            colno: parseInt(match[3]),
          };
        }

        // Pattern 3: file:line:column (without 'at')
        match = line.match(/([^:]+):(\d+):(\d+)/);
        if (match) {
          return {
            filename: match[1],
            lineno: parseInt(match[2]),
            colno: parseInt(match[3]),
          };
        }
      }
    }

    return null;
  }

  addEntry(type, args, errorInfo = null) {
    const timestamp = new Date().toLocaleTimeString();

    const entry = {
      type,
      args,
      timestamp,
      errorInfo,
      stack: errorInfo?.stack || null,
      sourceInfo: errorInfo?.sourceInfo || null,
      showStackTrace: errorInfo?.showStackTrace || false,
    };

    this.entries.push(entry);

    if (this.entries.length > this.options.maxEntries) {
      this.entries.shift();
    }

    this.renderEntry(entry);
    this.scrollToBottom();
  }

  formatArgument(arg) {
    if (arg === null) return '<span style="color: #6c757d;">null</span>';
    if (arg === undefined) return '<span style="color: #6c757d;">undefined</span>';
    if (typeof arg === "string") return arg;
    if (typeof arg === "number") return `<span style="color: #28a745;">${arg}</span>`;
    if (typeof arg === "boolean") return `<span style="color: #ffc107;">${arg}</span>`;
    if (typeof arg === "function") return `<span style="color: #17a2b8;">[Function: ${arg.name || "anonymous"}]</span>`;

    try {
      return `<span style="color: #e83e8c;">${JSON.stringify(arg, null, 2)}</span>`;
    } catch (e) {
      return `<span style="color: #dc3545;">[Object: ${arg.constructor?.name || "unknown"}]</span>`;
    }
  }

  createPreviewAndFull(formattedArgs) {
    const plainText = formattedArgs.replace(/<[^>]*>/g, ""); // Strip HTML for length calculation
    const lines = plainText.split("\n");

    const isTruncated = plainText.length > this.options.maxPreviewLength || lines.length > this.options.maxPreviewLines;

    if (!isTruncated) {
      return {
        preview: formattedArgs,
        full: null,
        needsExpansion: false,
      };
    }

    // Create preview - truncate by character length and lines
    let preview = formattedArgs;
    const previewLines = lines.slice(0, this.options.maxPreviewLines);
    let previewText = previewLines.join("\n");

    if (previewText.length > this.options.maxPreviewLength) {
      previewText = previewText.substring(0, this.options.maxPreviewLength);
    }

    // Try to preserve HTML structure in preview
    if (formattedArgs.includes("<span")) {
      // Simple approach: if we have HTML spans, try to keep them balanced
      const truncatePoint = Math.min(previewText.length, formattedArgs.length);
      preview = formattedArgs.substring(0, truncatePoint);

      // Close any unclosed spans
      const openSpans = (preview.match(/<span[^>]*>/g) || []).length;
      const closedSpans = (preview.match(/<\/span>/g) || []).length;
      const unclosedSpans = openSpans - closedSpans;

      for (let i = 0; i < unclosedSpans; i++) {
        preview += "</span>";
      }
    } else {
      preview = previewText;
    }

    const lineInfo =
      lines.length > this.options.maxPreviewLines ? ` (+${lines.length - this.options.maxPreviewLines} lines)` : "";
    const charInfo =
      plainText.length > this.options.maxPreviewLength
        ? ` (+${plainText.length - this.options.maxPreviewLength} chars)`
        : "";

    return {
      preview: preview + `<span class="debug-entry-truncated">...${charInfo}${lineInfo}</span>`,
      full: formattedArgs,
      needsExpansion: true,
    };
  }

  renderEntry(entry) {
    const entryElement = document.createElement("div");
    entryElement.className = `debug-console-entry ${entry.type}`;

    const formattedArgs = entry.args.map((arg) => this.formatArgument(arg)).join(" ");
    const { preview, full, needsExpansion } = this.createPreviewAndFull(formattedArgs);

    // Enhanced source info display for all message types
    let sourceInfo = "";

    // First try to use the captured source info
    if (entry.sourceInfo) {
      const { filename, lineno, colno } = entry.sourceInfo;
      if (filename) {
        let displayName;
        if (filename.includes("://")) {
          // For URLs, show just the filename
          displayName = filename.split("/").pop();
        } else {
          // For local files, show the filename
          displayName = filename.split("/").pop().split("\\").pop();
        }
        sourceInfo = `<span class="debug-console-source">${displayName}:${lineno}:${colno}</span>`;
      }
    }

    // Fallback to legacy error info (for uncaught errors)
    else if (entry.errorInfo && entry.errorInfo.filename) {
      const { filename, lineno, colno } = entry.errorInfo;
      const shortFilename = filename.split("/").pop();
      sourceInfo = `<span class="debug-console-source">${shortFilename}:${lineno}:${colno}</span>`;
    }

    // If no source info found, show a generic indicator
    if (!sourceInfo) {
      sourceInfo = '<span class="debug-console-source">unknown</span>';
    }

    let stackTraceHtml = "";
    if (entry.stack && entry.showStackTrace) {
      stackTraceHtml = this.createStackTrace(entry.stack, entry.type);
    }

    const entryId = `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (needsExpansion) {
      entryElement.classList.add("debug-entry-expandable");
    }

    entryElement.innerHTML = `
      <div class="debug-entry-header" ${
        needsExpansion ? `onclick="window.mobileDebugConsole.toggleEntry('${entryId}')"` : ""
      }>
        ${
          needsExpansion
            ? `<span class="debug-entry-icon" id="icon-${entryId}">▶</span>`
            : '<span class="debug-entry-icon"></span>'
        }
        <div class="debug-entry-preview">
          <span class="debug-console-timestamp">${entry.timestamp}</span>
          ${preview}
          ${sourceInfo}
        </div>
      </div>
      ${
        needsExpansion
          ? `
        <div class="debug-entry-full" id="content-${entryId}">
          <span class="debug-console-timestamp">${entry.timestamp}</span>
          ${full}
          ${sourceInfo}
        </div>
      `
          : ""
      }
      ${stackTraceHtml}
    `;

    this.contentElement.appendChild(entryElement);
  }

  toggleEntry(entryId) {
    const content = document.getElementById(`content-${entryId}`);
    const icon = document.getElementById(`icon-${entryId}`);

    if (content && icon) {
      const isExpanded = content.classList.contains("expanded");
      content.classList.toggle("expanded", !isExpanded);
      icon.classList.toggle("expanded", !isExpanded);
      icon.textContent = isExpanded ? "▶" : "▼";

      if (!isExpanded) {
        setTimeout(() => {
          content.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 200);
      }
    }
  }

  createStackTrace(stack, type = "error") {
    if (!stack || typeof stack !== "string") return "";

    const stackId = `stack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lines = stack.split("\n").filter((line) => line.trim());

    if (lines.length <= 1) return "";

    const relevantLines = lines
      .slice(1)
      .filter(
        (line) =>
          !line.includes("MobileDebugConsole") &&
          !line.includes("at console.") &&
          !line.includes("Stack capture") &&
          line.trim() !== ""
      );

    if (relevantLines.length === 0) return "";

    const processedLines = relevantLines
      .map((line, index) => {
        const trimmed = line.trim();
        const isErrorLine = index === 0;
        const cssClass = isErrorLine ? "debug-stack-line highlight" : "debug-stack-line";

        let cleanLine = trimmed
          .replace(/^\s*at\s+/, "• ")
          .replace(/\s+\(/g, " (")
          .replace(/\)$/, ")");

        cleanLine = cleanLine.replace(/(https?:\/\/[^\/]+)([^:]+):(\d+):(\d+)/, (match, domain, path, line, col) => {
          const filename = path.split("/").pop();
          return `${filename}:${line}:${col}`;
        });

        cleanLine = cleanLine.replace(/([^\/\s]+\.html?):(\d+):(\d+)/, "$1:$2:$3");

        return `<div class="${cssClass}">${cleanLine}</div>`;
      })
      .join("");

    // Different labels and styling based on type
    const isTrace = type === "trace";
    const headerClass = isTrace ? "debug-stack-header trace" : "debug-stack-header";
    const label = isTrace ? "Call Stack" : "Stack Trace";

    return `
                    <div class="debug-stack-trace">
                        <div class="${headerClass}" onclick="window.mobileDebugConsole.toggleStackTrace('${stackId}')">
                            <span class="debug-stack-icon" id="icon-${stackId}">▶</span>
                            <span>${label} (${relevantLines.length} frames)</span>
                        </div>
                        <div class="debug-stack-content" id="content-${stackId}">
                            ${processedLines}
                        </div>
                    </div>
                `;
  }

  toggleStackTrace(stackId) {
    const content = document.getElementById(`content-${stackId}`);
    const icon = document.getElementById(`icon-${stackId}`);

    if (content && icon) {
      const isExpanded = content.classList.contains("expanded");
      content.classList.toggle("expanded", !isExpanded);
      icon.classList.toggle("expanded", !isExpanded);
      icon.textContent = isExpanded ? "▶" : "▼";

      if (!isExpanded) {
        setTimeout(() => {
          content.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 200);
      }
    }
  }

  scrollToBottom() {
    if (this.contentElement) {
      setTimeout(() => {
        this.contentElement.scrollTop = this.contentElement.scrollHeight;
      }, 0);
    }
  }

  toggle() {
    this.isVisible = !this.isVisible;
    this.consoleElement.classList.toggle("hidden", !this.isVisible);

    if (this.isVisible) {
      this.scrollToBottom();
    }
  }

  show() {
    this.isVisible = true;
    this.consoleElement.classList.remove("hidden");
    this.scrollToBottom();
  }

  hide() {
    this.isVisible = false;
    this.consoleElement.classList.add("hidden");
  }

  clear() {
    this.entries = [];
    this.contentElement.innerHTML = "";
  }

  destroy() {
    Object.keys(this.originalConsole).forEach((method) => {
      console[method] = this.originalConsole[method];
    });

    if (this.consoleElement) {
      this.consoleElement.remove();
    }
    if (this.toggleButton) {
      this.toggleButton.remove();
    }
  }

  setupEventListeners() {
    window.mobileDebugConsole = this;
  }
}

// Initialize the debug console
if (isMobile()) {
  const debugConsole = new MobileDebugConsole({
    maxPreviewLength: 150, // Customize preview length
    maxPreviewLines: 3, // Customize preview lines
  });
}
