const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const express = require('express');

// ==========================================
// 1. RENDER SERVER SETUP (Bot ko zinda rakhne ke liye)
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('Xumon ka Movie Bot Zinda Hai! 🚀'));
app.listen(process.env.PORT || 3000, () => console.log('Server Start Ho Gaya!'));

// ==========================================
// 2. MONGODB DATABASE CONNECTION
// ⚠️ DHYAN DEIN: Agar tumne DB mein password kuch aur rakha hai, toh 'xumon12345' ki jagah wo likhna!
// ==========================================
const mongoURI = "mongodb+srv://xumon:xumon12345@cluster0.ryyfo6j.mongodb.net/moviebot?appName=Cluster0";

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Database Connect Ho Gaya!"))
  .catch(err => console.log("❌ Database Error:", err));

// ==========================================
// 3. DATABASE SCHEMAS (Database ka structure)
// ==========================================
const movieSchema = new mongoose.Schema({ 
    name: String, image: String, watch1: String, watch2: String, dl1: String, dl2: String
});
const Movie = mongoose.model('Movie', movieSchema);

const userSchema = new mongoose.Schema({ userId: Number });
const User = mongoose.model('User', userSchema);

// ==========================================
// 4. TELEGRAM BOT SETUP & SETTINGS
// ==========================================
const token = '8912995250:AAHlI1Ridq5IkResaozLvKqXN-37bDudtVQ'; 
const bot = new TelegramBot(token, {polling: true});

// ⚠️ ADMIN SETTINGS ⚠️
const ADMIN_ID = 8564724671; 
const CHANNEL_USERNAME = '@moviiehub_4k'; 
const CHANNEL_LINK = 'https://t.me/moviiehub_4k'; 
const SHRINKME_API_KEY = "11b964d6d724ae6b6f18894167e9b9a5d94a8b08";

