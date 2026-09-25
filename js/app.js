// Firebase v12 Modular SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    onSnapshot, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/* ==========================================================================
   FIREBASE CONFIGURATION & INITIALIZATION
   ========================================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDskFzicM7xVyODTqE6217m8oLYMQS-HZY",
    authDomain: "copper-crown.firebaseapp.com",
    projectId: "copper-crown",
    storageBucket: "copper-crown.firebasestorage.app",
    messagingSenderId: "744460098277",
    appId: "1:744460098277:web:3de61663acf8123388120c",
    measurementId: "G-9FSS129KYN"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Target WhatsApp Business Phone Number
const WHATSAPP_PHONE = "923294942684";

// Master Admin Credentials
const ADMIN_CREDENTIALS = {
    email: "info.coppercrown.pk@gmail.com",
    password: "Prisonerno804"
};

/* ==========================================================================
   APP INITIALIZATION & AUTH STATE LISTENER
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Global Auth State Observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            updateUserHeaderUI(user.displayName || user.email.split('@')[0]);
        } else {
            resetUserHeaderUI();
        }
    });

    // Admin Session Guard
    if (window.location.pathname.includes("admin.html")) {
        checkAdminSession();
    }
});

/* ==========================================================================
   USER AUTHENTICATION (SIGN UP & SIGN IN VIA FIREBASE v12)
   ========================================================================== */

window.switchAccountTab = function(tab) {
    const loginView = document.getElementById('loginView');
    const signupView = document.getElementById('signupView');
    
    if (tab === 'signup') {
        loginView.style.display = 'none';
        signupView.style.display = 'block';
    } else {
        signupView.style.display = 'none';
        loginView.style.display = 'block';
    }
};

// Register a New User
window.handleAccountSignup = async function(event) {
    event.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Set Display Name in Firebase Auth Profile
        await updateProfile(user, { displayName: name });

        // Save User Profile to Firestore Cloud DB
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            createdAt: serverTimestamp()
        });

        showToast(`Account created successfully! Welcome, ${name}.`);
        closeModal('accountModal');
        event.target.reset();
    } catch (error) {
        showToast(`Sign Up Error: ${error.message}`);
    }
};

// Login Existing User
window.handleAccountLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        showToast(`Signed in as ${user.displayName || user.email}`);
        closeModal('accountModal');
        event.target.reset();
    } catch (error) {
        showToast("Invalid credentials. Please check your email/password or Sign Up first.");
    }
};

// User Sign Out
window.handleAccountLogout = async function() {
    try {
        await signOut(auth);
        showToast("Logged out successfully.");
    } catch (error) {
        showToast(`Logout Error: ${error.message}`);
    }
};

function updateUserHeaderUI(displayName) {
    const btnText = document.getElementById('accountBtnText');
    const utilBtn = document.getElementById('accountUtilBtn');
    if (btnText) {
        btnText.innerText = `Hi, ${displayName}`;
        if (utilBtn) utilBtn.style.borderColor = '#25D366';
    }
}

function resetUserHeaderUI() {
    const btnText = document.getElementById('accountBtnText');
    const utilBtn = document.getElementById('accountUtilBtn');
    if (btnText) {
        btnText.innerText = "My Account *";
        if (utilBtn) utilBtn.style.borderColor = "var(--border-dark)";
    }
}

window.handleProtectedAction = function(targetModalId) {
    if (!auth.currentUser) {
        showToast('Account Required: Please Sign In or Create an Account first.');
        openModal('accountModal');
    } else {
        openModal(targetModalId);
    }
};

/* ==========================================================================
   BOOKINGS & WHATSAPP INTEGRATION
   ========================================================================== */

