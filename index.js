const { Telegraf } = require('telegraf');
const fs = require('fs');
const express = require('express'); 

const app = express(); 

const token = '8792861346:AAHQYgv8eZsjqtWJ8pSOBv8SdP56wac8ax8';
const bot = new Telegraf(token);
const adminId = '8564724671'; 

bot.start((ctx) => {
    ctx.reply("👋 Hello! Movie ka naam bhejo, main tumhe Watch aur Download dono ke 2-2 options dunga.");
});

bot.command('add', (ctx) => {
    const chatId = ctx.chat.id.toString();
    if (chatId !== adminId) return ctx.reply("❌ Tum admin nahi ho!");

    const commandText = ctx.message.text.replace('/add', '').trim();
    const input = commandText.split('|');

    if (input.length < 6) return ctx.reply("⚠️ Sahi format: /add Movie Name | Watch 1 | Watch 2 | DL 1 | DL 2 | Image URL");

    const movieName = input[0].toLowerCase().trim();
    
    try {
        let moviesData = {};
        if (fs.existsSync('movies.json')) {
            moviesData = JSON.parse(fs.readFileSync('movies.json', 'utf8'));
        }
        
        moviesData[movieName] = {
            w1: input[1].trim(),
            w2: input[2].trim(),
            dl1: input[3].trim(),
            dl2: input[4].trim(),
            image: input[5].trim()
        }; 

        fs.writeFileSync('movies.json', JSON.stringify(moviesData, null, 2));
        ctx.reply(`✅ Movie Add Ho Gayi!\nNaam: ${movieName}`);
    } catch (error) {
        ctx.reply("❌ Database error!");
    }
});

bot.on('text', (ctx) => {
    const text = ctx.message.text.toLowerCase().trim();
    if (text.startsWith('/')) return; 

    try {
        if (fs.existsSync('movies.json')) {
            const moviesData = JSON.parse(fs.readFileSync('movies.json', 'utf8'));
            
            if (moviesData[text]) {
                const movie = moviesData[text]; 
                ctx.replyWithPhoto(movie.image, {
                    caption: `🎬 **${text.toUpperCase()}**\n\nNeeche diye gaye buttons se Watch ya Download karo 👇`,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🍿 Watch 1", url: movie.w1 }, { text: "🍿 Watch 2", url: movie.w2 }],
                            [{ text: "📥 Download 1", url: movie.dl1 }, { text: "📥 Download 2", url: movie.dl2 }]
                        ]
                    }
                });
            } else {
                ctx.reply("❌ Sorry, yeh movie abhi database mein nahi hai.");
            }
        }
    } catch (error) {
        console.log("Error reading JSON");
    }
});

bot.launch();

// Yeh hissa Render par bot ko 24/7 zinda rakhne ke liye hai
app.get('/', (req, res) => {
    res.send('Xumon ka Bot zinda hai!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

