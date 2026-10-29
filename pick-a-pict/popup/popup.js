const toggle = document.getElementById("enabled");
const status = document.getElementById("status");

chrome.storage.local.get({ enabled: true }, (result) => {
  toggle.checked = result.enabled;
  updateStatus(result.enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;

  chrome.storage.local.set({ enabled }, () => {
    updateStatus(enabled);
  });
});

function updateStatus(enabled) {
  status.textContent = enabled
    ? "Active · Hover over an image"
    : "Disabled · Hover tools hidden";
}