window.handleBookingSubmit = async function(event) {
    event.preventDefault();
    const name = document.getElementById('bookingName').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    const service = document.getElementById('bookingService').value;
    const date = document.getElementById('bookingDate').value;
    const time = document.getElementById('bookingTime').value;

    const requestID = 'CC-' + Math.floor(1000 + Math.random() * 9000);

    const bookingData = {
        requestID: requestID,
        name: name,
        phone: phone,
        service: service,
        date: date,
        time: time,
        userUid: auth.currentUser ? auth.currentUser.uid : "guest",
        createdAt: serverTimestamp()
    };

    try {
        // Save to Firestore 'bookings' collection
        await addDoc(collection(db, "bookings"), bookingData);

        closeModal('bookingModal');
        showToast(`Booking Created! Request ID: ${requestID}`);

        // Construct WhatsApp Notification Message
        const waMessage = `*NEW SERVICE REQUEST - COPPER %26 CROWN*%0A%0A` +
                          `*Request ID:* ${requestID}%0A` +
                          `*Customer Name:* ${name}%0A` +
                          `*Phone:* ${phone}%0A` +
                          `*Service:* ${service}%0A` +
                          `*Date:* ${date}%0A` +
                          `*Time:* ${time}`;

        const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${waMessage}`;
        window.open(waUrl, '_blank');

        event.target.reset();
    } catch (error) {
        showToast(`Database Error: ${error.message}`);
    }
};

/* ==========================================================================
   STRICT ADMIN PORTAL LOGIC
   ========================================================================== */

window.handleAdminLogin = function(event) {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const password = document.getElementById('adminPassword').value;

    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        checkAdminSession();
        showToast('Admin Access Granted!');
    } else {
        alert('Access Denied: Invalid Master Admin Email or Password.');
    }
};

function checkAdminSession() {
    const isAuth = sessionStorage.getItem('adminAuthenticated');
    const authOverlay = document.getElementById('adminAuthOverlay');
    const dashContent = document.getElementById('adminDashboardContent');

    if (isAuth === 'true') {
        if (authOverlay) authOverlay.style.display = 'none';
        if (dashContent) dashContent.style.display = 'block';
        loadAdminDataRealtime();
    } else {
        if (authOverlay) authOverlay.style.display = 'flex';
        if (dashContent) dashContent.style.display = 'none';
    }
}

window.logoutAdmin = function() {
    sessionStorage.removeItem('adminAuthenticated');
    window.location.reload();
};

function loadAdminDataRealtime() {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        const tableBody = document.getElementById('adminLogsTable');
        const countEl = document.getElementById('totalRequestsCount');

        if (countEl) countEl.innerText = snapshot.size;

        if (tableBody) {
            if (snapshot.empty) {
                tableBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-muted);">No service requests logged in cloud database yet.</td></tr>`;
                return;
            }

            tableBody.innerHTML = snapshot.docs.map(doc => {
                const b = doc.data();
                
                // Clean the customer's phone number for the WhatsApp link (remove spaces, dashes, or leading zeros)
                let customerPhone = (b.phone || '').replace(/[^0-9]/g, '');
                
                // Convert local Pakistani format (e.g., 0329...) to international format (92329...)
                if (customerPhone.startsWith('0')) {
                    customerPhone = '92' + customerPhone.slice(1);
                }

                // Pre-filled message for the customer
                const initialMsg = encodeURIComponent(`Hello ${b.name || 'Customer'}, regarding your Copper & Crown request (${b.requestID || ''}):`);

                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 12px; font-weight: 600; color: var(--gold-primary);">${b.requestID || 'N/A'}</td>
                        <td style="padding: 12px;">${b.name || 'N/A'}</td>
                        <td style="padding: 12px;">${b.phone || 'N/A'}</td>
                        <td style="padding: 12px;">${b.service || 'N/A'}</td>
                        <td style="padding: 12px;">${b.date || ''} | ${b.time || ''}</td>
                        <td style="padding: 12px;">
                            <a href="https://wa.me/${customerPhone}?text=${initialMsg}" target="_blank" class="btn-gold-solid" style="padding:4px 8px; font-size:0.75rem;"><i class="fa-brands fa-whatsapp"></i> Chat with Customer</a>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }, (error) => {
        console.error("Firestore Read Error: ", error);
    });
}
/* ==========================================================================
   UTILITY & MODAL CONTROLS
   ========================================================================== */

window.openModal = function(id) { document.getElementById(id).style.display = 'flex'; };
window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };

function showToast(msg) {
    const toast = document.getElementById('toast');
    const text = document.getElementById('toast-text');
    if (toast && text) {
        text.innerText = msg;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3500);
    }
}

window.toggleTheme = function() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
};

window.trackRequest = async function() {
    const id = document.getElementById('trackingIdInput').value.trim();
    const resultBox = document.getElementById('trackingResult');
    
    try {
        const q = query(collection(db, "bookings"), where("requestID", "==", id));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const found = querySnapshot.docs[0].data();
            document.getElementById('trackStatus').innerText = "Confirmed & Scheduled";
            document.getElementById('trackService').innerText = found.service;
            resultBox.style.display = 'block';
        } else {
            showToast("Request ID not found. Please check and try again.");
        }
    } catch (error) {
        showToast("Tracking Error: " + error.message);
    }
};

window.handleFormSubmit = function(e, msg) {
    e.preventDefault();
    showToast(msg);
    e.target.reset();
};
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}
