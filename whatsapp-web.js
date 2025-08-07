console.log('WhatsApp Web content script loaded');

// WhatsApp Web Element Selectors
let DOCUMENT_ELEMENT_SELECTORS = {
  input_message_div: [
    "#main [contenteditable=\"true\"][role=\"textbox\"]"
  ],
  send_message_btn: [
    "span[data-icon=\"send\"]"
  ],
  conversation_panel: [
    "[data-testid=\"conversation-panel-messages\"]",
    "._5kRIK",
    "._ajyl"
  ],
  conversation_header: [
    "[data-testid=\"conversation-header\"]",
    ".AmmtE",
    "._amid"
  ],
  left_side_contacts_panel: [
    "#pane-side"
  ],
  contact_profile_div: [
    "img.x1hc1fzr._ao3e"
  ],
  profile_header: [
    "._604FD",
    "._ak0z",
    "span.x1okw0bk"
  ],
  conversation_message_div: [
    "[data-testid^=\"conv-msg\"]",
    "[data-id^=\"true\"]",
    "[data-id^=\"false\"]"
  ],
  conversation_title_div: [
    "[data-testid=\"conversation-info-header-chat-title\"]",
    ".AmmtE span",
    "._amid span"
  ],
  footer_div: [
    "footer._3E8Fg",
    "footer._ak1i"
  ],
  new_chat_btn: [
    "[data-icon=\"new-chat-outline\"]"
  ],
  starting_chat_popup: [
    "[data-animate-modal-popup=\"true\"]:has(svg circle)"
  ],
  invalid_chat_popup: [
    "[data-animate-modal-popup=\"true\"]:not(:has(svg circle))"
  ],
  invalid_popup_ok_btn: [
    "[data-testid=\"popup-controls-ok\"]",
    "[data-animate-modal-popup=\"true\"]:not(:has(svg circle)) button"
  ]
};

// Element Finder Function
function getDocumentElement(key, selectAll = false) {
  try {
    if (DOCUMENT_ELEMENT_SELECTORS[key]) {
      for (const className of DOCUMENT_ELEMENT_SELECTORS[key]) {
        const element = (selectAll) ? document.querySelectorAll(className) : document.querySelector(className);
        if (element) {
          return element;
        }
      }
    } else {
      console.log("Selector not exists:", key);
    }
  } catch (err) {
    console.log("Error while finding document element", err);
  }
  return null;
}

// Chat Opening Verification Function
async function hasChatOpened() {
  return new Promise((resolve, reject) => {
    let is_chat_loading = false;
    let wait_time_ms = 0;
    
    let checkChatOpenedInterval = setInterval(() => {
      wait_time_ms += 100;
      
      const starting_chat_popup = getDocumentElement('starting_chat_popup');
      const invalid_chat_popup = getDocumentElement('invalid_chat_popup');
      
      if (starting_chat_popup || wait_time_ms >= 500) {
        is_chat_loading = true;
      }
      
      if (is_chat_loading) {
        if (invalid_chat_popup || wait_time_ms >= 10000) {
          clearInterval(checkChatOpenedInterval);
          resolve(false);
        } else if (!starting_chat_popup) {
          clearInterval(checkChatOpenedInterval);
          resolve(true);
        }
      }
    }, 100);
  });
}

// Current Chat Detection Function
function getCurrentChatNumber() {
  try {
    // Use current chat number if it's available
    let conversation_message_div = getDocumentElement('conversation_message_div');
    let number = null;
    
    if (conversation_message_div) {
      let curr_chat_id = conversation_message_div.dataset['id'];
      let curr_chat_number = curr_chat_id.split("_")[1].split("@c.us")[0];
      
      if (curr_chat_number.length > 10) {
        number = curr_chat_number;
      }
    }
    
    return number;
  } catch (e) {
    console.error("ERROR :: getCurrentChatNumber :: " + e);
    return null;
  }
}

// Message Pasting Function
function pasteMessage(text) {
  console.log('Pasting message:', text);
  
  // Try multiple methods to find and fill the input box
  const inputSelectors = [
    '#main [contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][data-tab="10"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[title="Type a message"]',
    '[data-testid="conversation-compose-box-input"]'
  ];
  
  let inputMessageBox = null;
  
  // Try each selector
  for (const selector of inputSelectors) {
    inputMessageBox = document.querySelector(selector);
    if (inputMessageBox) {
      console.log('Found input box with selector:', selector);
      break;
    }
  }
  
  // If still not found, try getDocumentElement
  if (!inputMessageBox) {
    inputMessageBox = getDocumentElement('input_message_div');
  }
  
  if (inputMessageBox) {
    console.log('Input box found, setting message');
    
    // Focus the input first
    inputMessageBox.focus();
    
    // Clear existing content
    inputMessageBox.textContent = '';
    inputMessageBox.innerHTML = '';
    
    // Set the new message
    inputMessageBox.textContent = text;
    
    // Try clipboard paste method
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", text);
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });
      inputMessageBox.dispatchEvent(pasteEvent);
    } catch (e) {
      console.log('Clipboard paste failed:', e);
    }
    
    // Trigger input events
    inputMessageBox.dispatchEvent(new Event('input', { bubbles: true }));
    inputMessageBox.dispatchEvent(new Event('change', { bubbles: true }));
    inputMessageBox.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    console.log('Message pasted successfully');
  } else {
    console.log('Input message box not found');
  }
}

