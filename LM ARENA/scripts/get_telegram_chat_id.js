require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Get token from environment variable
const token = process.env.TELEGRAM_BOT_TOKEN;

console.log('🔄 Connecting to Telegram...');
const bot = new TelegramBot(token, { polling: true });

console.log('\n✅ Bot is running!');
console.log('👉 Please open your bot in Telegram and send any message (e.g., "Hello").');
console.log('   I will display your Chat ID here.\n');

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name;

    console.log('----------------------------------------');
    console.log(`📩 Message received from: ${name}`);
    console.log(`🔑 YOUR CHAT ID: ${chatId}`);
    console.log('----------------------------------------');
    console.log('✅ You can now stop this script (Ctrl+C) and use this Chat ID.');

    // Send a reply
    bot.sendMessage(chatId, `Hello ${name}! Your Chat ID is: ${chatId}\n\nI am now ready to send you safety alerts! 🛡️`);

    process.exit(0);
});

bot.on('polling_error', (error) => {
    console.log(`❌ Polling Error: ${error.code}`);
    console.log(error);
});
