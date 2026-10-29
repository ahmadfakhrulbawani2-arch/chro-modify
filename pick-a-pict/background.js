chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "downloadImage") {
    return;
  }

  const imageUrl = message.url;

  if (
    typeof imageUrl !== "string" ||
    !["http:", "https:", "data:", "blob:"].includes(getProtocol(imageUrl))
  ) {
    sendResponse({
      success: false,
      error: "URL gambar tidak valid.",
    });

    return;
  }

  chrome.downloads.download(
    {
      url: imageUrl,
      filename: message.filename || "image",
      saveAs: false,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });

        return;
      }

      sendResponse({
        success: true,
        downloadId,
      });
    },
  );

  return true;
});

function getProtocol(url) {
  try {
    return new URL(url).protocol;
  } catch {
    return "";
  }
}
