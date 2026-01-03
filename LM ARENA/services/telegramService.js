const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');

// Initialize Telegram Bot
const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (token && token !== 'your_telegram_bot_token_here') {
    try {
        bot = new TelegramBot(token, { polling: false });
        console.log('✅ Telegram Bot initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Telegram Bot:', error.message);
    }
} else {
    console.warn('⚠️  Telegram Bot token not configured');
}

/**
 * Send a violation alert to a Telegram chat
 * @param {String} chatId - Telegram chat ID
 * @param {Object} violationData - Violation details
 * @param {String} violationData.violationType - Type of violation
 * @param {String} violationData.employeeName - Name of employee
 * @param {String} violationData.severity - Severity level
 * @param {String} violationData.location - Location/area
 * @param {String} violationData.cameraInfo - Camera information
 * @param {String} violationData.dashboardLink - Link to dashboard
 * @param {String} violationData.imageUrl - Path to violation image (optional)
 * @returns {Promise} - Resolves when message is sent
 */
async function sendViolationAlert(chatId, violationData) {
    if (!bot) {
        throw new Error('Telegram Bot not initialized. Check TELEGRAM_BOT_TOKEN in .env');
    }

    if (!chatId) {
        throw new Error('Telegram Chat ID not provided');
    }

    const {
        violationType,
        employeeName,
        severity,
        location,
        cameraInfo,
        dashboardLink,
        imageUrl
    } = violationData;

    // Format the violation type for display
    const violationTypeDisplay = violationType.replace(/_/g, ' ').toUpperCase();

    // Get current time
    const timestamp = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    // Build the message
    const message = `🚨 *SAFETY ALERT*

⚠️ *Type:* ${violationTypeDisplay}
👤 *Employee:* ${employeeName}
📍 *Location:* ${location}
📹 *Camera:* ${cameraInfo}
🔴 *Severity:* ${severity.toUpperCase()}
🕐 *Time:* ${timestamp}

🔗 [View in Dashboard](${dashboardLink})`;

    try {
        // If image is provided, send photo with caption
        if (imageUrl) {
            const imagePath = path.join(__dirname, '..', 'public', imageUrl);

            if (fs.existsSync(imagePath)) {
                await bot.sendPhoto(chatId, imagePath, {
                    caption: message,
                    parse_mode: 'Markdown'
                });
                console.log(`✅ Telegram alert with photo sent to chat ${chatId}`);
            } else {
                // If image doesn't exist, send text only
                await bot.sendMessage(chatId, message, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: false
                });
                console.log(`⚠️  Image not found, sent text-only alert to chat ${chatId}`);
            }
        } else {
            // Send text message only
            await bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: false
            });
            console.log(`✅ Telegram alert sent to chat ${chatId}`);
        }

        return { success: true };
    } catch (error) {
        console.error(`❌ Failed to send Telegram alert to chat ${chatId}:`, error.message);
        throw error;
    }
}

/**
 * Send a test message to verify Telegram integration
 * @param {String} chatId - Telegram chat ID
 * @returns {Promise}
 */
async function sendTestMessage(chatId) {
    if (!bot) {
        throw new Error('Telegram Bot not initialized');
    }

    const message = '✅ *Test Message*\n\nYour Telegram bot is working correctly!\nYou will receive safety violation alerts here.';

    await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown'
    });

    return { success: true };
}

module.exports = {
    sendViolationAlert,
    sendTestMessage,
    bot
};
