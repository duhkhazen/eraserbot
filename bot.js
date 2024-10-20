// Importa los módulos necesarios
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Crea una instancia del cliente de Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Obtén las claves API de las variables de entorno
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Función para obtener información de una película de TMDB
async function getMovieInfo(title) {
    try {
        const searchResponse = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
        if (searchResponse.data.results.length === 0) {
            return null;
        }
        const movie = searchResponse.data.results[0];
        
        // Verifica si la película tiene géneros
        const genres = movie.genres ? movie.genres.map(genre => genre.name).join(', ') : 'No disponible';
        
        const videoResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`);
        const trailer = videoResponse.data.results.find(video => video.type === 'Trailer');
        
        return {
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'No disponible',
            genre: genres,
            synopsis: movie.overview || 'No disponible',
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'No disponible',
            trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : 'No disponible',
        };
    } catch (error) {
        console.error('Error al obtener la información de TMDB:', error);
        return null;
    }
}

// Cuando el bot esté listo
client.once('ready', () => {
    console.log('Bot is online!');
});

// Cuando se envíe un mensaje en el servidor
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Comando para obtener información de una película
    if (message.content.startsWith('/info ')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');

        if (!movieTitle) {
            message.channel.send('Por favor, proporciona el título de una película. Ejemplo: /info Inception');
            return;
        }

        const movieInfo = await getMovieInfo(movieTitle);

        if (!movieInfo) {
            message.channel.send('No se encontró información de esa película.');
            return;
        }

        message.channel.send({
            content: `**${movieInfo.title}** (${movieInfo.year})
            Género: ${movieInfo.genre}
            Sinopsis: ${movieInfo.synopsis}
            
            **Enlaces:**
            - [Ver Tráiler](${movieInfo.trailer})
            - [Ver Poster](${movieInfo.poster})`,
        });

    // Comando para recomendar una película al azar
    } else if (message.content.startsWith('/random')) {
        // Implementar lógica para recomendar una película al azar
    }

    // Comando para recomendar una película de un género específico
    else if (message.content.startsWith('/random ')) {
        const args = message.content.split(' ').slice(1);
        const genre = args.join(' ');
        // Implementar lógica para recomendar una película de un género específico
    }

    // Comando para comenzar un juego de adivinar la película
    else if (message.content.startsWith('/fun')) {
        // Implementar lógica para el juego de adivinar la película
    }

    // Comando para agregar películas a una watchlist
    else if (message.content.startsWith('/addwatchlist ')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');
        // Implementar lógica para agregar a la watchlist
    }

    // Comando para rankear películas
    else if (message.content.startsWith('/rank ')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');
        // Implementar lógica para rankear películas
    }
});

// Inicia el bot
client.login(DISCORD_BOT_TOKEN);