// ==========================================
// 5. HELPER FUNCTIONS (URL Shortener & F-Sub)
// ==========================================
async function shortenUrl(longUrl) {
    if (!longUrl || longUrl.trim() === "na") return "na"; 
    try {
        const apiUrl = `https://shrinkme.io/api?api=${SHRINKME_API_KEY}&url=${encodeURIComponent(longUrl.trim())}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        return data.status === 'success' ? data.shortenedUrl : longUrl.trim();
    } catch (error) {
        return longUrl.trim();
    }
}

async function checkFSub(chatId) {
    if (CHANNEL_USERNAME === '@TumharaChannelUsername') return true; 
    try {
        const member = await bot.getChatMember(CHANNEL_USERNAME, chatId);
        if (member.status === 'left' || member.status === 'kicked') return false;
        return true;
    } catch (error) {
        console.log("F-Sub Error (Bot Channel me Admin nahi hai!):", error.message);
        return true; 
    }
}

// ==========================================
// 6. COMMAND: /start
// ==========================================
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userExists = await User.findOne({ userId: chatId });
    if (!userExists) {
        await new User({ userId: chatId }).save();
    }
    bot.sendMessage(chatId, "Welcome Bhai! 🎬\n\nKoi bhi Anime ya Movie ka naam likho, main tumhe direct poster aur links dunga!");
});

// ==========================================
// 7. COMMAND: /add (Sirf Admin ke liye - Nayi movie daalne ke liye)
// Format: /add Movie Name | Image URL | Watch 1 | Watch 2 | DL 1 | DL 2
// ==========================================
bot.onText(/\/add (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    if (chatId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Tum admin nahi ho!");

    const input = match[1].split('|');
    if (input.length < 6) return bot.sendMessage(chatId, "❌ Galat format!\n`/add Movie Name | Image URL | Watch 1 | Watch 2 | DL 1 | DL 2`", {parse_mode: "Markdown"});

    const movieName = input[0].trim().toLowerCase();
    const imageLink = input[1].trim();
    const processingMsg = await bot.sendMessage(chatId, "⏳ Charo links short ho rahe hain...");

    const [w1, w2, d1, d2] = await Promise.all([
        shortenUrl(input[2]), shortenUrl(input[3]), shortenUrl(input[4]), shortenUrl(input[5])
    ]);

    try {
        await new Movie({ name: movieName, image: imageLink, watch1: w1, watch2: w2, dl1: d1, dl2: d2 }).save();
        bot.deleteMessage(chatId, processingMsg.message_id);
        bot.sendMessage(chatId, `✅ Movie Add Ho Gayi!\n🍿 *Naam:* ${movieName}`, {parse_mode: "Markdown"});
    } catch (error) {
        bot.sendMessage(chatId, "❌ Error: Movie add nahi ho payi.");
    }
});

// ==========================================
// 8. COMMAND: /update (Sirf Admin ke liye - Purani movie ke links badalne ke liye)
// Format: /update Movie Name | Watch 1 | Watch 2 | DL 1 | DL 2
// ==========================================
bot.onText(/\/update (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    if (chatId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Tum admin nahi ho!");

    const input = match[1].split('|');
    if (input.length < 5) return bot.sendMessage(chatId, "❌ Galat format!\n`/update Movie Name | Watch 1 | Watch 2 | DL 1 | DL 2`", {parse_mode: "Markdown"});

    const movieName = input[0].trim().toLowerCase();
    const processingMsg = await bot.sendMessage(chatId, "⏳ Naye links short aur update ho rahe hain...");

    try {
        const movie = await Movie.findOne({ name: movieName });
        if (!movie) {
            return bot.editMessageText("❌ Yeh movie database mein nahi mili! Pehle /add command use karo.", { chat_id: chatId, message_id: processingMsg.message_id });
        }

        const [w1, w2, d1, d2] = await Promise.all([
            shortenUrl(input[1]), shortenUrl(input[2]), shortenUrl(input[3]), shortenUrl(input[4])
        ]);

        movie.watch1 = w1;
        movie.watch2 = w2;
        movie.dl1 = d1;
        movie.dl2 = d2;
        await movie.save();

        bot.deleteMessage(chatId, processingMsg.message_id);
        bot.sendMessage(chatId, `✅ Movie Update Ho Gayi!\n🍿 *Naam:* ${movieName}`, {parse_mode: "Markdown"});
    } catch (error) {
        bot.sendMessage(chatId, "❌ Error: Movie update nahi ho payi.");
    }
});

// ==========================================
// 9. COMMAND: /broadcast (Sirf Admin ke liye - Sabko message bhejne ke liye)
// ==========================================
bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId !== ADMIN_ID) return bot.sendMessage(chatId, "❌ Tum admin nahi ho!");

    const broadcastMsg = match[1];
    const users = await User.find({});
    let count = 0;

    bot.sendMessage(chatId, "⏳ Broadcast shuru ho gaya hai...");

    for (let u of users) {
        try {
            await bot.sendMessage(u.userId, `📢 *Admin Update:*\n\n${broadcastMsg}`, {parse_mode: "Markdown"});
            count++;
        } catch (e) {} 
    }
    bot.sendMessage(chatId, `✅ Broadcast Pura Hua! ${count} logon ko message mil gaya.`);
});

// ==========================================
// 10. SMART SEARCH & AUTO-DELETE & F-SUB
// ==========================================
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.toLowerCase() : "";

    // Agar message command (/) hai, toh ignore karo
    if (text.startsWith('/')) return;

    // F-Sub Check
    const isSubscribed = await checkFSub(chatId);
    if (!isSubscribed) {
        const fsubKeyboard = {
            inline_keyboard: [[{ text: "📢 Join Our Channel", url: CHANNEL_LINK }]]
        };
        return bot.sendMessage(chatId, "❌ *Pehle humara channel join karo!*\n\nChannel join karne ke baad wapas aakar movie ka naam likho.", {parse_mode: "Markdown", reply_markup: fsubKeyboard});
    }

    try {
        const movies = await Movie.find({ name: { $regex: text, $options: 'i' } });
        
        if (movies.length > 0) {
            for (let m of movies) {
                const captionText = `🎬 *${m.name.toUpperCase()}*\n\n⚠️ *Yeh message 5 minute baad delete ho jayega!* Jaldi download karo.\n\n👇 Buttons par click karo:`;
                const keyboard = {
                    inline_keyboard: []
                };

                // Agar link 'na' nahi hai, tabhi button dikhao
                const row1 = [];
                if (m.watch1 !== 'na') row1.push({ text: "▶️ Watch 1", url: m.watch1 });
                if (m.watch2 !== 'na') row1.push({ text: "▶️ Watch 2", url: m.watch2 });
                if (row1.length > 0) keyboard.inline_keyboard.push(row1);

                const row2 = [];
                if (m.dl1 !== 'na') row2.push({ text: "⬇️ Download 1", url: m.dl1 });
                if (m.dl2 !== 'na') row2.push({ text: "⬇️ Download 2", url: m.dl2 });
                if (row2.length > 0) keyboard.inline_keyboard.push(row2);

                const sentMsg = await bot.sendPhoto(chatId, m.image, { 
                    caption: captionText, 
                    parse_mode: "Markdown", 
                    reply_markup: keyboard 
                });

                // 5 Minute (300000 ms) baad message delete karna
                setTimeout(() => {
                    bot.deleteMessage(chatId, sentMsg.message_id).catch(e => console.log("Delete error"));
                }, 300000); 
            }
        } else {
            bot.sendMessage(chatId, "❌ Yeh movie abhi mere paas nahi hai.");
        }
    } catch (error) {
        bot.sendMessage(chatId, "❌ Database error aa raha hai.");
    }
});
