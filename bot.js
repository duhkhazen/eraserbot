// Importa los módulos necesarios
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

// Crea una instancia del cliente de Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Obtén las claves API de las variables de entorno
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Función para obtener información de una película de TMDB
async function getMovieInfo(title) {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
        return response.data.results[0]; // Devuelve la primera película que coincida
    } catch (error) {
        console.error('Error al obtener la información de TMDB:', error);
        return null;
    }
}

// Función para generar un enlace de Letterboxd
function generateLetterboxdLink(title) {
    const formattedTitle = title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    return `https://letterboxd.com/film/${formattedTitle}/`;
}

// Función para generar un enlace de Stremio
function generateStremioLink(title, tmdbID) {
    const formattedTitle = title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    return `https://www.strem.io/s/movie/${formattedTitle}-${tmdbID}`;
}

// Cuando el bot esté listo
client.once('ready', () => {
    console.log('Bot is online!');
});

// Cuando se envíe un mensaje en el servidor
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Comando para obtener información de una película
    if (message.content.startsWith('/info')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');

        if (!movieTitle) {
            message.channel.send('Por favor, proporciona el título de una película. Ejemplo: /info Inception');
            return;
        }

        try {
            const movieInfo = await getMovieInfo(movieTitle);

            if (!movieInfo) {
                message.channel.send('No se encontró información de esa película.');
                return;
            }

            const letterboxdLink = generateLetterboxdLink(movieInfo.original_title);
            const stremioLink = generateStremioLink(movieInfo.original_title, movieInfo.id);
            const moviePoster = movieInfo.poster_path ? `https://image.tmdb.org/t/p/w500${movieInfo.poster_path}` : 'No disponible';
            const trailerLink = movieInfo.trailer ? movieInfo.trailer : 'No disponible'; // Aquí puedes ajustar para obtener el trailer de otra API

            message.channel.send({
                content: `**${movieInfo.original_title}** (${movieInfo.release_date.split('-')[0]})
                Género: ${movieInfo.genre_ids.map(id => `Género ${id}`).join(', ')}
                Sinopsis: ${movieInfo.overview}
                
                **Enlaces:**
                - [Ver en Letterboxd](${letterboxdLink})
                - [Ver en Stremio](${stremioLink})
                ${trailerLink !== 'No disponible' ? `- [Ver Tráiler](${trailerLink})` : ''}`,
                files: [moviePoster]  // Enviar la carátula de la película
            });

        } catch (error) {
            console.error('Error al obtener la información de la película:', error);
            message.channel.send('Hubo un error al intentar obtener información de la película.');
        }
    }
});

// Inicia el bot
client.login(DISCORD_BOT_TOKEN);
