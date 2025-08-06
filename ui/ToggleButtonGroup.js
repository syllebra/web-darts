// Button group management functions
function toggleButtonGroup(groupId) {
  const expandedBtns = document.getElementById(groupId + "ExpandedBtns");
  const mainBtn = document.getElementById(groupId + "MainBtn");

  if (expandedBtns.classList.contains("show")) {
    expandedBtns.classList.remove("show");
  } else {
    // Hide all other expanded groups first
    document.querySelectorAll(".expanded-buttons.show").forEach((group) => {
      group.classList.remove("show");
    });
    expandedBtns.classList.add("show");
  }
}

function showGroupSpinner(groupId) {
  const spinner = document.getElementById(groupId + "Spinner");
  const mainBtn = document.getElementById(groupId + "MainBtn");
  if (spinner) {
    spinner.classList.add("show");
  }
  if (mainBtn) {
    mainBtn.disabled = true;
  }
}

function hideGroupSpinner(groupId) {
  const spinner = document.getElementById(groupId + "Spinner");
  const mainBtn = document.getElementById(groupId + "MainBtn");

  if (spinner) {
    spinner.classList.remove("show");
  }
  if (mainBtn) {
    mainBtn.disabled = false;
  }
}
