// Importa los módulos necesarios
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

// Crea una instancia del cliente de Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Obtén las claves API de las variables de entorno
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Almacena los géneros de películas y la lista de seguimiento en memoria
let genresList = [];
let watchlist = [];

// Mapeo estático de los géneros
const genreMapping = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};

// Función para obtener el nombre del género basado en su código
function getGenreNameById(genreId) {
    return genreMapping[genreId] || 'Unknown Genre';
}

// Función para cargar los géneros desde TMDB
async function loadGenres() {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}`);
        genresList = response.data.genres;
        console.log("Géneros cargados:", genresList);
    } catch (error) {
        console.error('Error al cargar los géneros:', error);
    }
}

// Función para obtener información de una película de TMDB
async function getMovieInfo(title) {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`);
        console.log("Respuesta de TMDB:", response.data); // Agregar log para depuración
        const movie = response.data.results[0];

        if (!movie) {
            console.log("No se encontró ninguna película.");
            return null;
        }

        // Obtener más detalles de la película desde OMDb usando el imdbID
        const omdbResponse = await axios.get(`http://www.omdbapi.com/?i=${movie.imdb_id}&apikey=${process.env.OMDB_API_KEY}`);
        const omdbMovie = omdbResponse.data;

        // Verificar que la respuesta de OMDb es válida
        if (omdbMovie.Response === "False") {
            console.error('Error al obtener información de OMDb:', omdbMovie.Error);
            return null; // O puedes devolver un objeto vacío o con datos predeterminados
        }

        const creditsResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`);
        const trailerResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`);
        const trailers = trailerResponse.data.results;

        console.log("Géneros de la película:", movie.genre_ids); // Agregar log para depuración

         // Aquí generamos el link de Stremio usando el imdbID de OMDb
         const imdbID = omdbMovie.imdbID; // Esto es el ID de IMDb que necesitas
         const stremioLink = generateStremioLink(imdbID); // Generar el enlace de Stremio

        return {
            title: movie.title,
            year: new Date(movie.release_date).getFullYear(),
            genre: movie.genre_ids && movie.genre_ids.length > 0 ? movie.genre_ids.map(id => getGenreNameById(id)).join(', ') : 'No disponible',
            plot: movie.overview,
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'No disponible',
            imdbRating: movie.vote_average,
            directors: creditsResponse.data.crew.filter(member => member.job === 'Director').map(director => director.name).join(', '),
            trailer: trailers.length > 0 ? trailers[0].key : 'No disponible', // Guardar solo el key del tráiler
            imdb_id: imdbID || 'No disponible', // Asegúrate de que se asigna correctamente
            stremioLink: stremioLink // Añadir el enlace de Stremio a la respuesta
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
    // Eliminar el prefijo 'tt' si está presente
    if (imdbID) {
        const stremioID = imdbID.replace('tt', ''); // Eliminar 'tt'
        return `https://www.strem.io/s/movie/${stremioID}`;
    } else {
        console.error('imdbID no es válido:', imdbID);
        return 'Enlace de Stremio no disponible'; // O algún mensaje por defecto
    }
}

