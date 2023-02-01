/* global chrome */

var chainId = 0;
var reviewsLoaded = false;

/**
 * Utils
 */

const waitForElement = async selector => {
  while ( document.querySelector(selector) === null) {
    await new Promise( resolve =>  requestAnimationFrame(resolve) )
  }
  return document.querySelector(selector);
};

// https://thegraph.com/hosted-service/subgraph/ameer-clara/honft-test
const fetchGReviews = async (chainId, address, id) => {
  // TODO: update contract to index "createdAt"
  // then query and display
  const review = await fetch(
    `https://api.thegraph.com/subgraphs/name/ameer-clara/honft-test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
                  newReviews(
                    where: {
                      assetHash: "${address}",
                      assetId: "${id}"
                    }
                  ) {
                    id, sender, assetHash, assetId, review, rating
                  }
                }`,
      }),
    }
  );

  return (await review.json())?.data?.newReviews;
};

/**
 * Components to render
 */

const buildReviewsHtml = ({ createdAt, sender, rating, review }) => {
  // TODO: include createdAt
  // const d = new Date(createdAt);
  // <i>${d.toDateString()}</i>
  const html = `
    <div class="reviews__review-metadata">
      Reviewed by <a class="reviews-link" href="/${sender}">${sender.slice(-6)}</a>
      <div class="reviews-stars">${"⭐".repeat(rating)}</div>
    </div>
    <div class="reviews__review-text">
      ${review}
    </div>
  `;
  const el = document.createElement("div");
  el.innerHTML = html;
  el.className = "reviews__review-block";
  return el;
};

const buildReviewForm = (assetHash, assetId) => {
  const html = `
    <form id="reviewForm" class="reviews__review-form">
      <div class="reviews__review-form-inner">
        <h2>New Review</h2>
        <label>Rating<br/>
          <div class="reviews__review-form__stars">
            ${ [1,2,3,4,5].map(val => {
              return (`<label>
                <input type="radio" name="stars" value="${val}" />
                ${'<span class="star-icon">⭐</span>'.repeat(val)}
              </label>`)
            }).join('')}
          </div>
        </label>
        <label>Review<br/>
          <textarea name="review" class="reviews__review-form__body" placeholder="This NFT..."></textarea>
        </label>
        <input name="assetHash" hidden="true" type="text" value="${assetHash}" />
        <input name="assetId" hidden="true" type="number" value="${assetId}" />
        <button class="reviews__submit_btn" type="submit">
            Submit
        </button>
      </div>
    </form>
    <a class="reviews__add_btn" href="#reviewForm">
      Add Review
    </a>
  `
  const el = document.createElement("div");
  el.innerHTML = html;
  el.className = "reviews__review-form-wrap";
  return el;
};

const setReviewFormStatus = (status) => {
  const formWrapEl = document.querySelector('.reviews__review-form');
  formWrapEl.innerHTML = `
    <h2>New Review</h2>
    <p>Submitting...</p>
  `
};

const injectReviews = async (address, id) => {
  console.log("injecting review form");
  const reviewSection = document.createElement("div");
  reviewSection.className = "reviews-section";
  reviewSection.innerHTML = `<h3 class="reviews-header">Reviews from The Graph</h3>`;
  // Provide fallback parent element
  const firstSection = document.querySelector(".TradeStation--main") || document.querySelectorAll('item--frame')[0];
  firstSection.parentElement.appendChild(reviewSection);
  // Show placeholder first
  // "loading..."

  // TODO: insert review form
  const reviewFormEl = buildReviewForm(address, id);
  reviewSection.appendChild(reviewFormEl);
  function processForm(e) {
    if (e.preventDefault) e.preventDefault();
      console.log(e);
      var formData = new FormData(e.target);
      var formObj = Object.fromEntries(formData);
      console.log(formObj);
      // setting loading status
      setReviewFormStatus('Submitting review...');
      sendPayloadToExtension({
        assetHash: formObj['assetHash'],
        assetId: formObj['assetId'],
        review: formObj['review'],
        rating: formObj['stars']
      }, true);
      return false;
  }

  var form = document.getElementById('reviewForm');
  if (form.attachEvent) {
      form.attachEvent("submit", processForm);
  } else {
      form.addEventListener("submit", processForm);
  }

  // don't process if there are no reviews
  const fetchReviews = await fetchGReviews(chainId, address, id);
  console.log("fetched review: ", fetchReviews);
  for (let i = 0; i < fetchReviews?.length; i++) {
    const review = fetchReviews[i];
    console.log("review: ", review);
    const reviewEl = buildReviewsHtml(review);
    reviewSection.appendChild(reviewEl);
  }
  if (!fetchReviews || fetchReviews.length < 1) {
    const emptyMsg = `<p>No reviews found for this asset</p>`;
    reviewSection.insertAdjacentHTML("beforeend", emptyMsg);
  }
  console.log("done fetching reviews");
};

