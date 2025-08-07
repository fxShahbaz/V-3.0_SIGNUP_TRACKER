console.log('Content script loaded');

// Function to check if we should show overlay
function checkAndShowOverlay() {
  chrome.storage.local.get(['activeOverlay'], function(result) {
    if (result.activeOverlay) {
      const now = Date.now();
      if (now - result.activeOverlay.timestamp < 60000) { // If less than 60 seconds have passed
        createOverlay(result.activeOverlay.data);
      } else {
        // Clear expired overlay data
        chrome.storage.local.remove(['activeOverlay']);
      }
    }
  });
}

// Listen for messages from other tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_OVERLAY') {
    console.log('Received overlay message from another tab');
    createOverlay(message.data);
  }
});

chrome.storage.sync.get(['enabled', 'websites', 'autoSendEnabled'], function (data) {
  console.log('Storage data:', data);
  
  if (data.enabled && data.websites) {
    console.log('Extension is enabled and websites are configured');
    
    for (const website of data.websites) {
      console.log('Checking website:', website, 'Current URL:', location.href);
      
      if (location.href.includes(website)) {
        console.log('Website match found:', website);
        
        // Check for existing overlay first
        checkAndShowOverlay();
        
        // Load previous phone numbers
        chrome.storage.local.get(['previousPhoneNumbers'], function (result) {
          console.log('Previous phone numbers:', result.previousPhoneNumbers);
          
          const previousPhoneNumbers = result.previousPhoneNumbers || [];
          const currentLeads = extractLeads();
          console.log('Current leads found:', currentLeads);

          if (currentLeads.length > 0) {
            const newLeads = currentLeads.filter(lead => !previousPhoneNumbers.includes(lead.phone));
            console.log('New leads detected:', newLeads);

            if (newLeads.length > 0) {
              console.log("Creating overlay for new lead:", newLeads[0]);
              
              // Check if sound is enabled before playing
              chrome.storage.sync.get(['soundEnabled'], function(data) {
                const soundEnabled = data.soundEnabled !== undefined ? data.soundEnabled : true; // Default to enabled
                if (soundEnabled) {
                  console.log("Sound is enabled, playing notification...");
                  playNotificationSound();
                } else {
                  console.log("Sound is disabled, skipping notification...");
                }
              });
              
              // Automatically send WhatsApp message for the new lead (if enabled)
              const autoSendEnabled = data.autoSendEnabled !== undefined ? data.autoSendEnabled : true; // Default to enabled
              if (autoSendEnabled) {
                console.log("Auto-sending WhatsApp message for new lead...");
                getWhatsAppMessage(newLeads[0], (message) => {
                  sendWhatsAppMessage(newLeads[0].phone, message);
                });
              } else {
                console.log("Auto-send is disabled, skipping automatic WhatsApp message");
              }
              
              // Store overlay data in storage
              chrome.storage.local.set({
                'activeOverlay': {
                  data: newLeads[0],
                  timestamp: Date.now()
                }
              }, function() {
                // Create overlay in current tab
                createOverlay(newLeads[0]);
                
                // Broadcast to all other tabs
                chrome.tabs.query({}, function(tabs) {
                  tabs.forEach(tab => {
                    if (tab.id !== sender.tab?.id) { // Don't send to the current tab
                      chrome.tabs.sendMessage(tab.id, {
                        type: 'SHOW_OVERLAY',
                        data: newLeads[0]
                      }).catch(err => console.log('Error sending to tab:', err));
                    }
                  });
                });
              });
            } else {
              console.log('No new leads found');
            }

            // Store current phone numbers for the next comparison
            chrome.storage.local.set({
              'previousPhoneNumbers': currentLeads.map(lead => lead.phone)
            }, function() {
              console.log('Updated previous phone numbers in storage');
            });
          } else {
            console.log('No leads found in current page');
          }

          // Set interval to reload after checking
          console.log('Setting up refresh interval');
          setInterval(() => {
            console.log('Refreshing page...');
            location.reload();
          }, 5000); // Refresh every 5 seconds
        });

        break; // Refresh only once for the first matching website
      }
    }
  } else {
    console.log('Extension is disabled or no websites configured');
  }
});

