/**
 * FAKBOKNTUN - Enterprise Dashboard & Instagram Auto-Post
 */

// 1. CONFIGURATION
const SUPABASE_URL = 'https://uffczgkjrdqqactsjuiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZmN6Z2tqcmRxcWFjdHNqdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjQ2NDEsImV4cCI6MjEwMDI0MDY0MX0.o8yrwmKb_6f_9ZTQp9QRuv5MSV_DGMnpUBHM4A7RbI8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🔑 นำรหัสจาก Meta API มาใส่ 2 ช่องนี้ครับ
const IG_USER_ID = 'ใส่_IG_USER_ID_ตรงนี้'; 
const IG_ACCESS_TOKEN = 'ใส่_PAGE_ACCESS_TOKEN_ตรงนี้';

// รูปเริ่มต้นสำหรับกรณีที่โพสต์นั้นไม่มีการอัปโหลดรูปภาพ (IG บังคับว่าต้องมีรูป)
const DEFAULT_POST_IMAGE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop';

const ADMIN_EMAIL = 'aceaa372@gmail.com';
let currentUser = null;

// ==========================================
// 2. INSTAGRAM AUTO-POST ENGINE (ยิงลง IG)
// ==========================================
async function postToInstagram(captionText, imageUrl = null) {
    // เช็กว่าตั้งค่า Token หรือยัง
    if (!IG_USER_ID || IG_USER_ID.includes('ใส่_') || !IG_ACCESS_TOKEN || IG_ACCESS_TOKEN.includes('ใส่_')) {
        console.warn('⚠️ ยังไม่ได้ตั้งค่า IG_USER_ID หรือ IG_ACCESS_TOKEN');
        return { success: false, reason: 'ยังไม่ได้ใส่ Token / ID ใน script.js' };
    }

    const imageToUse = imageUrl || DEFAULT_POST_IMAGE;

    try {
        // STEP 1: สร้าง Media Container บน Meta Server
        const step1Url = `https://graph.facebook.com/v19.0/${IG_USER_ID}/media`;
        const step1Res = await fetch(step1Url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: imageToUse,
                caption: captionText,
                access_token: IG_ACCESS_TOKEN
            })
        });
        
        const step1Data = await step1Res.json();

        if (step1Data.error) {
            console.error('❌ IG Step 1 Error:', step1Data.error);
            return { success: false, error: step1Data.error.message };
        }

        const creationId = step1Data.id;

        // STEP 2: สั่ง Publish โพสต์ขึ้น Feed
        const step2Url = `https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`;
        const step2Res = await fetch(step2Url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: creationId,
                access_token: IG_ACCESS_TOKEN
            })
        });

        const step2Data = await step2Res.json();

        if (step2Data.error) {
            console.error('❌ IG Step 2 Error:', step2Data.error);
            return { success: false, error: step2Data.error.message };
        }

        console.log('🚀 โพสต์ลง Instagram สำเร็จ! ID:', step2Data.id);
        return { success: true, mediaId: step2Data.id };

    } catch (err) {
        console.error('❌ IG Publish Exception:', err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 3. UI HELPERS & UTILS
// ==========================================
function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    if(!toast || !toastMsg) return;
    
    toastMsg.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = window.innerWidth >= 768 ? 'translateY(0)' : 'translateY(0) translateX(-50%)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = window.innerWidth >= 768 ? 'translateY(16px)' : 'translateY(16px) translateX(-50%)';
    }, 4000);
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
    
    const targetTab = document.getElementById(tabId);
    if(targetTab) targetTab.classList.add('active');
    if(event && event.currentTarget) event.currentTarget.classList.add('active');

    if(tabId === 'tab-history') fetchHistory();
}

// ==========================================
// 4. AUTHENTICATION & SESSION
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

const btnLogin = document.getElementById('btn-login');
if(btnLogin) {
    btnLogin.addEventListener('click', async () => {
        try {
            await supabase.auth.signInWithOAuth({ 
                provider: 'google', 
                options: { redirectTo: window.location.origin + window.location.pathname } 
            });
        } catch (e) { showToast('เข้าสู่ระบบล้มเหลว'); }
    });
}

const btnLogout = document.getElementById('btn-logout');
if(btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
}

// ==========================================
// 5. USER SUBMIT FORM
// ==========================================
const btnSubmit = document.getElementById('btn-submit-post');
if(btnSubmit) {
    btnSubmit.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const msgText = document.getElementById('msg-text').value.trim();
        const showProfile = document.getElementById('toggle-profile').checked;
        const hasMusic = document.getElementById('toggle-music').checked;
        const tags = document.getElementById('msg-tags').value.trim();
        
        if (!msgText) return showToast('กรุณาระบุรายละเอียดข้อความ');
        
        btn.disabled = true;
        btn.textContent = 'กำลังส่งข้อมูล...';

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
            showToast('บันทึกข้อมูลสำเร็จแล้ว');
            
            switchTab('tab-history');
        } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาดในการส่งข้อมูล');
        } finally {
            btn.disabled = false;
            btn.textContent = 'ยืนยันการส่งคำขอ';
        }
    });
}

// ==========================================
// 6. ADMIN ACTION & HISTORY
// ==========================================
window.adminAction = async function(id, action, text = null, tags = null, imageUrl = null) {
    try {
        if (action === 'approved') {
            showToast('กำลังอนุมัติและโพสต์ลง Instagram...');
            
            // ประกอบข้อความแคปชั่น
            let caption = `${text}\n\n`;
            if (tags) caption += `📌 Tag: ${tags}\n`;
            caption += `\n#fakbokntun #ฝากบอก`;

            // สั่งยิงโพสต์ลง IG
            const igResult = await postToInstagram(caption, imageUrl);

            if (igResult.success) {
                showToast('✅ โพสต์ลง Instagram และอนุมัติเรียบร้อย!');
            } else {
                showToast(`⚠️ อนุมัติแล้ว (แต่ IG โพสต์ไม่ผ่าน: ${igResult.reason || igResult.error})`);
            }
        } else {
            showToast('ปฏิเสธคำขอเรียบร้อยแล้ว');
        }

        // อัปเดตสถานะใน Supabase
        await supabase.from('messages').update({ status: action }).eq('id', id);
        fetchHistory();

    } catch (e) {
        showToast('เกิดข้อผิดพลาดในการทำรายการ');
    }
};

async function fetchHistory() {
    const container = document.getElementById('history-container');
    if(!container) return;
    
    container.innerHTML = '<p class="text-slate-400 text-sm col-span-full">กำลังโหลดข้อมูล...</p>';

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
            reasonHtml = `<div class="mt-4 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg"><strong>หมายเหตุ:</strong> ${escape(msg.reject_reason || 'ไม่ตรงตามเงื่อนไขการให้บริการ')}</div>`;
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

// Start Application
initAuth();
