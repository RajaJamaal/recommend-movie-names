# recommend-movie-names

recommends movie names using LangGraph agents
Movie Recommendation Chat Application
A seamless web-based chat application that provides personalized movie recommendations based on user inputs. Leveraging the power of OpenAI's language models and The Movie Database (TMDb) API, this application offers users an intuitive interface to discover movies tailored to their preferences.

Table of Contents
Features
Demo
Technologies Used
Prerequisites
Installation
Configuration
Running the Application
Project Structure
Usage
Contributing
License
Acknowledgements

Features
Interactive Chat Interface: Engage in real-time conversations to receive movie recommendations.
Personalized Recommendations: Tailor suggestions based on genres, directors, actors, and more.
Conversation Context: Maintain context across multiple interactions using thread_id.
Rate Limiting: Prevent abuse by limiting the number of requests per IP.
Responsive Design: Accessible and user-friendly across various devices and screen sizes.
Error Handling: Gracefully handle invalid inputs and backend errors with clear messages.

Technologies Used
.........................
Frontend:
HTML5
CSS3
JavaScript (Vanilla)
Backend:
Node.js
Express.js
TypeScript
LangChain's StateGraph
OpenAI API
TMDb API
Utilities:
CORS
Express-Rate-Limit
UUID
dotenv
..........................

Prerequisites
Before you begin, ensure you have met the following requirements:

Node.js: Version 14.x or higher
npm: Comes bundled with Node.js
TMDb API Key: Obtain from The Movie Database
OpenAI API Key: Obtain from OpenAI
Installation
Clone the Repository:
..............................................................
git clone <https://github.com/RajaJamaal/recommend-movie-names>
cd movie-recommendation-chat
...............................................................
Install Backend Dependencies:

Navigate to the project root directory and install the required packages.
npm install

If you encounter TypeScript errors related to missing type declarations (e.g., for cors), install the necessary type definitions:
.....................................
npm install --save-dev @types/cors
Configuration
Create a .env File:
......................................
In the project root directory, create a .env file to store your environment variables.

bash
......................
Copy code
touch .env
.......................

Add the Following Environment Variables
....................................................................
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
PORT: The port on which the backend server will run. Default is 3000.
OPENAI_API_KEY: Your OpenAI API key.
TMDB_API_KEY: Your TMDb API key.
....................................................................
Ensure that the .env file is added to .gitignore to prevent accidental exposure of sensitive information.

Running the Application
Start the Backend Server:

From the project root directory, run:
..................................................................
npm run start
This command uses ts-node to execute the TypeScript backend.

Expected Output:

OpenAI model initialized with modelName: gpt-3.5-turbo
StateGraph workflow initialized.
Workflow compiled and ready.
Server is running on port 3000
................................................................
Access the Frontend:
**If Serving Frontend Separately:

Open your browser and navigate to <http://127.0.0.1:5501> (or the port where your frontend is being served).

**If Serving Frontend via Backend:

Ensure that the backend is configured to serve static files from the public directory. Navigate to <http://localhost:3000> in your browser.

Project Structure
.........................................................................
movie-recommendation-chat/
├── node_modules/
├── public/
│   ├── index.html
│   └── styles.css
├── src/
│   ├── tools/
│   │   └── movieRecommendationTool.ts
│   ├── utils/
│   │   └── tmdbApi.ts
│   └── index.ts
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
public/: Contains frontend assets like index.html and styles.css.
src/: Contains backend source code.
tools/: Custom tools integrated with LangChain.
utils/: Utility functions for API interactions.
.env: Environment variables.
package.json: Project metadata and dependencies.
tsconfig.json: TypeScript configuration.
README.md: Project documentation.
........................................................................
*Usage
Interact with the Chat Interface:

**Input a Genre:

Type a genre like action and press "Send" or hit Enter. The assistant will provide a list of recommended action movies.

**Specify Additional Criteria:

To refine recommendations, specify additional information such as a director or actor. For example:

for director Christopher Nolan
starring Will Smith
Examples:
..........................................................................
You: action
Assistant: Here are some action movies that I recommend:

1. Venom: The Last Dance (Released: 2024-10-22)
2. Deadpool & Wolverine (Released: 2024-07-24)
3. The Count of Monte-Cristo (Released: 2024-06-28)
4. Arcadian (Released: 2024-04-12)
5. Survive (Released: 2024-06-19)

You: for director Christopher Nolan
Assistant: Here are some action movies directed by Christopher Nolan:

1. Inception (Released: 2010-07-16)
2. The Dark Knight (Released: 2008-07-18)
3. Memento (Released: 2000-10-11)
4. Tenet (Released: 2020-08-26)
5. Following (Released: 1998-09-12)
..............................................................................
*Conversation Flow:

**Maintaining Context:

The application uses thread_id to maintain conversation context, allowing for more coherent and context-aware recommendations across multiple interactions.

**Error Handling:

If the assistant cannot find recommendations based on the provided criteria, it will prompt for more specific information or alternative preferences.

Contributing
Contributions are welcome! Follow these steps to contribute:

**Fork the Repository:

Click the "Fork" button on the repository page to create a personal copy.

Clone the Forked Repository:

.......................................................................
git clone <https://github.com/RajaJamaal/recommend-movie-names>
cd movie-recommendation-chat
Create a New Branch:

........................................................................
git checkout -b feature/YourFeatureName
Make Changes and Commit:
.......................................................................
git add .
git commit -m "Add Your Feature"
Push to the Branch:
.......................................................................
git push origin feature/YourFeatureName
Create a Pull Request:
.......................................................................
Navigate to the original repository and create a pull request from your forked repository.

**License
This project is licensed under the MIT License.

**Acknowledgements
OpenAI for providing the language models.
The Movie Database (TMDb) for movie data and API.
LangChain for state management and workflow orchestration.
Express.js for the backend framework.
CORS middleware for handling Cross-Origin Resource Sharing.
express-rate-limit for rate limiting middleware.
