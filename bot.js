// Importa los módulos necesarios
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

// Crea una instancia del cliente de Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Obtén las claves API de las variables de entorno
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Arreglos para la watchlist y el ranking
const watchlist = [];
const rankings = {};

// Mapeo de géneros
const genres = {
    28: 'Acción',
    12: 'Aventura',
    16: 'Animación',
    35: 'Comedia',
    80: 'Crimen',
    99: 'Documental',
    18: 'Drama',
    10751: 'Familiar',
    14: 'Fantasía',
    36: 'Historia',
    27: 'Terror',
    10402: 'Música',
    9648: 'Misterio',
    10749: 'Romance',
    878: 'Ciencia ficción',
    10770: 'Película de televisión',
    53: 'Suspenso',
    10752: 'Guerra',
    37: 'Western',
};

// Función para obtener información de una película de TMDB y OMDb
async function getMovieInfo(title) {
    try {
        const tmdbResponse = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
        const movieData = tmdbResponse.data.results;

        if (movieData.length === 0) {
            return null; // No se encontró la película
        }

        const movieInfo = movieData[0]; // Obtiene la primera película
        const year = movieInfo.release_date ? movieInfo.release_date.split('-')[0] : null;

        const omdbResponse = await axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(movieInfo.title)}&y=${year}&apikey=${OMDB_API_KEY}`);
        const omdbData = omdbResponse.data;

        if (omdbData.Response === 'False') {
            return null; // No se encontró información de OMDb
        }

        const imdbID = omdbData.imdbID.slice(2); // Remueve el prefijo 'tt'

        // Obtener el tráiler de TMDB
        const videoResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieInfo.id}/videos?api_key=${TMDB_API_KEY}`);
        const trailer = videoResponse.data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube'); // Obtener el tráiler de YouTube si está disponible

        return {
            title: movieInfo.title,
            year: movieInfo.release_date.split('-')[0],
            genre: movieInfo.genre_ids.map(id => genres[id] || 'Desconocido').join(', '), // Mapea los IDs de género
            plot: omdbData.Plot,
            poster: movieInfo.poster_path ? `https://image.tmdb.org/t/p/w500${movieInfo.poster_path}` : 'No disponible',
            imdbID,
            trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : 'No disponible', // Usar el link directo del tráiler desde TMDB
        };
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
function generateStremioLink(imdbID) {
    return `https://www.strem.io/s/movie/${imdbID}`; // Asegúrate de que esto sea correcto
}

// Función para recomendar una película al azar
async function recommendRandomMovie(message) {
    try {
        const tmdbResponse = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}`);
        const movies = tmdbResponse.data.results;
        const randomMovie = movies[Math.floor(Math.random() * movies.length)];

        const movieInfo = await getMovieInfo(randomMovie.title);

        if (!movieInfo) {
            message.channel.send('No se pudo obtener información sobre la película recomendada.');
            return;
        }

        const letterboxdLink = generateLetterboxdLink(movieInfo.title);
        const stremioLink = generateStremioLink(movieInfo.imdbID);
        const moviePoster = movieInfo.poster || 'No disponible';
        const movieTrailer = movieInfo.trailer !== 'No disponible' ? movieInfo.trailer : `No hay tráiler disponible`;

        await message.channel.send({
            content: `**${movieInfo.title}** (${movieInfo.year})
            Género: ${movieInfo.genre}
            Sinopsis: ${movieInfo.plot}
            
            **Enlaces:**
            - [Ver en Letterboxd](${letterboxdLink})
            - [Ver en Stremio](${stremioLink})
            - [Ver Tráiler](${movieTrailer})`,
            files: [moviePoster]
        });
    } catch (error) {
        console.error('Error al recomendar una película:', error);
        message.channel.send('Hubo un error al intentar recomendar una película.');
    }
}

// Función para recomendar una película por género
async function recommendByGenre(message, genre) {
    try {
        const tmdbResponse = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genre}`);
        const movies = tmdbResponse.data.results;
        const randomMovie = movies[Math.floor(Math.random() * movies.length)];

        const movieInfo = await getMovieInfo(randomMovie.title);

        if (!movieInfo) {
            message.channel.send('No se pudo obtener información sobre la película recomendada.');
            return;
        }

        const letterboxdLink = generateLetterboxdLink(movieInfo.title);
        const stremioLink = generateStremioLink(movieInfo.imdbID);
        const moviePoster = movieInfo.poster || 'No disponible';
        const movieTrailer = movieInfo.trailer !== 'No disponible' ? movieInfo.trailer : `No hay tráiler disponible`;

        await message.channel.send({
            content: `**${movieInfo.title}** (${movieInfo.year})
            Género: ${movieInfo.genre}
            Sinopsis: ${movieInfo.plot}
            
            **Enlaces:**
            - [Ver en Letterboxd](${letterboxdLink})
            - [Ver en Stremio](${stremioLink})
            - [Ver Tráiler](${movieTrailer})`,
            files: [moviePoster]
        });
    } catch (error) {
        console.error('Error al recomendar una película por género:', error);
        message.channel.send('Hubo un error al intentar recomendar una película por género.');
    }
}