function extractLeads() {
  console.log('Extracting leads from page');
  const leads = [];
  const table = document.querySelector('table');
  
  if (table) {
    console.log('Table found on page');
    // Find the indices of required columns
    const headerRow = table.querySelector('thead tr');
    let nameColumnIndex = -1;
    let phoneColumnIndex = -1;
    let leadTypeColumnIndex = -1;
    
    if (headerRow) {
      console.log('Header row found');
      const headers = headerRow.querySelectorAll('th');
      headers.forEach((header, index) => {
        const headerText = header.textContent.trim();
        console.log('Header text:', headerText);
        if (headerText === 'Name') {
          nameColumnIndex = index;
          console.log('Name column found at index:', index);
        } else if (headerText === 'Phone') {
          phoneColumnIndex = index;
          console.log('Phone column found at index:', index);
        } else if (headerText === 'Lead Type') {
          leadTypeColumnIndex = index;
          console.log('Lead Type column found at index:', index);
        }
      });
    } else {
      console.log('No header row found');
    }

    if (phoneColumnIndex !== -1) {
      const dataRows = table.querySelectorAll('tbody tr');
      console.log('Found data rows:', dataRows.length);
      
      dataRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length > Math.max(nameColumnIndex, phoneColumnIndex, leadTypeColumnIndex)) {
          const phoneNumber = cells[phoneColumnIndex].textContent.trim();
          if (phoneNumber) {
            const lead = {
              phone: phoneNumber,
              name: nameColumnIndex !== -1 ? cells[nameColumnIndex].textContent.trim() : 'N/A',
              leadType: leadTypeColumnIndex !== -1 ? cells[leadTypeColumnIndex].textContent.trim() : 'N/A'
            };
            leads.push(lead);
            console.log('Added lead:', lead);
          }
        }
      });
    } else {
      console.log('Phone column not found');
    }
  } else {
    console.log('No table found on page');
  }
  
  console.log('Total leads extracted:', leads.length);
  return leads;
}

function getWhatsAppMessage(leadData, callback) {
  // Get custom message from storage
  chrome.storage.sync.get(['customMessage'], function(data) {
    console.log('Storage data for custom message:', data);
    
    // Default message template if no custom message is set - using Unicode escape sequences
    const defaultMessage = `Hi {name}, thanks for downloading the *GaragePro* OBD App! This is *Shahbaz.* Let me know if you want more information about the {leadType} OBD scanner or if you want to buy one.

\u092f\u0926\u093f \u0906\u092a {leadType} OBD \u0938\u094d\u0915\u0948\u0928\u0930 \u0915\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902, \u0924\u094b \u0915\u0943\u092a\u092f\u093e \u0939\u092e\u0947\u0902 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902: 8287389214 \u092f\u093e Yes \u0932\u093f\u0916\u0915\u0930 Reply \u0915\u0930\u0947\u0902\u0964`;

    let messageTemplate = data.customMessage || defaultMessage;
    console.log('Using message template:', messageTemplate);
    console.log('Custom message from storage:', data.customMessage);
    
    // Replace placeholders with actual data
    const name = leadData.name || 'there';
    const phone = leadData.phone || '';
    let leadType = leadData.leadType || 'OBD';
    
    // Map lead types for better messaging
    switch(leadData.leadType?.toLowerCase()) {
      case 'car':
        leadType = 'Car';
        break;
      case 'bike':
        leadType = 'BS6 Bike';
        break;
      case 'hcv':
        leadType = 'Truck/Bus (24 volts)';
        break;
      default:
        leadType = leadData.leadType || 'OBD';
    }
    
    // Replace placeholders
    const finalMessage = messageTemplate
      .replace(/{name}/g, name)
      .replace(/{phone}/g, phone)
      .replace(/{leadType}/g, leadType);
    
    console.log('Final message before encoding:', finalMessage);
    console.log('Final message after encoding:', encodeURIComponent(finalMessage));
    
    callback(encodeURIComponent(finalMessage));
  });
}

async function sendWhatsAppMessage(phone, message) {
  console.log('Attempting to send WhatsApp message to:', phone);
  
  // Send message to background script to handle tab management
  chrome.runtime.sendMessage({
    type: 'SEND_WHATSAPP_MESSAGE',
    phone: phone,
    message: message
  }, (response) => {
    if (response) {
      console.log('WhatsApp send response:', response);
    } else {
      console.log('No response from background script, trying direct approach');
      // Fallback: directly open blank WhatsApp Web
      const whatsappUrl = `https://web.whatsapp.com/`;
      window.open(whatsappUrl, '_blank');
    }
  });
}

// Legacy functions removed - WhatsApp handling now done via background script

// Debug function to test message retrieval
function testMessageRetrieval() {
  chrome.storage.sync.get(['customMessage'], function(data) {
    console.log('=== MESSAGE RETRIEVAL DEBUG ===');
    console.log('Storage data:', data);
    console.log('Custom message from storage:', data.customMessage);
    console.log('Type of custom message:', typeof data.customMessage);
    console.log('Length of custom message:', data.customMessage ? data.customMessage.length : 'null');
    console.log('===============================');
  });
}

// Add debug function to window for testing
window.testMessageRetrieval = testMessageRetrieval;

