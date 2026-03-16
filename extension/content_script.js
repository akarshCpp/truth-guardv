function addVerifyButtons() {
  const aiMessages = document.querySelectorAll('.ai-message, [data-message-author-role="assistant"]');
  
  aiMessages.forEach(message => {
    // Only add if not already added
    if (!message.querySelector('.truth-verify-btn')) {
      const btn = document.createElement('button');
      btn.className = 'truth-verify-btn';
      btn.textContent = '🛡️ Verify Truth';
      
      btn.addEventListener('click', async () => {
        btn.textContent = '🛡️ Verifying...';
        btn.disabled = true;
        
        // Extract text safely without the button and without breaking inner structure
        let textToVerify = "";
        try {
          // Clone the node, remove our button, and get text content cleanly
          const clone = message.cloneNode(true);
          const btnInClone = clone.querySelector('.truth-verify-btn');
          if (btnInClone) btnInClone.remove();
          // ChatGPT uses many paragraphs, innerText is usually the safest for preserving spaces
          textToVerify = clone.innerText || clone.textContent;
        } catch (e) {
          console.error("Text extraction failed", e);
          btn.textContent = '❌ Extract Error';
          return;
        }
        
        if (!textToVerify || textToVerify.trim() === '') {
           btn.textContent = '❌ Empty';
           setTimeout(() => { btn.textContent = '🛡️ Verify Truth'; btn.disabled = false; }, 2000);
           return;
        }
        
        chrome.runtime.sendMessage({ action: "verify_text", text: textToVerify }, (response) => {
          btn.disabled = false;
          
          if (response && response.success && response.data) {
            const data = response.data;
            if (data.status === "false") {
              btn.textContent = '⚠️ Hallucinated!';
              highlightHallucination(message, data.original_text, data.correction, data.confidence_score);
            } else {
              const scoreText = data.confidence_score ? ` (Score: ${data.confidence_score}%)` : '';
              btn.textContent = `✅ Verified${scoreText}`;
              setTimeout(() => { btn.textContent = '🛡️ Verify Truth'; }, 3000);
            }
          } else {
            console.error("Verification failed", response);
            btn.textContent = '❌ Error API';
            setTimeout(() => { btn.textContent = '🛡️ Verify Truth'; }, 3000);
          }
        });
      });
      
      message.appendChild(btn);
    }
  });
}

function highlightHallucination(messageElement, originalText, correction, score) {
  const scoreBadge = score ? `<span style="font-size: 11px; font-weight: bold; color: #cc0000; margin-left: 6px;">[Score: ${score}%]</span>` : '';
  
  if (originalText) {
    // Attempt inline replace for simple DOMs
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegExp(originalText), "i");
    
    if (regex.test(messageElement.innerHTML)) {
      const span = `<span class="hallucination" data-correction="${correction}">${originalText}<button class="truth-fix-btn">Fix it</button>${scoreBadge}</span>`;
      messageElement.innerHTML = messageElement.innerHTML.replace(regex, span);
      
      setupFixButtons(messageElement);
      
      const oldBtn = messageElement.querySelector('.truth-verify-btn');
      if (oldBtn) oldBtn.remove();
      addVerifyButtons(); 
    } else {
      // ChatGPT DOM represents text securely with HTML tags that break simple string matching
      // We append a safe, non-destructive fallback box to the end of the AI message
      const box = document.createElement('div');
      box.className = 'hallucination-box';
      box.style.marginTop = '12px';
      box.style.padding = '10px';
      box.style.border = '1px solid #ffcccc';
      box.style.backgroundColor = '#fff0f0';
      box.style.borderRadius = '5px';
      box.style.color = '#333';
      box.innerHTML = `<strong>⚠️ Hallucination Detected</strong>${scoreBadge}<br><br>
                       <del>${originalText}</del><br><br>
                       <strong>Correction:</strong> ${correction} 
                       <button class="truth-fix-btn" style="margin-top: 8px; display:block;">Apply Correction</button>`;
      
      messageElement.appendChild(box);
      
      // Override default fix logic since we aren't replacing an inline span
      const fixBtn = box.querySelector('.truth-fix-btn');
      fixBtn.addEventListener('click', () => {
         const correctedText = document.createElement('div');
         correctedText.style.color = '#006600';
         correctedText.style.fontWeight = 'bold';
         correctedText.style.marginTop = '10px';
         correctedText.innerHTML = `✅ <strong>Correction Applied:</strong> ${correction}`;
         box.replaceWith(correctedText);
      });
    }
  }
}

function setupFixButtons(container) {
  const fixBtns = container.querySelectorAll('.truth-fix-btn');
  fixBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const hallucinationSpan = this.parentElement;
      const correction = hallucinationSpan.getAttribute('data-correction');
      
      if (correction) {
        // Replace the span with the corrected text
        const textNode = document.createTextNode(correction);
        hallucinationSpan.parentNode.replaceChild(textNode, hallucinationSpan);
      }
    });
  });
}

// Initial run
addVerifyButtons();

// Observe DOM for newly added messages (e.g. in real ChatGPT)
const observer = new MutationObserver((mutations) => {
  let shouldRun = false;
  for (let mutation of mutations) {
    if (mutation.addedNodes.length > 0 || mutation.type === 'characterData') {
      shouldRun = true;
      break;
    }
  }
  if (shouldRun) {
    // slight debounce or simple direct call is fine for this demo
    addVerifyButtons();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