// Comando para agregar a la watchlist
function addToWatchlist(movieTitle) {
    if (!watchlist.includes(movieTitle)) {
        watchlist.push(movieTitle);
        return true;
    }
    return false;
}

// Comando para rankear películas
function rankMovie(userId, movieTitle, score) {
    if (!rankings[userId]) {
        rankings[userId] = {};
    }
    rankings[userId][movieTitle] = score;
}

// Cuando el bot esté listo
client.once('ready', () => {
    console.log('Bot is online!');
});

// Cuando se envíe un mensaje en el servidor
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Comando para obtener información de la película
    if (message.content.startsWith('!info')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');

        if (!movieTitle) {
            message.channel.send('Por favor, proporciona el título de una película. Ejemplo: !info Inception');
            return;
        }

        try {
            const movieInfo = await getMovieInfo(movieTitle);

            if (!movieInfo) {
                message.channel.send('No se encontró información de esa película.');
                return;
            }

            const letterboxdLink = generateLetterboxdLink(movieInfo.title);
            const stremioLink = generateStremioLink(movieInfo.imdbID);
            const moviePoster = movieInfo.poster || 'No disponible';
            const movieTrailer = movieInfo.trailer !== 'No disponible' ? movieInfo.trailer : `No hay tráiler disponible`;

            await message.channel.send({
                content: `**${movieInfo.title}** (${movieInfo.year})
                Género: ${movieInfo.genre}
                Sinopsis: ${movieInfo.plot}
                
                **Enlaces:**
                - [Ver en Letterboxd](${letterboxdLink})
                - [Ver en Stremio](${stremioLink})
                - [Ver Tráiler](${movieTrailer})`,
                files: [moviePoster]
            });
        } catch (error) {
            console.error('Error al obtener la información de la película:', error);
            message.channel.send('Hubo un error al obtener la información de la película.');
        }
    }

    // Comando para recomendar una película al azar
    if (message.content.startsWith('!random')) {
        const args = message.content.split(' ').slice(1);
        const genre = args[0] ? args[0] : null;

        if (genre) {
            await recommendByGenre(message, genre);
        } else {
            await recommendRandomMovie(message);
        }
    }

    // Comando para agregar a la watchlist
    if (message.content.startsWith('!addwatchlist')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');

        if (!movieTitle) {
            message.channel.send('Por favor, proporciona el título de una película que deseas agregar a la watchlist.');
            return;
        }

        const added = addToWatchlist(movieTitle);
        if (added) {
            message.channel.send(`La película **${movieTitle}** ha sido agregada a tu watchlist.`);
        } else {
            message.channel.send(`La película **${movieTitle}** ya está en tu watchlist.`);
        }
    }

    // Comando para rankear películas
    if (message.content.startsWith('!rank')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.slice(0, -1).join(' ');
        const score = parseInt(args[args.length - 1]);

        if (!movieTitle || isNaN(score)) {
            message.channel.send('Por favor, proporciona el título de la película y su puntuación. Ejemplo: !rank Inception 9');
            return;
        }

        rankMovie(message.author.id, movieTitle, score);
        message.channel.send(`Has rankeado **${movieTitle}** con una puntuación de ${score}.`);
    }

    // Comando para ver la watchlist
    if (message.content.startsWith('!watchlist')) {
        if (watchlist.length === 0) {
            message.channel.send('Tu watchlist está vacía.');
        } else {
            message.channel.send(`Tu watchlist:\n- ${watchlist.join('\n- ')}`);
        }
    }

    // Comando para ver los rankings
    if (message.content.startsWith('!rankings')) {
        let rankingMessage = 'Rankings:\n';
        for (const user in rankings) {
            rankingMessage += `${user}:\n`;
            for (const movie in rankings[user]) {
                rankingMessage += `  - ${movie}: ${rankings[user][movie]}\n`;
            }
        }
        message.channel.send(rankingMessage || 'No hay rankings disponibles.');
    }
});

// Inicia el bot
client.login(DISCORD_BOT_TOKEN);
