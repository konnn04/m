import axios from 'axios';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
let telegramEnabled = false;


const reportError = async (errorMessage, endpoint, params = {}) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    try {
        const message = `
🔴 *ERROR REPORT*
📍 *Endpoint*: ${endpoint}
⏱ *Time*: ${new Date().toISOString()}
🔍 *Params*: ${JSON.stringify(params)}
❌ *Error*: ${errorMessage}
`;
        // Use axios directly instead of the bot library
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            }
        );
    } catch (err) {
        console.error('Failed to send Telegram notification:', err.message);
    }
};

const sendMessage = async (message) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    try {
        // Use axios directly instead of the bot library
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            }
        );
    } catch (err) {
        console.error('Failed to send Telegram notification:', err.message);
    }
};

// Test the Telegram connection on startup
const testTelegramConnection = async () => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('Telegram reporting disabled: Missing bot token or chat ID');
        return;
    }

    try {
        await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
        telegramEnabled = true;
        console.log('Telegram reporting enabled and connected');
        sendMessage(`🚀 *Server started* on port: ${process.env.PORT || 3000}`);
    } catch (error) {
        console.error('Telegram bot initialization failed:', error.message);
    }
};

// Call the test function


// Export the function
export default { reportError, sendMessage, testTelegramConnection };