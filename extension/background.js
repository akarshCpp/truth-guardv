chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "verify_text") {
    fetch("http://localhost:8000/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: request.text })
    })
    .then(async response => {
      if (!response.ok) {
        let errMsg = `HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errMsg = errData.detail;
          } else if (errData && errData.message) {
            errMsg = errData.message;
          }
        } catch(e) {}
        throw new Error(errMsg);
      }
      return response.json();
    })
    .then(data => sendResponse({ success: true, data: data }))
    .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Indicates we wish to send a response asynchronously
  }
});