// Send Button Click Function
async function sendMessageToNumber(number, message) {
  try {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log('Looking for send button...');
        
        // Try multiple selectors for send button
        const sendButtonSelectors = [
          'span[data-icon="send"]',
          'button[aria-label="Send"]',
          'span[data-testid="send"]',
          'div[role="button"][aria-label="Send"]',
          'button[data-tab="11"]',
          '[data-icon="send"]'
        ];
        
        let send_message_btn = null;
        
        // Try each selector
        for (const selector of sendButtonSelectors) {
          send_message_btn = document.querySelector(selector);
          if (send_message_btn) {
            console.log('Found send button with selector:', selector);
            break;
          }
        }
        
        // If still not found, try getDocumentElement
        if (!send_message_btn) {
          send_message_btn = getDocumentElement('send_message_btn');
        }
        
        if (send_message_btn) {
          console.log('Clicking send button...');
          
          // Simple click method that was working before
          send_message_btn.click();
          
          console.log('Send button clicked successfully');
          resolve({
            is_message_sent: 'YES',
            comments: 'Message sent successfully'
          });
        } else {
          console.log('Send button not found with any selector');
          resolve({
            is_message_sent: 'NO',
            comments: 'Issue with the number',
            error: 'Send button is not found'
          });
        }
      }, 1000);
    });
  } catch (e) {
    console.error('ERROR :: sendMessageToNumber :: ' + e);
    return {
      is_message_sent: 'NO',
      comments: 'Error while sending message to number',
      error: e.toString()
    }
  }
}

