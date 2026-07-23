/**
 * FAKBOKNTUN - Enterprise Dashboard Logic
 */

const SUPABASE_URL = 'https://uffczgkjrdqqactsjuiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZmN6Z2tqcmRxcWFjdHNqdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjQ2NDEsImV4cCI6MjEwMDI0MDY0MX0.o8yrwmKb_6f_9ZTQp9QRuv5MSV_DGMnpUBHM4A7RbI8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ==========================================
// UI HELPERS
// ==========================================
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) translateX(-50%)'; // สำหรับมือถือ
    
    // รีเซ็ต transform สำหรับ Desktop
    if(window.innerWidth >= 768) {
        toast.style.transform = 'translateY(0)';
    }

    setTimeout(() => {
        toast.style.opacity = '0';
        if(window.innerWidth >= 768) {
            toast.style.transform = 'translateY(16px)';
        } else {
            toast.style.transform = 'translateY(16px) translateX(-50%)';
        }
    }, 3000);
}

function escape(str) {
    if(!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function switchMainView(viewId) {
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

window.switchTab = function(tabId) {
    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');

    if(tabId === 'tab-history') fetchHistory();
}

// ==========================================
// AUTHENTICATION
// ==========================================
async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    handleSession(session);
}

supabase.auth.onAuthStateChange((_e, session) => handleSession(session));

function handleSession(session) {
    if (!session) {
        currentUser = null;
        switchMainView('view-login');
    } else {
        currentUser = session.user;
        const emailDisplay = document.getElementById('user-email-display');
        if(emailDisplay) emailDisplay.textContent = currentUser.email;
        switchMainView('view-dashboard');
    }
}

document.getElementById('btn-login').addEventListener('click', async () => {
    try {
        await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
    } catch (e) { showToast('เข้าสู่ระบบล้มเหลว'); }
});

const btnLogout = document.getElementById('btn-logout');
if(btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
}

// ==========================================
// SUBMIT POST
// ==========================================
const btnSubmit = document.getElementById('btn-submit-post');
if(btnSubmit) {
    btnSubmit.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const msgText = document.getElementById('msg-text').value.trim();
        const showProfile = document.getElementById('toggle-profile').checked;
        const hasMusic = document.getElementById('toggle-music').checked;
        const tags = document.getElementById('msg-tags').value.trim();
        const files = document.getElementById('msg-files').files;
        
        if (!msgText) return showToast('กรุณาระบุรายละเอียดข้อความ');
        
        btn.disabled = true;
        btn.textContent = 'กำลังประมวลผล...';

        try {
            await supabase.from('messages').insert([{ 
                user_email: currentUser.email, 
                message_text: msgText, 
                status: 'pending',
                is_anonymous: !showProfile,
                tags: tags,
                has_music: hasMusic
            }]);

            document.getElementById('msg-text').value = '';
            document.getElementById('msg-tags').value = '';
            document.getElementById('msg-files').value = '';
            showToast('บันทึกข้อมูลสำเร็จ');
            
            switchTab('tab-history');
        } catch (err) {
            console.error(err);
            showToast('ข้อผิดพลาดทางเซิร์ฟเวอร์');
        } finally {
            btn.disabled = false;
            btn.textContent = 'ยืนยันการส่งคำขอ';
        }
    });
}

// ==========================================
// FETCH HISTORY
// ==========================================
async function fetchHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = '<p class="text-slate-400 text-sm col-span-full">กำลังโหลดข้อมูลจากเซิร์ฟเวอร์...</p>';

    const { data } = await supabase.from('messages').select('*').eq('user_email', currentUser.email).order('created_at', { ascending: false });
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-slate-400 text-sm col-span-full py-4">ไม่พบประวัติการทำรายการ</p>';
        return;
    }

    container.innerHTML = data.map((msg) => {
        let statusText = 'PENDING';
        let reasonHtml = '';

        if(msg.status === 'approved') statusText = 'APPROVED';
        if(msg.status === 'rejected') {
            statusText = 'REJECTED';
            if(msg.reject_reason) {
                reasonHtml = `<div class="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg"><strong>หมายเหตุ:</strong> ${escape(msg.reject_reason)}</div>`;
            } else {
                reasonHtml = `<div class="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg"><strong>หมายเหตุ:</strong> ไม่ตรงตามเงื่อนไขการให้บริการ</div>`;
            }
        }

        return `
        <div class="history-card animate-fade-in">
            <div>
                <div class="flex justify-between items-start mb-4 gap-2">
                    <span class="badge ${msg.status}">${statusText}</span>
                    <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                        ${msg.is_anonymous ? 'ปกปิดตัวตน' : 'เปิดเผยตัวตน'} 
                        ${msg.has_music ? ' • มีดนตรี' : ''}
                    </span>
                </div>
                <p class="text-slate-700 text-sm leading-relaxed">${escape(msg.message_text)}</p>
                ${msg.tags ? `<p class="text-xs text-brand-orange mt-3 font-medium bg-orange-50 inline-block px-2 py-1 rounded border border-orange-100">🔗 ${escape(msg.tags)}</p>` : ''}
            </div>
            ${reasonHtml}
        </div>
        `;
    }).join('');
}

// Start
initAuth();
