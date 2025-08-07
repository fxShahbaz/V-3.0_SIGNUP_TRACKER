console.log('Overlay script loaded');

function getWhatsAppMessage(leadData, callback) {
  // Get custom message from storage
  chrome.storage.sync.get(['customMessage'], function(data) {
    // Default message template if no custom message is set - using Unicode escape sequences
    const defaultMessage = `Hi {name}, thanks for downloading the *GaragePro* OBD App! This is *Shahbaz.* Let me know if you want more information about the {leadType} OBD scanner or if you want to buy one.

\u092f\u0926\u093f \u0906\u092a {leadType} OBD \u0938\u094d\u0915\u0948\u0928\u0930 \u0915\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902, \u0924\u094b \u0915\u0943\u092a\u092f\u093e \u0939\u092e\u0947\u0902 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902: 8287389214 \u092f\u093e Yes \u0932\u093f\u0916\u0915\u0930 Reply \u0915\u0930\u0947\u0902\u0964`;

    let messageTemplate = data.customMessage || defaultMessage;
    
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
    
    callback(encodeURIComponent(finalMessage));
  });
}

function createOverlay(leadData) {
  console.log('Creating overlay with data:', leadData);
  
  // Remove any existing overlay
  const existingOverlay = document.querySelector('.lead-notification');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.className = 'lead-notification';

  // Create header
  const header = document.createElement('div');
  header.className = 'lead-notification-header';

  const title = document.createElement('div');
  title.className = 'lead-notification-title';
  title.textContent = 'New Lead Detected';

  const closeButton = document.createElement('button');
  closeButton.className = 'lead-notification-close';
  closeButton.innerHTML = '×';
  closeButton.onclick = () => overlay.remove();

  header.appendChild(title);
  header.appendChild(closeButton);

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

  // Create buttons
  const buttons = document.createElement('div');
  buttons.className = 'lead-notification-buttons';

  const whatsappButton = document.createElement('a');
  whatsappButton.className = 'lead-notification-button whatsapp-button';
  whatsappButton.textContent = 'WhatsApp';
  whatsappButton.target = '_blank';
  whatsappButton.onclick = (e) => {
    e.preventDefault();
    getWhatsAppMessage(leadData, (message) => {
      whatsappButton.href = `https://wa.me/+91${leadData.phone}?text=${message}`;
      window.open(whatsappButton.href, '_blank');
    });
  };

  const searchButton = document.createElement('a');
  searchButton.className = 'lead-notification-button search-lead-button';
  searchButton.textContent = 'Search Lead';
  searchButton.href = `https://carpm.in/leads?utf8=%E2%9C%93&q%5Bname_cont%5D=&q%5Bemail_cont%5D=&q%5Bphone_cont%5D=${leadData.phone}&q%5Brepresentative_cont%5D=&q%5Bstatus_eq%5D=&q%5Bsource_cont%5D=&q%5Breminder_date_gteq%5D=&q%5Breminder_date_lteq%5D=&q%5Bcreated_at_gteq%5D=&q%5Bcreated_at_lteq%5D=&commit=Search`;
  searchButton.target = '_blank';

  buttons.appendChild(whatsappButton);
  buttons.appendChild(searchButton);

  // Assemble overlay
  overlay.appendChild(header);
  overlay.appendChild(content);
  overlay.appendChild(buttons);

  // Add to document
  document.body.appendChild(overlay);
  console.log('Overlay added to document');

  // Auto-remove after 60 seconds
  setTimeout(() => {
    overlay.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => overlay.remove(), 300);
  }, 60000);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in overlay script:', message);
  if (message.type === 'NEW_LEAD') {
    console.log('Creating overlay for new lead');
    createOverlay(message.data);
  }
}); 