/**
 * FAKBOKNTUN - Stable Startup Architecture
 */

// 1. CONFIG & SECURITY
(function initSecurity() {
    document.addEventListener('contextmenu', e => e.preventDefault());
})();

const SUPABASE_URL = 'https://uffczgkjrdqqactsjuiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZmN6Z2tqcmRxcWFjdHNqdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjQ2NDEsImV4cCI6MjEwMDI0MDY0MX0.o8yrwmKb_6f_9ZTQp9QRuv5MSV_DGMnpUBHM4A7RbI8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_EMAIL = 'aceaa372@gmail.com';
let currentUser = null;

// 2. UI HELPERS
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) translateX(-50%)';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(16px) translateX(-50%)';
    }, 3000);
}

// 💡 แก้ปัญหาจอดำ: สลับคลาสตรงๆ ไม่พึ่ง GSAP
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => {
        v.classList.remove('flex');
        v.classList.add('hidden');
    });
    
    const view = document.getElementById(viewId);
    if(view) {
        view.classList.remove('hidden');
        view.classList.add('flex');
    }
}

// 3. AUTHENTICATION
async function initAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        handleSession(session);
    } catch (err) {
        handleSession(null); 
    }
}

supabase.auth.onAuthStateChange((_e, session) => handleSession(session));

function handleSession(session) {
    const navActions = document.getElementById('nav-actions');

    if (!session) {
        currentUser = null;
        navActions.innerHTML = `<button id="btn-login-nav" class="bg-brand-purple hover:bg-purple-700 text-white px-8 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-purple-500/30">เข้าสู่ระบบ</button>`;
        setupLoginButtons();
        switchView('view-landing');
        return;
    }
    
    currentUser = session.user;
    navActions.innerHTML = `<button id="btn-logout" class="bg-gray-100 hover:bg-gray-200 text-brand-dark px-6 py-2 rounded-full font-medium transition-all text-sm">ออกจากระบบ</button>`;
    
    document.getElementById('btn-logout').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });

    if (currentUser.email === ADMIN_EMAIL) {
        switchView('view-admin');
        fetchPending();
    } else {
        switchView('view-user');
        fetchHistory();
    }
}

function setupLoginButtons() {
    const loginHandler = async () => {
        try {
            await supabase.auth.signInWithOAuth({ 
                provider: 'google', 
                options: { redirectTo: window.location.origin + window.location.pathname } 
            });
        } catch (e) { showToast('เข้าสู่ระบบล้มเหลว'); }
    };

    const btnNav = document.getElementById('btn-login-nav');
    const btnHero = document.getElementById('btn-login-hero');
    if(btnNav) btnNav.addEventListener('click', loginHandler);
    if(btnHero) btnHero.addEventListener('click', loginHandler);
}

// 4. DATA LOGIC
function escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

const btnSubmit = document.getElementById('btn-submit');
if(btnSubmit) {
    btnSubmit.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const textarea = document.getElementById('message-input');
        const msg = textarea.value.trim();
        const anonToggle = document.getElementById('anon-toggle');
        const isAnon = anonToggle ? anonToggle.checked : true;
        
        if (!msg) return showToast('กรุณาพิมพ์ข้อความก่อนส่ง');
        
        btn.disabled = true;
        btn.textContent = 'กำลังส่ง...';

        try {
            await supabase.from('messages').insert([{ 
                user_email: currentUser.email, 
                message_text: msg, 
                status: 'pending', 
                is_anonymous: isAnon 
            }]);
            textarea.value = '';
            showToast('ส่งข้อความสำเร็จแล้ว!');
            fetchHistory();
        } catch (err) {
            showToast('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            btn.disabled = false;
            btn.textContent = 'ส่งข้อความ';
        }
    });
}

async function fetchHistory() {
    const { data } = await supabase.from('messages').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    const container = document.getElementById('user-history');
    if(!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-gray-400 col-span-full py-8">ยังไม่มีประวัติการส่งข้อความ</p>';
        return;
    }

    container.innerHTML = data.map((msg) => `
        <div class="message-card animate-fade-in-up">
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-semibold text-gray-500">${msg.is_anonymous ? 'ไม่ระบุตัวตน' : escape(msg.user_email)}</span>
                <span class="badge ${msg.status}">${msg.status}</span>
            </div>
            <p class="text-brand-dark leading-relaxed">${escape(msg.message_text)}</p>
        </div>
    `).join('');
}

const btnRefresh = document.getElementById('btn-refresh');
if(btnRefresh) btnRefresh.addEventListener('click', fetchPending);

async function fetchPending() {
    const { data } = await supabase.from('messages').select('*').eq('status', 'pending').order('created_at', { ascending: true });
    const container = document.getElementById('admin-pending');
    if(!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-gray-400 col-span-full py-8 text-center">ไม่มีข้อความรอตรวจสอบ</p>';
        return;
    }

    container.innerHTML = data.map((msg) => `
        <div class="message-card flex flex-col justify-between animate-fade-in-up">
            <div>
                <div class="text-xs font-bold text-brand-purple mb-2">ผู้ส่ง: ${msg.is_anonymous ? 'ปกปิด' : escape(msg.user_email)}</div>
                <p class="text-brand-dark mb-6">${escape(msg.message_text)}</p>
            </div>
            <div class="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                <button onclick="adminAction('${msg.id}', 'rejected')" class="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">ไม่อนุมัติ</button>
                <button onclick="adminAction('${msg.id}', 'approved', \`${escape(msg.message_text)}\`)" class="flex-1 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">อนุมัติ</button>
            </div>
        </div>
    `).join('');
}

window.adminAction = async function(id, action, text = null) {
    try {
        await supabase.from('messages').update({ status: action }).eq('id', id);
        
        if (action === 'approved' && text) {
            await navigator.clipboard.writeText(`${text}\n\n#fakbokntun`);
            showToast('อนุมัติและคัดลอกข้อความแล้ว');
        } else {
            showToast('ปฏิเสธข้อความแล้ว');
        }
        
        fetchPending();
    } catch (e) {
        showToast('ดำเนินการไม่สำเร็จ');
    }
};

// Start App
initAuth();
