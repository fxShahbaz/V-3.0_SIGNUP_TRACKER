document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('toggle');
  const autoSendToggle = document.getElementById('autoSendToggle');
  const soundToggle = document.getElementById('soundToggle');
  const websiteList = document.getElementById('websiteList');
  const websiteInput = document.getElementById('websiteInput');
  const addButton = document.getElementById('addButton');
  const customMessage = document.getElementById('customMessage');
  const saveMessageButton = document.getElementById('saveMessageButton');
  const resetMessageButton = document.getElementById('resetMessageButton');
  const clearStorageButton = document.getElementById('clearStorageButton');

  // Default message template with Unicode escape sequences
  const defaultMessage = `Hi {name}, thanks for downloading the *GaragePro* OBD App! This is *Shahbaz.* Let me know if you want more information about the {leadType} OBD scanner or if you want to buy one.

\u092f\u0926\u093f \u0906\u092a {leadType} OBD \u0938\u094d\u0915\u0948\u0928\u0930 \u0915\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902, \u0924\u094b \u0915\u0943\u092a\u092f\u093e \u0939\u092e\u0947\u0902 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902: 8287389214 \u092f\u093e Yes \u0932\u093f\u0916\u0915\u0930 Reply \u0915\u0930\u0947\u0902\u0964`;

  // Load saved websites, toggle states, and custom message from storage
  chrome.storage.sync.get(['websites', 'enabled', 'autoSendEnabled', 'soundEnabled', 'customMessage'], function (data) {
    if (data.websites) {
      for (const website of data.websites) {
        addWebsiteToList(website);
      }
    }
    if (data.enabled !== undefined) {
      toggle.checked = data.enabled;
    }
    if (data.autoSendEnabled !== undefined) {
      autoSendToggle.checked = data.autoSendEnabled;
    } else {
      // Default to enabled for auto-send
      autoSendToggle.checked = true;
    }
    if (data.soundEnabled !== undefined) {
      soundToggle.checked = data.soundEnabled;
    } else {
      // Default to enabled for sound
      soundToggle.checked = true;
    }
    // Load custom message or use default
    console.log('Loading custom message from storage:', data.customMessage);
    customMessage.value = data.customMessage || defaultMessage;
    console.log('Set custom message value to:', customMessage.value);
  });

  // Toggle auto refresh on/off
  toggle.addEventListener('change', function () {
    chrome.storage.sync.set({ 'enabled': toggle.checked });
  });

  // Toggle auto-send WhatsApp on/off
  autoSendToggle.addEventListener('change', function () {
    chrome.storage.sync.set({ 'autoSendEnabled': autoSendToggle.checked });
  });

  // Toggle sound alert on/off
  soundToggle.addEventListener('change', function () {
    chrome.storage.sync.set({ 'soundEnabled': soundToggle.checked });
  });

  // Add a website to the list
  addButton.addEventListener('click', function () {
    const websiteUrl = websiteInput.value;
    if (websiteUrl) {
      addWebsiteToList(websiteUrl);
      websiteInput.value = '';

      // Save updated list to storage
      chrome.storage.sync.get('websites', function (data) {
        const websites = data.websites || [];
        websites.push(websiteUrl);
        chrome.storage.sync.set({ 'websites': websites });
      });
    }
  });

  // Save custom message
  saveMessageButton.addEventListener('click', function () {
    const messageText = customMessage.value.trim();
    if (messageText) {
      console.log('Saving custom message:', messageText);
      chrome.storage.sync.set({ 'customMessage': messageText }, function() {
        console.log('Custom message saved to storage');
        // Visual feedback
        saveMessageButton.textContent = 'Saved!';
        saveMessageButton.style.backgroundColor = '#4CAF50';
        setTimeout(() => {
          saveMessageButton.textContent = 'Save Message';
          saveMessageButton.style.backgroundColor = '#4CAF50';
        }, 1500);
      });
    }
  });

  // Reset to default message
  resetMessageButton.addEventListener('click', function () {
    // Use Unicode escape sequences to prevent encoding corruption
    const cleanDefaultMessage = `Hi {name}, thanks for downloading the *GaragePro* OBD App! This is *Shahbaz.* Let me know if you want more information about the {leadType} OBD scanner or if you want to buy one.

\u092f\u0926\u093f \u0906\u092a {leadType} OBD \u0938\u094d\u0915\u0948\u0928\u0930 \u0915\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902, \u0924\u094b \u0915\u0943\u092a\u092f\u093e \u0939\u092e\u0947\u0902 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902: 8287389214 \u092f\u093e Yes \u0932\u093f\u0916\u0915\u0930 Reply \u0915\u0930\u0947\u0902\u0964`;
    
    customMessage.value = cleanDefaultMessage;
    chrome.storage.sync.set({ 'customMessage': cleanDefaultMessage }, function() {
      // Visual feedback
      resetMessageButton.textContent = 'Reset!';
      resetMessageButton.style.backgroundColor = '#4CAF50';
      setTimeout(() => {
        resetMessageButton.textContent = 'Reset to Default';
        resetMessageButton.style.backgroundColor = '#ff9800';
      }, 1500);
    });
  });

  // Clear storage and reset message
  clearStorageButton.addEventListener('click', function () {
    if (confirm('This will clear all extension data and reset to default settings. Continue?')) {
      // Clear all storage
      chrome.storage.sync.clear(function() {
        chrome.storage.local.clear(function() {
          // Set fresh default message with Unicode escape sequences to prevent encoding issues
          const freshDefaultMessage = 'Hi {name}, thanks for downloading the *GaragePro* OBD App! This is *Shahbaz.* Let me know if you want more information about the {leadType} OBD scanner or if you want to buy one.\n\n\u092f\u0926\u093f \u0906\u092a {leadType} OBD \u0938\u094d\u0915\u0948\u0928\u0930 \u0915\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902, \u0924\u094b \u0915\u0943\u092a\u092f\u093e \u0939\u092e\u0947\u0902 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902: 8287389214 \u092f\u093e Yes \u0932\u093f\u0916\u0915\u0930 Reply \u0915\u0930\u0947\u0902\u0964';
          
          customMessage.value = freshDefaultMessage;
          toggle.checked = false;
          autoSendToggle.checked = true;
          soundToggle.checked = true;
          
          // Save the fresh message
          chrome.storage.sync.set({ 
            'customMessage': freshDefaultMessage,
            'enabled': false,
            'autoSendEnabled': true,
            'soundEnabled': true,
            'websites': []
          }, function() {
            console.log('Storage cleared and reset to default message');
            // Clear website list
            websiteList.innerHTML = '';
            
            // Visual feedback
            clearStorageButton.textContent = 'Cleared!';
            clearStorageButton.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
              clearStorageButton.textContent = 'Clear Storage & Reset';
              clearStorageButton.style.backgroundColor = '#f44336';
            }, 2000);
          });
        });
      });
    }
  });

  // Function to add website to the list
  function addWebsiteToList(websiteUrl) {
    const li = document.createElement('li');
    li.className = 'website-container';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', function () {
      removeWebsiteFromList(websiteUrl, li);
    });

    li.appendChild(deleteButton);

    const websiteSpan = document.createElement('span');
    websiteSpan.className = 'website';
    websiteSpan.textContent = websiteUrl;

    li.appendChild(websiteSpan);

    websiteList.appendChild(li);
  }

  // Function to remove website from the list
  function removeWebsiteFromList(websiteUrl, listItem) {
    websiteList.removeChild(listItem);

    // Remove website from storage
    chrome.storage.sync.get('websites', function (data) {
      const websites = data.websites || [];
      const updatedWebsites = websites.filter(url => url !== websiteUrl);
      chrome.storage.sync.set({ 'websites': updatedWebsites });
    });
  }

  // Debug function to check storage state
  function debugStorage() {
    chrome.storage.sync.get(['customMessage', 'enabled', 'autoSendEnabled', 'soundEnabled', 'websites'], function(data) {
      console.log('=== STORAGE DEBUG ===');
      console.log('Custom message:', data.customMessage);
      console.log('Enabled:', data.enabled);
      console.log('Auto send enabled:', data.autoSendEnabled);
      console.log('Sound enabled:', data.soundEnabled);
      console.log('Websites:', data.websites);
      console.log('Current textarea value:', customMessage.value);
      console.log('=====================');
    });
  }

  // Add debug function to window for testing
  window.debugStorage = debugStorage;
});