// Función para construir la estructura de respuesta en embed
function buildEmbedResponse(movieInfo) {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(movieInfo.title)
        .setDescription(`**Año:** ${movieInfo.year}\n**Género:** ${movieInfo.genre}\n**Sinopsis:** ${movieInfo.plot}\n**Directores:** ${movieInfo.directors}\n**Calificación en IMDb:** ${movieInfo.imdbRating}`)
        .setThumbnail(movieInfo.poster) // Añadir la carátula a la derecha como miniatura
        .addFields(
            { name: 'Enlaces', value: `[Ver en Letterboxd](${generateLetterboxdLink(movieInfo.title)})\n[Ver en Stremio](${generateStremioLink(movieInfo.imdb_id)})` }
        )
        .setTimestamp()
        .setFooter({ text: `🎬 Tráiler: ${movieInfo.trailer ? `https://www.youtube.com/watch?v=${movieInfo.trailer}` : 'No disponible'}` }); // Añadir el tráiler en el footer

    return embed;
}

// Cuando el bot esté listo
client.once('ready', async () => {
    console.log('Bot is online!');
    await loadGenres(); // Cargar la lista de géneros al iniciar
});

// Cuando se envíe un mensaje en el servidor
client.on('messageCreate', async message => {
    if (message.author.bot) return; // Ignora los mensajes del bot

    // Comando para obtener información de una película
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

            const embed = buildEmbedResponse(movieInfo);
            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener la información de la película:', error);
            message.channel.send('Hubo un error al intentar obtener la información de la película.');
        }
    }

    // Comando para recomendar una película al azar
    if (message.content.startsWith('!random')) {
        try {
            const randomResponse = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}`);
            const randomMovie = randomResponse.data.results[Math.floor(Math.random() * randomResponse.data.results.length)];
            const movieInfo = await getMovieInfo(randomMovie.title);

            if (!movieInfo) {
                message.channel.send('No se encontró información de esa película.');
                return;
            }

            const embed = buildEmbedResponse(movieInfo);
            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener una película aleatoria:', error);
            message.channel.send('Hubo un error al intentar obtener una película aleatoria.');
        }
    }

    // Comando para recomendar una película por género
    if (message.content.startsWith('!random ')) {
        const args = message.content.split(' ').slice(1);
        const genre = args.join(' ');

        if (!genre) {
            message.channel.send('Por favor, proporciona un género. Ejemplo: !random Action');
            return;
        }

        const genreId = genresList.find(g => g.name.toLowerCase() === genre.toLowerCase())?.id;

        if (!genreId) {
            message.channel.send('Género no encontrado. Por favor, utiliza uno de los géneros disponibles.');
            return;
        }

        try {
            const randomResponse = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}`);
            const randomMovie = randomResponse.data.results[Math.floor(Math.random() * randomResponse.data.results.length)];
            const movieInfo = await getMovieInfo(randomMovie.title);

            if (!movieInfo) {
                message.channel.send('No se encontró información de esa película.');
                return;
            }

            const embed = buildEmbedResponse(movieInfo);
            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener una película aleatoria por género:', error);
            message.channel.send('Hubo un error al intentar obtener una película aleatoria por género.');
        }
    }

    // Comando para agregar una película a la lista de seguimiento
    if (message.content.startsWith('!add ')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');

        if (!movieTitle) {
            message.channel.send('Por favor, proporciona el título de una película para agregar a la lista de seguimiento.');
            return;
        }

        const movieInfo = await getMovieInfo(movieTitle);
        if (movieInfo) {
            watchlist.push(movieInfo.title);
            message.channel.send(`La película "${movieInfo.title}" ha sido agregada a tu lista de seguimiento.`);
        } else {
            message.channel.send('No se encontró información de esa película.');
        }
    }

    // Comando para mostrar la lista de seguimiento
    if (message.content.startsWith('!watchlist')) {
        if (watchlist.length === 0) {
            message.channel.send('Tu lista de seguimiento está vacía.');
        } else {
            message.channel.send(`Tu lista de seguimiento:\n${watchlist.join('\n')}`);
        }
    }

    // Comando para clasificar una película
    if (message.content.startsWith('!rank ')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');

        if (!movieTitle) {
            message.channel.send('Por favor, proporciona el título de una película para clasificar.');
            return;
        }

        const movieInfo = await getMovieInfo(movieTitle);
        if (movieInfo) {
            // Lógica para clasificar la película (se puede mejorar)
            message.channel.send(`Has clasificado "${movieInfo.title}". ¡Gracias por tu opinión!`);
        } else {
            message.channel.send('No se encontró información de esa película.');
        }
    }

    // Comando para iniciar un juego de adivinar la película
    if (message.content.startsWith('!fun')) {
        // Lógica para el juego de adivinar la película (no implementada en este código)
        message.channel.send('¡Juego de adivinar la película aún no implementado!');
    }
});

// Inicia el bot
client.login(DISCORD_BOT_TOKEN);
