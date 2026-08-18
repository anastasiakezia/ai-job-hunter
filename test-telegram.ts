import axios from 'axios';

const token = '8896187868:AAHjVog1r_iB6X6B4fnmvr8p97L0HzkllEQ';
const chatId = '1148670295';

async function testTelegram() {
  try {
    // Test 1: Get bot info
    console.log('Testing bot token...');
    const botInfo = await axios.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 10000 });
    console.log('✅ Bot info:', botInfo.data);

    // Test 2: Send test message
    console.log('\nSending test message...');
    const sendMsg = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: '🤖 *AI Job Hunter Test*\n\nSetup berhasil! Notifikasi akan dikirim otomatis setiap hari.',
      parse_mode: 'Markdown'
    }, { timeout: 10000 });
    console.log('✅ Message sent:', sendMsg.data);

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTelegram();
