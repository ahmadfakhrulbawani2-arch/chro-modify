(() => {
  const TOOLBAR_ID = "hover-image-tools-toolbar";
  const MIN_IMAGE_SIZE = 48;

  let currentImage = null;
  let hideTimeout = null;
  let enabled = true;

  chrome.storage.local.get({ enabled: true }, (result) => {
    enabled = result.enabled;

    if (!enabled) {
      toolbar.classList.remove("visible");
      currentImage = null;
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.enabled) {
      return;
    }

    enabled = changes.enabled.newValue;

    if (!enabled) {
      clearTimeout(hideTimeout);
      currentImage = null;
      toolbar.classList.remove("visible");
    }
  });

  const toolbar = document.createElement("div");

  toolbar.id = TOOLBAR_ID;

  toolbar.innerHTML = `
    <button type="button" data-action="download">
      <span aria-hidden="true">↓</span>
      Download
    </button>

    <button type="button" data-action="copy">
      <span aria-hidden="true">⧉</span>
      Copy URL
    </button>
  `;

  document.documentElement.appendChild(toolbar);

  function isValidImage(image) {
    if (!(image instanceof HTMLImageElement)) {
      return false;
    }

    if (!image.isConnected) {
      return false;
    }

    const rect = image.getBoundingClientRect();

    if (rect.width < MIN_IMAGE_SIZE || rect.height < MIN_IMAGE_SIZE) {
      return false;
    }

    const style = getComputedStyle(image);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      return false;
    }

    return Boolean(image.currentSrc || image.src);
  }

  function getImageUrl(image) {
    return image.currentSrc || image.src;
  }

  function getFilename(url) {
    try {
      const parsedUrl = new URL(url);

      const pathname = decodeURIComponent(parsedUrl.pathname);

      let filename = pathname.split("/").pop();

      if (!filename || !filename.includes(".")) {
        filename = "image";
      }

      return filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
    } catch {
      return "image";
    }
  }

  function positionToolbar(image) {
    const rect = image.getBoundingClientRect();

    const toolbarRect = toolbar.getBoundingClientRect();

    let left = rect.right - toolbarRect.width - 8;
    let top = rect.top + 8;

    left = Math.max(
      8,
      Math.min(left, window.innerWidth - toolbarRect.width - 8),
    );

    if (top + toolbarRect.height > window.innerHeight - 8) {
      top = rect.bottom - toolbarRect.height - 8;
    }

    top = Math.max(
      8,
      Math.min(top, window.innerHeight - toolbarRect.height - 8),
    );

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
  }

  function showToolbar(image) {
    clearTimeout(hideTimeout);

    if (!enabled || !isValidImage(image)) {
      return;
    }

    currentImage = image;

    toolbar.classList.add("visible");

    positionToolbar(image);
  }

  function hideToolbar() {
    hideTimeout = setTimeout(() => {
      if (toolbar.matches(":hover")) {
        return;
      }

      currentImage = null;

      toolbar.classList.remove("visible");
    }, 150);
  }

  document.addEventListener(
    "pointerover",
    (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const image = target.closest("img");

      if (image && isValidImage(image)) {
        showToolbar(image);
      }
    },
    true,
  );

  document.addEventListener(
    "pointerout",
    (event) => {
      if (!currentImage) {
        return;
      }

      const relatedTarget = event.relatedTarget;

      if (
        relatedTarget instanceof Node &&
        (currentImage.contains(relatedTarget) ||
          toolbar.contains(relatedTarget))
      ) {
        return;
      }

      if (
        event.target === currentImage ||
        currentImage.contains(event.target)
      ) {
        hideToolbar();
      }
    },
    true,
  );

  toolbar.addEventListener("pointerenter", () => {
    clearTimeout(hideTimeout);
  });

  toolbar.addEventListener("pointerleave", hideToolbar);

  toolbar.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!enabled) {
      return;
    }

    if (!button || !currentImage) {
      return;
    }

    const imageUrl = getImageUrl(currentImage);

    if (!imageUrl) {
      return;
    }

    if (button.dataset.action === "download") {
      button.disabled = true;

      try {
        const response = await chrome.runtime.sendMessage({
          action: "downloadImage",
          url: imageUrl,
          filename: getFilename(imageUrl),
        });

        if (!response?.success) {
          throw new Error(response?.error || "Download gagal.");
        }

        showToast("Download dimulai.");
      } catch (error) {
        showToast(error.message || "Download gagal.");
      } finally {
        button.disabled = false;
      }
    }

    if (button.dataset.action === "copy") {
      try {
        await navigator.clipboard.writeText(imageUrl);

        showToast("URL gambar berhasil disalin!");
      } catch {
        showToast("Gagal menyalin URL gambar.");
      }
    }
  });

  function showToast(message) {
    let toast = document.getElementById("hover-image-tools-toast");

    if (!toast) {
      toast = document.createElement("div");

      toast.id = "hover-image-tools-toast";

      document.documentElement.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("visible");

    setTimeout(() => {
      toast.classList.remove("visible");
    }, 1800);
  }

  window.addEventListener(
    "scroll",
    () => {
      if (currentImage && toolbar.classList.contains("visible")) {
        if (!currentImage.isConnected) {
          toolbar.classList.remove("visible");
          currentImage = null;

          return;
        }

        positionToolbar(currentImage);
      }
    },
    true,
  );

  window.addEventListener("resize", () => {
    if (currentImage && toolbar.classList.contains("visible")) {
      positionToolbar(currentImage);
    }
  });
})();
