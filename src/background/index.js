/* eslint-disable no-undef */

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.open) {
    // create new window and load in the extension page
    console.log(message);
    chrome.windows.create({
      url: chrome.runtime.getURL("index.html"),
      type: "popup",
      width: 400,
      height: 200,
      // left: 800,
      // top: 100,
    });
    sendResponse({ message: "Extension window opened" });
  }
});
