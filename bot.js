const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

let watchlist = [];
let currentMovie = '';
let scores = {};
let isGameActive = false;
let previousMovies = [];

const genreMapping = { /* tu mapeo de géneros aquí */ };

async function getMovieInfo(title) {
    try {
        const omdbResponse = await axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${process.env.OMDB_API_KEY}`);
        const omdbMovie = omdbResponse.data;

        if (omdbMovie.Response === "False") return null;

        const imdbID = omdbMovie.imdbID;
        const tmdbResponse = await axios.get(`https://api.themoviedb.org/3/find/${imdbID}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
        const movie = tmdbResponse.data.movie_results[0];

        if (!movie) return null;

        const creditsResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`);
        const trailerResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`);
        const trailers = trailerResponse.data.results;

        const stremioLink = `https://www.strem.io/s/movie/${imdbID.replace('tt', '')}`;

        return {
            title: omdbMovie.Title,
            year: omdbMovie.Year,
            genre: movie.genre_ids.map(id => genreMapping[id] || 'Unknown').join(', '),
            plot: omdbMovie.Plot,
            poster: omdbMovie.Poster,
            imdbRating: omdbMovie.imdbRating,
            directors: creditsResponse.data.crew.filter(m => m.job === 'Director').map(d => d.name).join(', '),
            trailer: trailers.length > 0 ? trailers[0].key : 'No disponible',
            imdb_id: imdbID,
            stremioLink: stremioLink
        };
    } catch (error) {
        console.error('Error al obtener información de la película:', error);
        return null;
    }
}

function isMovieRepeated(movie) {
    return previousMovies.includes(movie.title);
}

function addToPreviousMovies(movie) {
    previousMovies.push(movie.title);
    if (previousMovies.length > 10) previousMovies.shift();
}

async function getRandomMovie() {
    let letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    let randomPage = Math.floor(Math.random() * 500) + 1;
    const response = await axios.get(`https://api.themoviedb.org/3/search/movie?query=${letter}&page=${randomPage}&api_key=${TMDB_API_KEY}`);
    const movies = response.data.results;
    return movies[Math.floor(Math.random() * movies.length)];
}

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content.startsWith('!info')) {
        const args = message.content.split(' ').slice(1);
        const movieTitle = args.join(' ');
        if (!movieTitle) return message.channel.send('Proporciona un título de película. Ejemplo: !info Inception');
        try {
            const movieInfo = await getMovieInfo(movieTitle);
            if (!movieInfo) return message.channel.send('No se encontró información de esa película.');
            const embed = buildEmbedResponse(movieInfo);
            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener la información:', error);
            message.channel.send('Hubo un error al obtener la información de la película.');
        }
    }

    else if (message.content.startsWith('!fun')) {
        if (isGameActive) return message.channel.send('Ya hay un juego en curso. Adivina la película.');
        isGameActive = true;
        try {
            let randomMovie;
            do {
                randomMovie = await getRandomMovie();
            } while (isMovieRepeated(randomMovie));

            addToPreviousMovies(randomMovie);

            const movieInfo = await getMovieInfo(randomMovie.title);
            if (!movieInfo) return message.channel.send('Error al obtener la información de la película.');
            currentMovie = movieInfo.title;
            message.channel.send(`🤔 Adivina la película: ${movieInfo.plot}`);
        } catch (error) {
            console.error('Error al iniciar el juego:', error);
            isGameActive = false;
        }
    }

    if (isGameActive && message.content.toLowerCase() === currentMovie.toLowerCase()) {
        scores[message.author.id] = (scores[message.author.id] || 0) + 1;
        const movieInfo = await getMovieInfo(currentMovie);
        const embed = buildEmbedResponse(movieInfo);
        message.channel.send(`🎉 ¡Correcto, ${message.author.username}! La película es "${currentMovie}".`, { embeds: [embed] });
        isGameActive = false;
    }

    else if (message.content.startsWith('!random')) {
        try {
            let randomMovie;
            do {
                randomMovie = await getRandomMovie();
            } while (isMovieRepeated(randomMovie));

            addToPreviousMovies(randomMovie);

            const movieInfo = await getMovieInfo(randomMovie.title);
            if (!movieInfo) return message.channel.send('No se encontró información de esa película.');
            const embed = buildEmbedResponse(movieInfo);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('rate_1')
                        .setLabel('⭐ 1')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('rate_2')
                        .setLabel('⭐ 2')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('rate_3')
                        .setLabel('⭐ 3')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('rate_4')
                        .setLabel('⭐ 4')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('rate_5')
                        .setLabel('⭐ 5')
                        .setStyle(ButtonStyle.Primary)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('add_watchlist')
                        .setLabel('Añadir a Watchlist')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('random_movie')
                        .setLabel('Recomendar otra')
                        .setStyle(ButtonStyle.Primary)
                );

            await message.channel.send({ embeds: [embed], components: [row, row2] });
        } catch (error) {
            console.error('Error al obtener la película aleatoria:', error);
            message.channel.send('Hubo un error al obtener una película aleatoria.');
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const movieTitle = currentMovie;

    if (interaction.customId.startsWith('rate_')) {
        const rating = interaction.customId.split('_')[1];
        if (!scores[movieTitle]) scores[movieTitle] = {};
        scores[movieTitle][interaction.user.id] = parseInt(rating);
        await interaction.reply({ content: `Has calificado "${movieTitle}" con ⭐ ${rating}`, ephemeral: true });
    }

    if (interaction.customId === 'add_watchlist') {
        if (!watchlist.includes(movieTitle)) {
            watchlist.push(movieTitle);
            await interaction.reply({ content: `"${movieTitle}" se ha añadido a tu Watchlist.`, ephemeral: true });
        } else {
            await interaction.reply({ content: `"${movieTitle}" ya está en tu Watchlist.`, ephemeral: true });
        }
    }

    if (interaction.customId === 'random_movie') {
        try {
            let randomMovie;
            do {
                randomMovie = await getRandomMovie();
            } while (isMovieRepeated(randomMovie));

            addToPreviousMovies(randomMovie);

            const movieInfo = await getMovieInfo(randomMovie.title);
            if (!movieInfo) return interaction.update({ content: 'No se encontró información de esa película.', components: [] });
            const embed = buildEmbedResponse(movieInfo);

            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            console.error('Error al obtener otra película aleatoria:', error);
            await interaction.update({ content: 'Hubo un error al obtener otra película.', components: [] });
        }
    }
});

client.login(DISCORD_BOT_TOKEN);

function buildEmbedResponse(movieInfo) {
    return new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(movieInfo.title)
        .setDescription(`**Año:** ${movieInfo.year}\n**Género:** ${movieInfo.genre}\n**Sinopsis:** ${movieInfo.plot}\n**Directores:** ${movieInfo.directors}\n**IMDb Rating:** ${movieInfo.imdbRating}`)
        .setThumbnail(movieInfo.poster)
        .addFields(
            { name: 'Enlaces', value: `[Letterboxd](https://www.letterboxd.com/${movieInfo.imdb_id}) | [Stremio](${movieInfo.stremioLink})` }
        )
        .setImage(`https://img.youtube.com/vi/${movieInfo.trailer}/0.jpg`);
}
