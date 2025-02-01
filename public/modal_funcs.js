function openPopup(popupId) {
    document.getElementById(popupId).classList.remove('hidden');
 }
 
 function closePopup(popupId) {
    document.getElementById(popupId).classList.add('hidden');
 }
 
 function openPopup(modalId, businessDetails = '') {
   const modal = document.getElementById(modalId);
   if (!modal) {
       console.error(`Modal with ID '${modalId}' not found.`);
       return;
   }
   modal.classList.add('show');
   
   // Display business details in the modal (if provided)
   const detailsElement = document.getElementById('businessDetails');
   if (detailsElement) {
       detailsElement.textContent = businessDetails || 'Business details not available.';
   }
}

function closePopup(modalId) {
   const modal = document.getElementById(modalId);
   if (!modal) {
       console.error(`Modal with ID '${modalId}' not found.`);
       return;
   }
   modal.classList.remove('show');
}

function openAddReviewPopup(businessId) {
   const addReviewPopup = document.getElementById('addReviewPopup');
   addReviewPopup.dataset.businessId = businessId; // Assign the business ID
   addReviewPopup.classList.add('show');
}

let contact = document.getElementById("contact");
let contactbox = document.getElementById("contactbox");


contact.addEventListener("mouseenter",()=>{
   contactbox.style.display="block";
})
contact.addEventListener("mouseleave",()=>{
   contactbox.style.display="none";
})