function createOverlay(leadData) {
  console.log('Creating overlay with data:', leadData);
  
  // Remove any existing overlay
  const existingOverlay = document.querySelector('.lead-notification');
  if (existingOverlay) {
    console.log('Removing existing overlay');
    existingOverlay.remove();
  }

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.className = 'lead-notification';
  console.log('Created overlay element');

  // Create header
  const header = document.createElement('div');
  header.className = 'lead-notification-header';

  const title = document.createElement('div');
  title.className = 'lead-notification-title';
  title.textContent = 'New Lead Detected';

  const closeButton = document.createElement('button');
  closeButton.className = 'lead-notification-close';
  closeButton.innerHTML = '×';
  closeButton.onclick = () => {
    console.log('Close button clicked');
    chrome.storage.local.remove(['activeOverlay']); // Remove from storage when manually closed
    overlay.remove();
    
    // Broadcast close to all tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'CLOSE_OVERLAY'
        }).catch(err => console.log('Error sending close message:', err));
      });
    });
  };

  header.appendChild(title);
  header.appendChild(closeButton);
  console.log('Created header');

  // Create content
  const content = document.createElement('div');
  content.className = 'lead-notification-content';

  const nameField = document.createElement('div');
  nameField.className = 'lead-notification-field';
  nameField.innerHTML = `<span class="lead-notification-label">Name:</span> ${leadData.name}`;

  const phoneField = document.createElement('div');
  phoneField.className = 'lead-notification-field';
  phoneField.innerHTML = `<span class="lead-notification-label">Phone:</span> ${leadData.phone}`;

  const leadTypeField = document.createElement('div');
  leadTypeField.className = 'lead-notification-field';
  leadTypeField.innerHTML = `<span class="lead-notification-label">Lead Type:</span> ${leadData.leadType}`;

  content.appendChild(nameField);
  content.appendChild(phoneField);
  content.appendChild(leadTypeField);
  console.log('Created content');

  // Create buttons
  const buttons = document.createElement('div');
  buttons.className = 'lead-notification-buttons';

  const whatsappButton = document.createElement('a');
  whatsappButton.className = 'lead-notification-button whatsapp-button';
  whatsappButton.textContent = 'WhatsApp';
  whatsappButton.href = '#';
  whatsappButton.target = '_blank';
  whatsappButton.onclick = (e) => {
    e.preventDefault();
    getWhatsAppMessage(leadData, (message) => {
      const whatsappUrl = `https://web.whatsapp.com/send?phone=91${leadData.phone}&text=${message}`;
      window.open(whatsappUrl, '_blank');
    });
    return false;
  };

  const searchButton = document.createElement('a');
  searchButton.className = 'lead-notification-button search-lead-button';
  searchButton.textContent = 'Search Lead';
  searchButton.href = `https://carpm.in/leads?utf8=%E2%9C%93&q%5Bname_cont%5D=&q%5Bemail_cont%5D=&q%5Bphone_cont%5D=${leadData.phone}&q%5Brepresentative_cont%5D=&q%5Bstatus_eq%5D=&q%5Bsource_cont%5D=&q%5Breminder_date_gteq%5D=&q%5Breminder_date_lteq%5D=&q%5Bcreated_at_gteq%5D=&q%5Bcreated_at_lteq%5D=&commit=Search`;
  searchButton.target = '_blank';

  buttons.appendChild(whatsappButton);
  buttons.appendChild(searchButton);
  console.log('Created buttons');

  // Assemble overlay
  overlay.appendChild(header);
  overlay.appendChild(content);
  overlay.appendChild(buttons);

  // Add to document
  document.body.appendChild(overlay);
  console.log('Overlay added to document');

  // Auto-remove after 60 seconds
  setTimeout(() => {
    console.log('Starting overlay fade out');
    overlay.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      console.log('Removing overlay');
      chrome.storage.local.remove(['activeOverlay']); // Remove from storage when auto-closed
      overlay.remove();
      
      // Broadcast close to all tabs
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'CLOSE_OVERLAY'
          }).catch(err => console.log('Error sending close message:', err));
        });
      });
    }, 300);
  }, 60000);
}

function playNotificationSound() {
  console.log('Attempting to play notification sound...');
  
  // Always try fallback sound first (more reliable)
  playFallbackSound();
  
  // Then try audio file
  try {
    const soundUrl = chrome.runtime.getURL('notification.mp3');
    console.log('Sound URL:', soundUrl);
    
    const audio = new Audio(soundUrl);
    audio.volume = 0.5; // Set volume
    console.log('Audio element created');
    
    // Add event listeners for debugging
    audio.addEventListener('canplaythrough', () => {
      console.log('Audio can play through');
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
    });
    
    audio.addEventListener('playing', () => {
      console.log('Audio started playing');
    });
    
    // Try to play the sound with user interaction workaround
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('Sound playback started successfully');
      }).catch(error => {
        console.error('Error playing sound (expected due to autoplay policy):', error);
      });
    }
  } catch (error) {
    console.error('Error in playNotificationSound:', error);
  }
}

function playFallbackSound() {
  console.log('Playing fallback sound...');
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    console.log('Fallback sound started');
    
    setTimeout(() => {
      oscillator.stop();
      context.close();
      console.log('Fallback sound stopped');
    }, 500);
  } catch (error) {
    console.error('Error playing fallback sound:', error);
  }
}
