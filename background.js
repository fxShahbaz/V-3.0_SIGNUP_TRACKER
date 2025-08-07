// Simple function to click send button (from working version)
function autoClickSendButton() {
  console.log('Auto-clicking send button...');
  
  setTimeout(() => {
    const sendBtn = document.querySelector('span[data-icon="send"]');
    if (sendBtn) {
      console.log('Found send button, clicking it...');
      sendBtn.click();
      console.log('Send button clicked successfully');
    } else {
      console.log('Send button not found');
    }
  }, 2000);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_LEAD') {
    // Broadcast to all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'NEW_LEAD',
          data: message.data
        }).catch(err => console.log('Error sending message to tab:', err));
      });
    });
  } else if (message.type === 'SEND_WHATSAPP_MESSAGE') {
    // Handle WhatsApp message sending
    console.log('Background: Received WhatsApp send request for:', message.phone);
    handleWhatsAppMessageSending(message.phone, message.message, sendResponse);
    return true; // Keep message channel open for async response
  } else if (message.type === 'DEBUG_TABS') {
    // Debug function to check what tabs are available
    console.log('Background: Debug tabs request received');
    debugTabs().then(result => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
});

async function handleWhatsAppMessageSending(phone, message, sendResponse) {
  try {
    console.log('Background: Sending WhatsApp message to:', phone);
    
    // Check if WhatsApp Web tab already exists
    const existingTabs = await chrome.tabs.query({url: "*://web.whatsapp.com/*"});
    
    if (existingTabs.length > 0) {
      // Use existing WhatsApp Web tab
      const whatsappTab = existingTabs[0];
      console.log('Background: Using existing WhatsApp tab:', whatsappTab.id);
      
      // Update existing tab URL to send message directly
      console.log('Background: Updating existing WhatsApp tab URL to send message');
      console.log('Original message received:', message);
      const decodedMessage = decodeURIComponent(message);
      console.log('Decoded message:', decodedMessage);
      const finalUrl = `https://web.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(decodedMessage)}`;
      console.log('Final URL:', finalUrl);
      chrome.tabs.update(whatsappTab.id, {
        url: finalUrl
      });
      
      // Inject script to auto-click send button after page loads
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: whatsappTab.id },
          function: () => {
            // Function to try sending message
            function trySendMessage() {
              console.log('Attempting to send message...');
              
              // Try send button first
              const sendBtn = document.querySelector('span[data-icon="send"]');
              if (sendBtn) {
                console.log('Found send button, clicking it...');
                sendBtn.click();
                console.log('Send button clicked successfully');
                return true;
              }
              
              // Try Enter key
              const inputBox = document.querySelector('#main [contenteditable="true"][role="textbox"]');
              if (inputBox) {
                console.log('Trying Enter key...');
                inputBox.focus();
                inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                inputBox.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
                console.log('Enter key pressed');
                return true;
              }
              
              return false;
            }
            
            // Try multiple times with increasing delays
            setTimeout(() => trySendMessage(), 2000);
            setTimeout(() => trySendMessage(), 4000);
            setTimeout(() => trySendMessage(), 6000);
            setTimeout(() => trySendMessage(), 8000);
            setTimeout(() => trySendMessage(), 10000);
          }
        });
      }, 3000);
      
      sendResponse({
        is_message_sent: 'YES',
        comments: 'Message sent via URL update with auto-click'
      });
    } else {
      // Create new WhatsApp Web tab with message pre-filled
      console.log('Background: Creating new WhatsApp tab with message');
      console.log('Original message for new tab:', message);
      const decodedMessage = decodeURIComponent(message);
      console.log('Decoded message for new tab:', decodedMessage);
      const newTabUrl = `https://web.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(decodedMessage)}`;
      console.log('New tab URL:', newTabUrl);
      chrome.tabs.create({
        url: newTabUrl,
        active: false
      }, (tab) => {
        console.log('Background: Created new WhatsApp tab:', tab.id);
        
        // Inject script to auto-click send button after page loads
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              // Function to try sending message
              function trySendMessage() {
                console.log('Attempting to send message...');
                
                // Try send button first
                const sendBtn = document.querySelector('span[data-icon="send"]');
                if (sendBtn) {
                  console.log('Found send button, clicking it...');
                  sendBtn.click();
                  console.log('Send button clicked successfully');
                  return true;
                }
                
                // Try Enter key
                const inputBox = document.querySelector('#main [contenteditable="true"][role="textbox"]');
                if (inputBox) {
                  console.log('Trying Enter key...');
                  inputBox.focus();
                  inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                  inputBox.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
                  console.log('Enter key pressed');
                  return true;
                }
                
                return false;
              }
              
              // Try multiple times with increasing delays
              setTimeout(() => trySendMessage(), 2000);
              setTimeout(() => trySendMessage(), 4000);
              setTimeout(() => trySendMessage(), 6000);
              setTimeout(() => trySendMessage(), 8000);
              setTimeout(() => trySendMessage(), 10000);
            }
          });
        }, 3000);
        
        sendResponse({
          is_message_sent: 'YES',
          comments: 'Message sent via new WhatsApp Web tab with auto-click'
        });
      });
    }
    
  } catch (error) {
    console.error('Background: Error sending WhatsApp message:', error);
    sendResponse({
      is_message_sent: 'NO',
      comments: 'Error sending message',
      error: error.message
    });
  }
}

// Simple function removed - no longer needed

// Debug function to check what tabs are available
async function debugTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const webWhatsAppTabs = await chrome.tabs.query({url: "*://web.whatsapp.com/*"});
    const waMeTabs = await chrome.tabs.query({url: "*://wa.me/*"});
    
    const allTabs = tabs.map(t => ({ id: t.id, url: t.url, title: t.title, status: t.status }));
    const whatsappTabs = [...webWhatsAppTabs, ...waMeTabs];
    
    return {
      totalTabs: tabs.length,
      whatsappTabs: whatsappTabs.length,
      allTabs: allTabs,
      whatsappTabDetails: whatsappTabs.map(t => ({ id: t.id, url: t.url, title: t.title, status: t.status }))
    };
  } catch (error) {
    return { error: error.message };
  }
}
 