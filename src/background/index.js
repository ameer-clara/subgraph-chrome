/* eslint-disable no-undef */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (!sender.origin.includes('opensea.io')) {
    console.log('talk to content script');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.windows.remove(tab.windowId);

    //send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      console.log('Tabs: ', tabs);
      chrome.tabs.sendMessage(tabs[0].id, { message: 'Transaction submitted' }, function (response) {
        console.log(response);
      });
    });
  }

  if (message.open) {
    // create new window and load in the extension page
    console.log(message);
    chrome.windows.create({
      url: chrome.runtime.getURL('index.html'),
      type: 'popup',
      width: 400,
      height: 200,
      // left: 800,
      // top: 100,
    });
    sendResponse({ message: 'Extension window opened' });
  }
});
