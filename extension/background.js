chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "verify_text") {
    fetch("http://localhost:8000/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: request.text })
    })
    .then(response => response.json())
    .then(data => sendResponse({ success: true, data: data }))
    .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Indicates we wish to send a response asynchronously
  }
});
