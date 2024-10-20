// Importa los módulos necesarios
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

// Crea una instancia del cliente de Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Obtén las claves API de las variables de entorno
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Función para obtener información de una película de OMDb
async function getMovieInfo(title) {
    try {
        const response = await axios.get(`http://www.omdbapi.com/?t=${title}&apikey=${OMDB_API_KEY}&language=es`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener la información de OMDb:', error);
        return null;
    }
}

// Función para generar un enlace de Letterboxd
function generateLetterboxdLink(title) {
    const formattedTitle = title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    return `https://letterboxd.com/film/${formattedTitle}/`;
}

// Función para generar un enlace de Stremio
function generateStremioLink(title, imdbID) {
    const formattedTitle = title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
    const cleanImdbID = imdbID.replace("tt", ""); // Elimina el prefijo "tt"
    return `https://www.strem.io/s/movie/${formattedTitle}-${cleanImdbID}`;
}

// Cuando el bot esté listo
client.once('ready', () => {
    console.log('Bot is online!');
});

// Cuando se envíe un mensaje en el servidor
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Comando básico para recomendar película
    if (message.content.startsWith('!recomienda')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');

        if (!movieTitle) {
            message.channel.send('Por favor, proporciona el título de una película. Ejemplo: !recomienda Inception');
            return;
        }

        try {
            const movieInfo = await getMovieInfo(movieTitle);

            if (!movieInfo || movieInfo.Response === 'False') {
                message.channel.send('No se encontró información de esa película.');
                return;
            }

            const letterboxdLink = generateLetterboxdLink(movieInfo.Title);
            const stremioLink = generateStremioLink(movieInfo.Title, movieInfo.imdbID);
            const moviePoster = movieInfo.Poster !== 'N/A' ? movieInfo.Poster : 'No disponible';
            const movieTrailer = movieInfo.Trailer || ''; // Obtén el enlace del tráiler directamente

            message.channel.send({
                content: `**${movieInfo.Title}** (${movieInfo.Year})
                Género: ${movieInfo.Genre}
                Sinopsis: ${movieInfo.Plot}
                
                **Enlaces:**
                - [Ver en Letterboxd](${letterboxdLink})
                - [Ver en Stremio](${stremioLink})${movieTrailer ? `\n- [Ver Tráiler en YouTube](${movieTrailer})` : ''}
                `,
                files: [moviePoster]  // Enviar la carátula de la película
            });

        } catch (error) {
            console.error('Error al obtener la información de la película:', error);
            message.channel.send('Hubo un error al intentar recomendar una película.');
        }
    }
});

// Inicia el bot
client.login(DISCORD_BOT_TOKEN);
