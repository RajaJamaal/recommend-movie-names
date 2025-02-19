// src/tools/movieRecommendationTool.ts

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { fetchMoviesByGenre } from "../utils/tmdbApi";

export const movieRecommendationTool = tool(
    async ({ genre, additionalInfo }: { genre: string; additionalInfo?: string }) => {
        console.log(`Fetching movies for genre: ${genre} with filter: ${additionalInfo || "None"}`);
        const movies = await fetchMoviesByGenre(genre, additionalInfo);

        if (movies.length === 0) {
            return `No movies found for genre "${genre}".`;
        }

        const recommendations = movies
            .map((movie) => `- ${movie.title} (Released: ${movie.release_date})`)
            .join("\n");

        console.log("Recommendations generated:", recommendations);

        return recommendations;
    },
    {
        name: "recommend_movies",
        description: "Recommend movies based on the genre and additional criteria provided.",
        schema: z.object({
            genre: z.string().describe("The genre to recommend movies for."),
            additionalInfo: z.string().optional().describe("Additional criteria like director or actor."),
        }),
    }
);