/**
 * renderReviews() embeds reviews on asset page
 * @param {*} address asset collection hash
 * @param {*} id asset id
 */
async function renderReviews(address, id) {
  const url = window.location;
  console.log("url:", window.location);
  // if address and id are found, then we are on an NFT page
  if (address && id) {
    console.log("On NFT page:");
    await injectReviews(address, id);
    // user on NFT page inject review area
    // TODO
  } else if (url.href.includes("collection")) {
    console.log("On Collection page:");
  }
}

// extract NFT address and id from link
let getAddressAndId = (link) => {
  if (!link.href.includes("collection")) {
    // not processing solana
    if (link.href.includes("solana")) {
      console.log("Solana support is not yet available 😭");
      return null;
    }
    if (chainId === 0) {
      if (link.href.includes("klaytn")) {
        console.log("Chain: Klaytn");
        chainId = 8217;
      } else if (link.href.includes("matic")) {
        console.log("Chain: Matic");
        chainId = 137;
      } else {
        console.log("Chain: Ethereum");
        chainId = 1;
      }
    }
  }

  let fragments = link.href.split("/");
  let address = null;
  let id = null;
  for (let i = 0; i < fragments.length; i++) {
    let f = fragments[i];
    if (f.includes("0x")) {
      address = f;
      id = fragments[i + 1]; // id always follows address
      break;
    }
  }
  if (address !== null && id != null) {
    const cleanId = id.split("#")[0];
    const key = chainId + address + cleanId;

    console.log(
      "Processing : ",
      address + ", id: ",
      cleanId + ", chain: ",
      chainId,
      ", key: ",
      key
    );
    return { address, id: cleanId, key, chainId };
  } else {
    return null;
  }
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let sendPayloadToExtension = (nftPayload, isSubmission) => {
  // send message to the background script to open the extension in a popup window
  chrome.runtime.sendMessage({ open: true }, async (response) => {
    console.log(response);
    // wait for the window to load
    await delay(1000);
    // send message to extension to perform the transaction
    console.log("sending payload....", nftPayload);
    chrome.runtime.sendMessage(nftPayload, (response) => {
      console.log(response);
      if (isSubmission) {
        setReviewFormStatus("Please confirm transaction.");
      }
    });
  });
};

const checkAndRender = async() => {
  const url = window.location;
  console.log("url:", url);
  const nftPayload = getAddressAndId(url) || "";
  const { address, id } = nftPayload;

  // if address and id are found, then we are on an NFT page
  if (address && id && !reviewsLoaded) {
    console.log("On NFT page:");
    reviewsLoaded = true;
    // test comms with background script/extension
    // sendPayloadToExtension(nftPayload);
    // Insert reviews
    await renderReviews(address, id);
    // user on NFT page inject review area
  } else if (url.href.includes("collection")) {
    console.log("On Collection page:");
  }
};

// initial page load
(async function main() {
  console.log('init checkAndRender');
  await checkAndRender();

  var currentPath = window.location.pathname;
  setInterval(async() => {
      // Monitor for path change
      if(window.location.pathname !== currentPath) {
          reviewsLoaded = false;
          currentPath = window.location.pathname;
          waitForElement('.TradeStation--main').then(async () => {
            console.log('waited checkAndRender');
            await checkAndRender();
          });
      }
  }, 100);
})();