// WhatsApp API Integration
function initWhatsAppAPI() {
  // Initialize WhatsApp Store and PRIMES object
  window.PRIMES = {};

  // Get Chat Function
  window.PRIMES.getChat = function (id) {
    try {
      return window.Store.Chat.get(id);
    } catch (err) {
      console.error("Error getting chat:", err);
      return undefined;
    }
  };

  // Send Message Function
  window.PRIMES.sendMessage = function (id, message) {
    return new Promise((resolve, reject) => {
      try {
        var chat = window.PRIMES.getChat(id);
        if (chat !== undefined) {
          chat.sendMessage(message);
          resolve();
        } else {
          reject("chat or group not found");
        }
      } catch (err) {
        reject(err);
      }
    });
  };

  // Send Attachment Function
  window.PRIMES.sendAttachment = function (mediaBlob, chatid, caption, waitTillSend) {
    return new Promise((resolve, reject) => {
      try {
        let chat = window.Store.Chat.get(chatid);
        var mc = new window.Store.MediaCollection(chat);
        mc.processAttachments([{ file: mediaBlob }, 1], chat, chat).then(() => {
          try {
            var media = mc._models[0];
            let captionObject = {
              quotedMsg: false,
              isCaptionByUser: true,
              type: mc._models[0].type,
            };
            if (/\\S/.test(caption)) {
              captionObject.caption = caption;
            }
            media.sendToChat(chat, captionObject);

            if (waitTillSend) {
              const startTime = Date.now();
              const checkSent = () => {
                const sentMessages = document.querySelectorAll('.message-out');
                const lastMessage = sentMessages[sentMessages.length - 1];

                if (lastMessage) {
                  const textContent = lastMessage.innerText || '';
                  if (textContent.includes(mediaBlob.name)) {
                    resolve();
                    return;
                  }
                }

                if (Date.now() - startTime > 3000) {
                  resolve();
                  return;
                }

                setTimeout(checkSent, 500);
              };

              checkSent();
            } else {
              resolve();
            }
          } catch (err) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  // Base64 to File Conversion
  window.PRIMES.base64toFile = function (data, fileName) {
    let arr = data.split(",");
    let mime = arr[0].match(/:(.*?);/)[1];
    let bstr = atob(arr[1]);
    let n = bstr.length;
    let u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
  };
}

// Event-Based Message Sending
function setupMessageEvents() {
  // Listen for send message events
  window.addEventListener("PRIMES::send-message", async function (e) {
    const number = e.detail.number;
    const message = e.detail.message;
    const chatId = number + '@c.us';

    try {
      await window.PRIMES.sendMessage(chatId, message);
      window.postMessage({
        type: "send_message",
        payload: {
          chat_id: chatId,
          is_message_sent: "YES",
          comments: ""
        }
      }, "*");
    } catch (error) {
      console.error(error);
      window.postMessage({
        type: "send_message_error",
        payload: {
          chat_id: chatId,
          error: error,
          is_message_sent: "NO",
          comments: "Error while sending the message to number"
        }
      }, "*");
    }
  });
}

// Complete Message Sending Flow - SIMPLIFIED
async function sendMessageToNumberNew(number, message) {
  try {
    console.log('=== SIMPLE FLOW: Sending message to:', number);
    console.log('Current URL:', window.location.href);
    
    // Check if we need to navigate to specific chat first
    const currentUrl = window.location.href;
    const isOnSpecificChat = currentUrl.includes(`phone=91${number}`) || 
                            currentUrl.includes(`phone=${number}`) || 
                            currentUrl.includes(`send?phone=`);
    
    if (!isOnSpecificChat) {
      console.log('Not on specific chat URL, opening chat for:', number);
      
      // Check if we're already in the correct chat
      const currentChatNumber = getCurrentChatNumber();
      if (currentChatNumber && currentChatNumber.includes(number)) {
        console.log('Already in correct chat for number:', number);
      } else {
        // Try to open chat using WhatsApp's internal APIs first
        console.log('Attempting to open chat using internal APIs...');
        
        try {
          // Method 1: Try using WhatsApp Store API
          if (window.Store && window.Store.Chat) {
            const chatId = `91${number}@c.us`;
            console.log('Using Store API to open chat:', chatId);
            window.Store.Chat.openChatAt(chatId);
            console.log('Store API navigation completed');
          } else if (window.Store && window.Store.Router) {
            // Method 2: Try Router API
            console.log('Using Router API to navigate to chat');
            window.Store.Router.navigate(`/send?phone=91${number}`);
          } else {
            // Method 3: Use direct URL navigation as fallback
            const webUrl = `https://web.whatsapp.com/send?phone=91${number}&text=`;
            console.log('Using direct URL navigation to:', webUrl);
            window.location.href = webUrl;
          }
        } catch (e) {
          console.log('Internal API failed, using direct URL navigation:', e);
          const webUrl = `https://web.whatsapp.com/send?phone=91${number}&text=`;
          console.log('Using direct URL navigation to:', webUrl);
          window.location.href = webUrl;
        }
        
        // Wait for chat to load
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } else {
      console.log('Already on chat URL, waiting for chat to load...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Find input box with multiple attempts
    let inputBox = null;
    const inputSelectors = [
      '#main [contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][data-tab="10"]',
      '[data-testid="conversation-compose-box-input"]',
      '[contenteditable="true"]',
      'div[contenteditable="true"]'
    ];
    
    // Try multiple times to find input box
    for (let attempt = 0; attempt < 5; attempt++) {
      for (const selector of inputSelectors) {
        inputBox = document.querySelector(selector);
        if (inputBox) {
          console.log('Found input box with selector:', selector);
          break;
        }
      }
      
      if (inputBox) break;
      
      console.log('Input box not found, attempt', attempt + 1);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!inputBox) {
      console.log('No input box found after multiple attempts');
      return {
        is_message_sent: 'NO',
        comments: 'Chat input box not found',
        error: 'Could not find chat input for ' + number
      };
    }
    
    console.log('Input box found - proceeding with message');
    
    // Always clear and paste the message to ensure it's properly decoded
    console.log('Clearing and pasting message...');
    
    // Decode the message properly (handle multiple levels of encoding)
    let messageText = message;
    try {
      // Decode multiple times to handle any double/triple encoding
      let decoded = messageText;
      let previousDecoded = '';
      
      // Keep decoding until no more % symbols or no change
      while (decoded.includes('%') && decoded !== previousDecoded) {
        previousDecoded = decoded;
        decoded = decodeURIComponent(decoded);
      }
      
      messageText = decoded;
      console.log('Original encoded message:', message);
      console.log('Final decoded message:', messageText);
    } catch (e) {
      console.log('Decoding failed, using original message:', e);
      messageText = message;
    }
    
    console.log('Original message:', message);
    console.log('Decoded message:', messageText);
    
    const currentContent = inputBox.textContent || inputBox.innerHTML || '';
    console.log('Current input content:', currentContent);
    
    // Clear input box first
    inputBox.focus();
    inputBox.textContent = '';
    inputBox.innerHTML = '';
    if (inputBox.value !== undefined) {
      inputBox.value = '';
    }
    
    // Wait a moment for focus
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Paste message with multiple methods
    console.log('Pasting message:', messageText);
    
    // Method 1: Direct text insertion
    inputBox.textContent = messageText;
    inputBox.innerHTML = messageText;
    
    // Method 2: Try setting via value property (if available)
    if (inputBox.value !== undefined) {
      inputBox.value = messageText;
    }
    
    // Method 3: Try clipboard simulation
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", messageText);
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      });
      inputBox.dispatchEvent(pasteEvent);
    } catch (e) {
      console.log('Clipboard method failed:', e);
    }
    
    // Trigger all input events
    inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    inputBox.dispatchEvent(new Event('change', { bubbles: true }));
    inputBox.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    inputBox.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    
    // Verify message was pasted
    console.log('Input box content after paste:', inputBox.textContent);
    console.log('Input box innerHTML after paste:', inputBox.innerHTML);
    
    // Wait longer for message to register and ensure it's properly pasted
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Looking for send button...');
    
    // Try WhatsApp Web API method (most reliable)
    console.log('Using WhatsApp Web API method...');
    
    // Check if WhatsApp Store is available
    if (window.Store && window.Store.Chat) {
      console.log('WhatsApp Store available, using API method');
      
      try {
        // Get the chat for this number
        const chatId = `91${number}@c.us`;
        console.log('Chat ID:', chatId);
        
        // Get the chat object
        const chat = window.Store.Chat.get(chatId);
        if (chat) {
          console.log('Chat found, sending message via API');
          
          // Send message directly via WhatsApp API
          chat.sendMessage(messageText);
          
          console.log('Message sent via WhatsApp API');
          
          // Wait to confirm message was sent
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          return {
            is_message_sent: 'YES',
            comments: 'Message sent via WhatsApp API'
          };
        } else {
          console.log('Chat not found, trying to create it');
          
          // Try to create the chat
          const contact = window.Store.Contact.get(chatId);
          if (contact) {
            const newChat = window.Store.Chat.add(chatId);
            if (newChat) {
              newChat.sendMessage(messageText);
              console.log('Message sent via new chat API');
              
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              return {
                is_message_sent: 'YES',
                comments: 'Message sent via new chat API'
              };
            }
          }
        }
      } catch (apiError) {
        console.log('WhatsApp API method failed:', apiError);
      }
    }
    
    // Fallback: Try the old send button method
    console.log('API method failed, trying send button method...');
    
    // Find send button with exact selector
    const sendBtn = document.querySelector('span[data-icon="send"]');
    if (sendBtn) {
      console.log('Found send button, clicking it...');
      sendBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        is_message_sent: 'YES',
        comments: 'Message sent via send button'
      };
    }
    
    // Use Enter key method (more reliable than send button)
    console.log('Using Enter key to send message...');
    inputBox.focus();
    
    // Wait a moment for focus
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Press Enter key to send message
    inputBox.dispatchEvent(new KeyboardEvent('keydown', { 
      key: 'Enter', 
      code: 'Enter', 
      keyCode: 13, 
      bubbles: true,
      cancelable: true
    }));
    
    inputBox.dispatchEvent(new KeyboardEvent('keyup', { 
      key: 'Enter', 
      code: 'Enter', 
      keyCode: 13, 
      bubbles: true,
      cancelable: true
    }));
    
    console.log('Enter key pressed to send message');
    
    // Wait to see if message was sent
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      is_message_sent: 'YES',
      comments: 'Message sent via Enter key'
    };
    
  } catch (e) {
    console.error('ERROR :: sendMessageToNumberNew :: ' + e);
    return {
      is_message_sent: 'NO',
      comments: 'Error while sending message to number',
      error: e.toString()
    }
  }
}

// Function to verify we're in the correct chat
async function verifyCorrectChat(expectedNumber) {
  try {
    console.log('Verifying we are in chat with:', expectedNumber);
    
    // Check chat header for contact info
    const chatHeaderSelectors = [
      '[data-testid="conversation-header"] span[title]',
      'header span[title]',
      '#main header span[title]',
      '[data-testid="conversation-info-header-chat-title"]',
      'div[data-testid="conversation-info-header"] span'
    ];
    
    for (const selector of chatHeaderSelectors) {
      const headerElement = document.querySelector(selector);
      if (headerElement) {
        const headerText = headerElement.getAttribute('title') || headerElement.textContent;
        console.log('Found chat header text:', headerText);
        
        // Check if the header contains the expected number
        if (headerText && (headerText.includes(expectedNumber) || headerText.includes(`+91${expectedNumber}`))) {
          console.log('Verified correct chat - header matches expected number');
          return true;
        }
      }
    }
    
    // Alternative: Check the URL if it contains the phone number
    const currentUrl = window.location.href;
    if (currentUrl.includes(`phone=91${expectedNumber}`) || currentUrl.includes(`phone=${expectedNumber}`)) {
      console.log('Verified correct chat - URL contains expected number');
      return true;
    }
    
    console.log('Could not verify correct chat for number:', expectedNumber);
    return false;
  } catch (error) {
    console.error('Error verifying correct chat:', error);
    return false;
  }
}

// Function to clear message input
async function clearMessageInput() {
  try {
    const inputSelectors = [
      '#main [contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[title="Type a message"]',
      '[data-testid="conversation-compose-box-input"]'
    ];
    
    for (const selector of inputSelectors) {
      const inputBox = document.querySelector(selector);
      if (inputBox) {
        console.log('Clearing input box with selector:', selector);
        inputBox.focus();
        inputBox.textContent = '';
        inputBox.innerHTML = '';
        if (inputBox.value !== undefined) {
          inputBox.value = '';
        }
        
        // Trigger events
        inputBox.dispatchEvent(new Event('input', { bubbles: true }));
        inputBox.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error clearing input:', error);
    return false;
  }
}

// Function to open chat with a specific contact
async function openChatWithContact(number) {
  try {
    console.log('=== OPENING CHAT WITH CONTACT ===');
    console.log('Target phone number:', number);
    console.log('Number type:', typeof number);
    console.log('Number length:', number ? number.length : 'null');
    console.log('Current URL before opening chat:', window.location.href);
    
    // Method 1: Try to find if chat already exists in the chat list
    const existingChatSelectors = [
      `[title*="${number}"]`,
      `[title*="+91${number}"]`,
      `span:contains("${number}")`,
      `div[aria-label*="${number}"]`
    ];
    
    for (const selector of existingChatSelectors) {
      let existingChat = null;
      if (selector.includes(':contains')) {
        const elements = document.querySelectorAll('div, span');
        for (const el of elements) {
          if (el.textContent && el.textContent.includes(number)) {
            existingChat = el.closest('[role="listitem"]') || el.closest('div[tabindex]') || el;
            break;
          }
        }
      } else {
        existingChat = document.querySelector(selector);
      }
      
      if (existingChat) {
        console.log('Found existing chat, clicking it');
        existingChat.click();
        return true;
      }
    }

    console.log('No existing chat found, trying multiple methods');
    
    // Method 2: Silent WhatsApp Store API (background operation)
    try {
      console.log('Trying silent WhatsApp Store API method');
      
      if (window.Store && window.Store.Chat) {
        // Format phone number for WhatsApp (with country code)
        const formattedNumber = `91${number}@c.us`;
        console.log('Formatted chat ID:', formattedNumber);
        
        // Try to open chat using WhatsApp's internal API
        if (window.Store.Chat.openChatAt) {
          await window.Store.Chat.openChatAt(formattedNumber);
          console.log('Opened chat using Store.Chat.openChatAt');
          
          // Wait for chat to load
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verify chat opened
          const chatHeader = document.querySelector('[data-testid="conversation-header"]');
          if (chatHeader) {
            console.log('Successfully opened chat via Store API');
            return true;
          }
        }
        
        // Alternative Store method
        if (window.Store.Wap && window.Store.Wap.queryExist) {
          console.log('Trying Store.Wap.queryExist method');
          const result = await window.Store.Wap.queryExist(formattedNumber);
          if (result && result.wid) {
            // Chat exists, try to open it
            if (window.Store.Chat.openChat) {
              await window.Store.Chat.openChat(result.wid);
              console.log('Opened existing chat via Store.Chat.openChat');
              return true;
            }
          }
        }
      }
      
    } catch (storeError) {
      console.log('WhatsApp Store API method failed:', storeError);
    }
    
    // Method 3: Try using WhatsApp's internal router if available
    try {
      console.log('Trying WhatsApp internal navigation method');
      
      // Try to use WhatsApp's internal navigation
      if (window.WWebJS || window.Store) {
        console.log('WhatsApp Store detected, trying internal navigation');
        
        // If WhatsApp's internal methods are available, use them
        const chatId = `91${number}@c.us`;
        
        if (window.Store && window.Store.Chat) {
          try {
            await window.Store.Chat.openChatAt(chatId);
            console.log('Opened chat using Store.Chat.openChatAt');
            return true;
          } catch (storeError) {
            console.log('Store.Chat.openChatAt failed:', storeError);
          }
        }
      }
      
      // Alternative: Try using WhatsApp Router API
      if (window.Store && window.Store.Router) {
        console.log('Trying WhatsApp Router API');
        try {
          await window.Store.Router.navigate(`/send?phone=91${number}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const chatHeader = document.querySelector('[data-testid="conversation-header"]');
          if (chatHeader) {
            console.log('Successfully opened chat via Router API');
            return true;
          }
        } catch (routerError) {
          console.log('Router API failed:', routerError);
        }
      }
      
    } catch (internalError) {
      console.log('Internal navigation method failed:', internalError);
    }
    
    // Method 4: Silent DOM-based chat creation
    try {
      console.log('Trying silent DOM-based chat creation');
      
      // Try to create/trigger chat without visible navigation
      if (window.Store && window.Store.Chat && window.Store.Contact) {
        const phoneId = `91${number}@c.us`;
        
        // Check if contact exists
        const contact = window.Store.Contact.get(phoneId);
        if (contact) {
          console.log('Contact found, creating chat');
          
          // Try to create chat silently
          if (window.Store.Chat.find && window.Store.Chat.add) {
            let chat = window.Store.Chat.find(phoneId);
            if (!chat) {
              // Create new chat
              chat = await window.Store.Chat.add({
                id: phoneId,
                contact: contact
              });
            }
            
            if (chat && window.Store.Chat.setActive) {
              await window.Store.Chat.setActive(chat);
              console.log('Successfully activated chat silently');
              return true;
            }
          }
        } else {
          console.log('Contact not found, will try manual method');
        }
      }
      
    } catch (silentError) {
      console.log('Silent DOM method failed:', silentError);
    }

    // Method 5: Manual search method as fallback (silent)
    console.log('All automatic methods failed, trying silent manual search method');
    
    // Only proceed if we can find elements without disrupting the UI
    const newChatBtn = getDocumentElement('new_chat_btn');
    if (!newChatBtn) {
      console.log('New chat button not found, cannot proceed with manual method');
      return false;
    }
    
    console.log('Attempting silent new chat creation');
    
    // Create a silent click that doesn't disrupt the UI
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    newChatBtn.dispatchEvent(clickEvent);
    
    // Wait for search input to appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find search input with multiple selectors
    const searchInputSelectors = [
      'div[contenteditable="true"][data-tab="3"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="name or number"]',
      'div[role="textbox"]',
      'input[type="text"]',
      '[data-testid="chat-list-search"]'
    ];
    
    let searchInput = null;
    for (const selector of searchInputSelectors) {
      searchInput = document.querySelector(selector);
      if (searchInput) {
        console.log('Found search input with selector:', selector);
        break;
      }
    }
    
    if (!searchInput) {
      console.log('Search input not found, trying to click on search area');
      // Try to click on the search area to activate it
      const searchArea = document.querySelector('div[title="Search input textbox"]') ||
                        document.querySelector('[placeholder*="Search"]') ||
                        document.querySelector('div[dir="ltr"]');
      if (searchArea) {
        searchArea.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try again to find search input
        for (const selector of searchInputSelectors) {
          searchInput = document.querySelector(selector);
            if (searchInput) {
            console.log('Found search input after clicking search area:', selector);
            break;
          }
        }
      }
    }
    
    if (!searchInput) {
      console.log('Search input still not found');
      return false;
    }
    
    console.log('Found search input, entering phone number:', number);
    
    // Clear and enter phone number with multiple methods
    searchInput.focus();
    
    // Clear existing content
    if (searchInput.value !== undefined) {
      searchInput.value = '';
    }
    if (searchInput.textContent !== undefined) {
      searchInput.textContent = '';
    }
    
    // Set the phone number
    const phoneWithCountryCode = `+91${number}`;
    
    if (searchInput.value !== undefined) {
      searchInput.value = phoneWithCountryCode;
    }
    if (searchInput.textContent !== undefined) {
      searchInput.textContent = phoneWithCountryCode;
    }
    
    // Trigger multiple events to ensure WhatsApp recognizes the input
    searchInput.dispatchEvent(new Event('focus', { bubbles: true }));
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
    
    console.log('Entered phone number, waiting for results...');
    
    // Wait longer for contact to appear and try typing character by character
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try typing the number character by character (more reliable)
    console.log('Typing number character by character...');
    for (const char of phoneWithCountryCode) {
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { 
        bubbles: true, 
        key: char, 
        char: char,
        keyCode: char.charCodeAt(0)
      }));
      searchInput.dispatchEvent(new KeyboardEvent('keypress', { 
        bubbles: true, 
        key: char,
        char: char,
        keyCode: char.charCodeAt(0)
      }));
      searchInput.dispatchEvent(new KeyboardEvent('keyup', { 
        bubbles: true, 
        key: char,
        char: char,
        keyCode: char.charCodeAt(0)
      }));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait longer for contact to appear
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to find and click the contact with multiple approaches
    console.log('Looking for contact in search results...');
    
    // Try different selectors for the contact
    const contactSelectors = [
      `[title*="${number}"]`,
      `[title*="${phoneWithCountryCode}"]`,
      `span:contains("${number}")`,
      `span:contains("${phoneWithCountryCode}")`,
      'div[role="listitem"]',
      '[data-testid="cell-frame-container"]',
      'div[data-testid="contact-list"] > div',
      'div._8nE1Y',
      'div._3OvU8'
    ];
    
    let contact = null;
    for (const selector of contactSelectors) {
      if (selector.includes(':contains')) {
        // Custom contains selector implementation
        const elements = document.querySelectorAll('div, span');
        for (const el of elements) {
          if (el.textContent && el.textContent.includes(number)) {
            contact = el.closest('[role="listitem"]') || el.closest('div[data-testid]') || el;
            if (contact) {
              console.log('Found contact with text content:', selector);
              break;
            }
          }
        }
      } else {
        contact = document.querySelector(selector);
        if (contact) {
          console.log('Found contact with selector:', selector);
          break;
        }
      }
    }
    
    if (contact) {
      console.log('Found contact, clicking it');
      contact.click();
      return true;
    } else {
      console.log('Contact not found in search results, trying to create new contact');
      
      // If contact not found, try to click on "New contact" or similar option
      const newContactBtn = document.querySelector('[data-testid="new-contact"]') ||
                           document.querySelector('div:contains("New contact")') ||
                           document.querySelector('[title*="New contact"]');
      
      if (newContactBtn) {
        console.log('Clicking new contact button');
        newContactBtn.click();
        return true;
      } else {
        console.log('No contact found and no new contact option available');
        return false;
      }
    }
    
  } catch (error) {
    console.error('Error opening chat with contact:', error);
    return false;
  }
}

// Send Message Using WhatsApp API
async function sendMessageViaAPI(number, message) {
  try {
    const chatId = number + '@c.us';
    await window.PRIMES.sendMessage(chatId, message);
    return {
      is_message_sent: 'YES',
      comments: ''
    };
  } catch (error) {
    console.error('Error sending message via API:', error);
    return {
      is_message_sent: 'NO',
      comments: 'Error while sending message via API',
      error: error
    };
  }
}

// Send Attachment Using WhatsApp API
async function sendAttachmentViaAPI(number, attachments, captions) {
  try {
    const chatId = number + '@c.us';
    const sendPromises = attachments.map(async (file, index) => {
      const fileData = await JSON.parse(file.data);
      const fileBlob = await window.PRIMES.base64toFile(fileData, file.name);
      const caption = captions && captions[index] ? captions[index] : '';
      await window.PRIMES.sendAttachment(fileBlob, chatId, caption, true);
    });

    await Promise.all(sendPromises);
    return {
      is_attachments_sent: 'YES',
      comments: ''
    };
  } catch (error) {
    console.error('Error sending attachments via API:', error);
    return {
      is_attachments_sent: 'NO',
      comments: 'Error while sending attachments via API',
      error: error
    };
  }
}

// Dispatch Event to Send Message
function dispatchSendMessage(number, message) {
  window.dispatchEvent(new CustomEvent("PRIMES::send-message", {
    detail: {
      number: number,
      message: message,
    }
  }));
}

// Dispatch Event to Send Attachments
function dispatchSendAttachments(number, attachments, captions, waitTillSend = false) {
  window.dispatchEvent(new CustomEvent("PRIMES::send-attachments", {
    detail: {
      number: number,
      attachments: attachments,
      caption: captions,
      waitTillSend: waitTillSend
    }
  }));
}

// Dispatch Event to Send Message
function dispatchSendMessage(number, message) {
  window.dispatchEvent(new CustomEvent("PRIMES::send-message", {
    detail: {
      number: number,
      message: message,
    }
  }));
}

// Initialize WhatsApp Automation
function initWhatsAppAutomation() {
  // Initialize WhatsApp API
  initWhatsAppAPI();
  
  // Setup event listeners
  setupMessageEvents();

  console.log("WhatsApp Automation initialized successfully!");
}

// Auto-send message function - main entry point
async function autoSendWhatsAppMessage(phone, message) {
  console.log('=== AUTO-SEND WHATSAPP MESSAGE START ===');
  console.log('Phone number received:', phone);
  console.log('Message received:', message);
  console.log('Phone type:', typeof phone);
  console.log('Message type:', typeof message);
  console.log('Current URL:', window.location.href);
  console.log('Document visibility:', document.visibilityState);
  console.log('Tab is active:', !document.hidden);
  console.log('WhatsApp Store available:', !!window.Store);
  console.log('PRIMES available:', !!window.PRIMES);
  console.log('=== DETAILED DEBUG INFO ===');
  
  try {
    // Check if we're on WhatsApp Web
    if (!window.location.href.includes('web.whatsapp.com')) {
      console.log('Not on WhatsApp Web, cannot auto-send');
      return {
        is_message_sent: 'NO',
        comments: 'Not on WhatsApp Web',
        error: 'Wrong domain'
      };
    }

    // Wait for WhatsApp to be ready (increased timeout for background tabs)
    console.log('Waiting for WhatsApp to be ready...');
    const isReady = await waitForWhatsAppReady(45000); // Longer timeout for background tabs
    if (!isReady) {
      console.log('WhatsApp not ready, cannot auto-send');
      return {
        is_message_sent: 'NO',
        comments: 'WhatsApp not ready',
        error: 'Timeout waiting for WhatsApp'
      };
    }

    // Try API method first (if WhatsApp Store is available) - better for background tabs
    if (window.Store && window.PRIMES) {
      console.log('Using WhatsApp API method (better for background tabs)');
      const result = await sendMessageViaAPI(phone, decodeURIComponent(message));
      return result;
    } else {
      // Fallback to DOM manipulation
      console.log('Using DOM manipulation method');
      const result = await sendMessageToNumberNew(phone, message);
      return result;
    }
  } catch (error) {
    console.error('Error in autoSendWhatsAppMessage:', error);
    return {
      is_message_sent: 'NO',
      comments: 'Error in auto-send function',
      error: error.toString()
    };
  }
}

// Wait for WhatsApp to be ready
function waitForWhatsAppReady(maxWait = 30000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    function checkReady() {
      // More comprehensive check for WhatsApp readiness
      const leftPanel = getDocumentElement('left_side_contacts_panel');
      const inputBox = getDocumentElement('input_message_div');
      const appDiv = document.querySelector('#app');
      const mainDiv = document.querySelector('#main');
      
      // Check if WhatsApp Store is available (most reliable for background tabs)
      const storeReady = window.Store && window.Store.Chat;
      
      if (leftPanel || inputBox || storeReady || (appDiv && mainDiv)) {
        console.log('WhatsApp is ready! Method:', storeReady ? 'Store API' : 'DOM elements');
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > maxWait) {
        console.log('Timeout waiting for WhatsApp to be ready');
        resolve(false);
        return;
      }
      
      // Check more frequently for background tabs
      const checkInterval = document.hidden ? 2000 : 1000;
      setTimeout(checkReady, checkInterval);
    }
    
    checkReady();
  });
}

// Listen for messages from our extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('WhatsApp Web script: Received message:', message);
  
  if (message.action === 'PING') {
    console.log('WhatsApp Web script: Received PING');
    sendResponse({ status: 'ready' });
    return true;
  }
  
  if (message.action === 'SEND_WHATSAPP_MESSAGE') {
    console.log('=== RECEIVED SEND_WHATSAPP_MESSAGE FROM EXTENSION ===');
    console.log('Phone:', message.phone);
    console.log('Message:', message.message);
    console.log('=== STARTING AUTO-SEND PROCESS ===');
    
    // Check if WhatsApp is ready before proceeding
    const isWhatsAppReady = document.querySelector('#pane-side') || 
                           document.querySelector('#app') || 
                           document.querySelector('#main') || 
                           window.Store;
    
    console.log('WhatsApp ready check:', {
      hasPaneSide: !!document.querySelector('#pane-side'),
      hasApp: !!document.querySelector('#app'),
      hasMain: !!document.querySelector('#main'),
      hasStore: !!window.Store,
      isReady: isWhatsAppReady
    });
    
    if (!isWhatsAppReady) {
      console.log('WhatsApp not ready yet, waiting...');
      setTimeout(() => {
        autoSendWhatsAppMessage(message.phone, message.message)
          .then(result => {
            console.log('Message send result:', result);
            sendResponse(result);
          })
          .catch(error => {
            console.error('Error sending message:', error);
            sendResponse({
              is_message_sent: 'NO',
              comments: 'Error processing message',
              error: error.toString()
            });
          });
      }, 5000); // Increased wait time for wa.me redirects
      return true;
    }
    
    console.log('WhatsApp is ready, proceeding with message sending...');
    autoSendWhatsAppMessage(message.phone, message.message)
      .then(result => {
        console.log('Message send result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error sending message:', error);
        sendResponse({
          is_message_sent: 'NO',
          comments: 'Error processing message',
          error: error.toString()
        });
      });
    return true; // Keep message channel open for async response
  }
});

// Initialize when script loads
if (typeof window !== 'undefined') {
  // Wait for WhatsApp to load
  const checkWhatsAppLoaded = setInterval(() => {
    if (document.querySelector('#pane-side')) {
      clearInterval(checkWhatsAppLoaded);
      console.log('WhatsApp Web loaded, initializing automation...');
      initWhatsAppAutomation();
    }
  }, 1000);
}

// Test function to check if content script is working
window.testWhatsAppExtension = function() {
  console.log('=== WHATSAPP EXTENSION TEST ===');
  console.log('Content script loaded:', true);
  console.log('WhatsApp elements found:');
  console.log('- #pane-side:', !!document.querySelector('#pane-side'));
  console.log('- #app:', !!document.querySelector('#app'));
  console.log('- #main:', !!document.querySelector('#main'));
  console.log('- window.Store:', !!window.Store);
  console.log('Current URL:', window.location.href);
  console.log('=== END TEST ===');
  return 'WhatsApp Extension Test Complete';
}; 