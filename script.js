/**
 * FAKBOKNTUN - Warm Neutral Architecture (No Loader Version)
 */

(function initSecurity() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) || (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            return false;
        }
    });
})();

const SUPABASE_URL = 'https://uffczgkjrdqqactsjuiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZmN6Z2tqcmRxcWFjdHNqdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjQ2NDEsImV4cCI6MjEwMDI0MDY0MX0.o8yrwmKb_6f_9ZTQp9QRuv5MSV_DGMnpUBHM4A7RbI8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_EMAIL = 'aceaa372@gmail.com';
let currentUser = null;

const textarea = document.getElementById('message-input');
if(textarea) {
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if(!toast) return;
    document.getElementById('toast-msg').textContent = msg;
    
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(toast, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.5)" });
        setTimeout(() => { gsap.to(toast, { y: 20, opacity: 0, duration: 0.4, ease: "power2.in" }); }, 3500);
    } else {
        toast.style.opacity = 1;
        setTimeout(() => { toast.style.opacity = 0; }, 3500);
    }
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
    
    const view = document.getElementById(viewId);
    if(view) {
        view.classList.remove('hidden');
        view.classList.add('active');
        
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(view.querySelectorAll('.gs-reveal'), 
                { y: 30, opacity: 0 }, 
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out", clearProps: "all" }
            );
        }
    }
}

async function initAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        handleSession(session);
    } catch (err) {
        console.error("Auth Error:", err);
        handleSession(null); 
    } finally {
        const nav = document.querySelector('.nav-reveal');
        if (nav && typeof gsap !== 'undefined') {
            gsap.fromTo(nav, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.2 });
        } else if (nav) {
            nav.style.opacity = 1;
        }
    }
}

supabase.auth.onAuthStateChange((_e, session) => handleSession(session));

function handleSession(session) {
    const navInfo = document.getElementById('user-nav-info');
    const navEmail = document.getElementById('nav-email');

    if (!session) {
        currentUser = null;
        if(navInfo) navInfo.classList.add('hidden');
        switchView('view-landing');
        return;
    }
    
    currentUser = session.user;
    if(navInfo) {
        navInfo.classList.remove('hidden');
        navEmail.textContent = currentUser.email;
    }

    if (currentUser.email === ADMIN_EMAIL) {
        switchView('view-admin');
        fetchPending();
    } else {
        switchView('view-user');
        fetchHistory();
    }
}

const btnLogin = document.getElementById('btn-login');
if(btnLogin) {
    btnLogin.addEventListener('click', async () => {
        try {
            await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
        } catch (e) { showToast('Authentication Failed'); }
    });
}

document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
});

function escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

const btnSubmit = document.getElementById('btn-submit');
if(btnSubmit) {
    btnSubmit.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const msg = textarea.value.trim();
        const anonToggle = document.getElementById('anon-toggle');
        const isAnon = anonToggle ? anonToggle.checked : true;
        
        if (!msg) return showToast('Please enter your message.');
        
        btn.disabled = true;
        btn.innerHTML = '<span class="opacity-70">Processing...</span>';

        try {
            await supabase.from('messages').insert([{ 
                user_email: currentUser.email, 
                message_text: msg, 
                status: 'pending', 
                is_anonymous: isAnon 
            }]);
            textarea.value = '';
            textarea.style.height = 'auto';
            showToast('Your message has been safely delivered.');
            fetchHistory();
        } catch (err) {
            showToast('System Error. Try again.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Release Message';
        }
    });
}

async function fetchHistory() {
    const { data } = await supabase.from('messages').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    const container = document.getElementById('user-history');
    if(!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-sm text-warm-800/50 col-span-full py-10 text-center">Your journey starts here. No messages yet.</p>';
        return;
    }

    container.innerHTML = data.map((msg, index) => `
        <div class="history-card" style="animation: fadeUp 0.5s ease-out ${index * 0.1}s both;">
            <div class="flex justify-between items-center mb-4">
                <span class="text-xs font-semibold text-warm-800/60 uppercase tracking-wider">${msg.is_anonymous ? 'Anonymous' : escape(msg.user_email)}</span>
                <span class="badge ${msg.status}">${msg.status}</span>
            </div>
            <p class="text-base text-warm-900 font-light leading-relaxed">${escape(msg.message_text)}</p>
        </div>
    `).join('');
}

const style = document.createElement('style');
style.innerHTML = `@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(style);

const btnRefresh = document.getElementById('btn-refresh');
if(btnRefresh) btnRefresh.addEventListener('click', fetchPending);

async function fetchPending() {
    const { data } = await supabase.from('messages').select('*').eq('status', 'pending').order('created_at', { ascending: true });
    const container = document.getElementById('admin-pending');
    if(!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-sm text-warm-800/50 col-span-full py-10 text-center">Inbox is empty. All caught up.</p>';
        return;
    }

    container.innerHTML = data.map((msg, index) => `
        <div class="history-card flex flex-col justify-between" style="animation: fadeUp 0.5s ease-out ${index * 0.1}s both;">
            <div>
                <div class="text-[10px] font-bold tracking-[0.2em] text-warm-800/40 uppercase mb-3">Sender: ${msg.is_anonymous ? 'HIDDEN' : escape(msg.user_email)}</div>
                <p class="text-base text-warm-900 font-light leading-relaxed mb-6">${escape(msg.message_text)}</p>
            </div>
            <div class="flex gap-3 mt-auto pt-4 border-t border-warm-100">
                <button onclick="adminAction('${msg.id}', 'rejected')" class="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">Reject</button>
                <button onclick="adminAction('${msg.id}', 'approved', \`${escape(msg.message_text)}\`)" class="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">Approve</button>
            </div>
        </div>
    `).join('');
}

window.adminAction = async function(id, action, text = null) {
    try {
        await supabase.from('messages').update({ status: action }).eq('id', id);
        
        if (action === 'approved' && text) {
            await navigator.clipboard.writeText(`${text}\n\n#fakbokntun #ฝากบอกนตอน #ntun`);
            showToast('Approved & Copied successfully');
        } else {
            showToast('Entry rejected');
        }
        
        fetchPending();
    } catch (e) {
        showToast('Action Failed');
    }
};

initAuth();
