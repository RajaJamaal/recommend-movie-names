// src/utils/tmdbApi.ts

import axios from "axios";
import NodeCache from "node-cache";

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
    throw new Error("Please set the TMDB_API_KEY environment variable in your .env file.");
}

export interface Movie {
    title: string;
    overview: string;
    release_date: string;
}

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

export async function fetchMoviesByGenre(genre: string, filter: string = ""): Promise<Movie[]> {
    const cacheKey = `${genre}-${filter}`;
    const cachedMovies = cache.get<Movie[]>(cacheKey);

    if (cachedMovies) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return cachedMovies;
    }

    try {
        // Fetch the list of genres
        const genreResponse = await axios.get(`https://api.themoviedb.org/3/genre/movie/list`, {
            params: {
                api_key: TMDB_API_KEY,
                language: "en-US",
            },
        });

        const genres = genreResponse.data.genres;
        const genreObj = genres.find(
            (g: { id: number; name: string }) => g.name.toLowerCase() === genre.toLowerCase()
        );

        if (!genreObj) {
            return [];
        }

        const genreId = genreObj.id;

        // Base parameters
        const params: any = {
            api_key: TMDB_API_KEY,
            with_genres: genreId,
            sort_by: "popularity.desc",
            language: "en-US",
            page: 1,
        };

        // Apply additional filters
        if (filter) {
            // Example: filter = "director Christopher Nolan"
            const [filterType, ...filterValues] = filter.split(" ");
            const filterQuery = filterValues.join(" ");

            switch (filterType.toLowerCase()) {
                case "director":
                    // Fetch director's person ID
                    const directorResponse = await axios.get(`https://api.themoviedb.org/3/search/person`, {
                        params: {
                            api_key: TMDB_API_KEY,
                            query: filterQuery,
                        },
                    });

                    const directors = directorResponse.data.results;
                    if (directors.length > 0) {
                        const directorId = directors[0].id;
                        params.with_people = directorId;
                    }
                    break;

                case "actor":
                    // Fetch actor's person ID
                    const actorResponse = await axios.get(`https://api.themoviedb.org/3/search/person`, {
                        params: {
                            api_key: TMDB_API_KEY,
                            query: filterQuery,
                        },
                    });

                    const actors = actorResponse.data.results;
                    if (actors.length > 0) {
                        const actorId = actors[0].id;
                        params.with_cast = actorId;
                    }
                    break;

                // Add more cases as needed
                default:
                    console.log(`Unknown filter type: ${filterType}`);
            }
        }

        // Fetch movies with applied filters
        const moviesResponse = await axios.get(`https://api.themoviedb.org/3/discover/movie`, {
            params,
        });

        const movies = moviesResponse.data.results;

        // Extract movie details
        const movieDetails = movies.slice(0, 5).map((movie: any) => ({
            title: movie.title,
            overview: movie.overview,
            release_date: movie.release_date,
        }));

        // Cache the results
        cache.set(cacheKey, movieDetails);
        console.log(`Cache set for key: ${cacheKey}`);

        return movieDetails;
    } catch (error) {
        console.error("Error fetching movies:", error);
        throw new Error("An error occurred while fetching movie recommendations.");
    }
}
