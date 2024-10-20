const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

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
            return null;
        }

        const movieInfo = movieData[0]; // Obtiene la primera película
        const year = movieInfo.release_date ? movieInfo.release_date.split('-')[0] : null;

        const omdbResponse = await axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(movieInfo.title)}&y=${year}&apikey=${OMDB_API_KEY}`);
        const omdbData = omdbResponse.data;

        if (omdbData.Response === 'False') {
            return null;
        }

        const imdbID = omdbData.imdbID.slice(2); // Remueve el prefijo 'tt'

        // Obtener el tráiler de TMDB
        const videoResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieInfo.id}/videos?api_key=${TMDB_API_KEY}`);
        const trailer = videoResponse.data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube'); // Obtener el tráiler de YouTube

        // Obtener directores y elenco principal
        const creditsResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieInfo.id}/credits?api_key=${TMDB_API_KEY}`);
        const directors = creditsResponse.data.crew.filter(person => person.job === 'Director').map(director => director.name).join(', ');
        const cast = creditsResponse.data.cast.slice(0, 5).map(actor => actor.name).join(', ');

        return {
            title: movieInfo.title,
            year: movieInfo.release_date.split('-')[0],
            genre: movieInfo.genre_ids.map(id => genres[id] || 'Desconocido').join(', '),
            plot: omdbData.Plot,
            poster: movieInfo.poster_path ? `https://image.tmdb.org/t/p/w500${movieInfo.poster_path}` : 'No disponible',
            imdbID,
            imdbRating: omdbData.imdbRating,
            directors,
            cast,
            trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : 'No disponible',
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
    return `https://www.strem.io/s/movie/${imdbID}`;
}

// Función para obtener una película al azar
async function getRandomMovie(genre) {
    try {
        const genreQuery = genre ? `&with_genres=${genre}` : '';
        const tmdbResponse = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}${genreQuery}&sort_by=popularity.desc`);
        const randomIndex = Math.floor(Math.random() * tmdbResponse.data.results.length);
        return tmdbResponse.data.results[randomIndex];
    } catch (error) {
        console.error('Error al obtener película aleatoria de TMDB:', error);
        return null;
    }
}

// Cuando el bot esté listo
client.once('ready', () => {
    console.log('Bot is online!');
});

// Comando para obtener información de una película
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Comando !info para obtener detalles de una película
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
                **Directores:** ${movieInfo.directors}
                **Elenco Principal:** ${movieInfo.cast}
                **Puntuación IMDb:** ${movieInfo.imdbRating}
                
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

    // Comando !random para obtener una película al azar
    if (message.content.startsWith('!random')) {
        const args = message.content.split(' ').slice(1);
        const genre = args.join(' ');

        try {
            const randomMovie = await getRandomMovie(genre);

            if (!randomMovie) {
                message.channel.send('No se encontró una película al azar.');
                return;
            }

            const letterboxdLink = generateLetterboxdLink(randomMovie.title);
            const stremioLink = generateStremioLink(randomMovie.imdbID);

            await message.channel.send({
                content: `Película al azar: **${randomMovie.title}** (${randomMovie.release_date.split('-')[0]})
                Género: ${randomMovie.genre_ids.map(id => genres[id] || 'Desconocido').join(', ')}
                - [Ver en Letterboxd](${letterboxdLink})
                - [Ver en Stremio](${stremioLink})`,
            });
        } catch (error) {
            console.error('Error al obtener la película aleatoria:', error);
            message.channel.send('Hubo un error al obtener la película aleatoria.');
        }
    }

    // Comando !watchlist para agregar una película a la watchlist
    if (message.content.startsWith('!addtowatchlist')) {
        const movieTitle = message.content.split(' ').slice(1).join(' ');

        if (!movieTitle) {
            message.channel.send('Por favor, proporciona el título de una película. Ejemplo: !addtowatchlist Inception');
            return;
        }

        if (!watchlist.includes(movieTitle)) {
            watchlist.push(movieTitle);
            message.channel.send(`Película **${movieTitle}** agregada a la watchlist.`);
        } else {
            message.channel.send('Esa película ya está en la watchlist.');
        }
    }

    // Comando !viewwatchlist para ver la lista de películas pendientes
    if (message.content.startsWith('!viewwatchlist')) {
        if (watchlist.length === 0) {
            message.channel.send('La watchlist está vacía.');
        } else {
            message.channel.send(`Watchlist:\n- ${watchlist.join('\n- ')}`);
        }
    }

    // Comando !rankmovie para clasificar una película
    if (message.content.startsWith('!rankmovie')) {
        const args = message.content.split(' ');
        const movieTitle = args.slice(1, -1).join(' ');
        const rank = parseInt(args[args.length - 1], 10);

        if (!movieTitle || isNaN(rank) || rank < 1 || rank > 10) {
            message.channel.send('Por favor, proporciona un título de película y una clasificación entre 1 y 10. Ejemplo: !rankmovie Inception 9');
            return;
        }

        rankings[movieTitle] = rank;
        message.channel.send(`Has clasificado la película **${movieTitle}** con un ${rank}/10.`);
    }

    // Comando !viewrankings para ver el ranking de películas
    if (message.content.startsWith('!viewrankings')) {
        if (Object.keys(rankings).length === 0) {
            message.channel.send('No hay películas clasificadas aún.');
        } else {
            const rankingsList = Object.entries(rankings)
                .map(([movie, rank]) => `- ${movie}: ${rank}/10`)
                .join('\n');
            message.channel.send(`Rankings de películas:\n${rankingsList}`);
        }
    }
});

client.login(DISCORD_BOT_TOKEN);
