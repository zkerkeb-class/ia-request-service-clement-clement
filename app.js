import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import OpenAI from 'openai';
dotenv.config();

const app = express();
const port = process.env.PORT;

const jwtSecret = process.env.JWT_SECRET;
app.use(cors());

if (!jwtSecret) {
  console.error("La clé secrète JWT n'est pas définie dans le fichier .env");
  process.exit(1);
}

app.get('/recipesStream', (req, res) => {
  const ingredients = req.query.ingredients;
  const mealType = req.query.mealType;
  const cuisine = req.query.cuisine;
  const cookingTime = req.query.cookingTime;
  const complexity = req.query.complexity;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = chunk => {
    console.log('Received chunk from OpenAI: ', chunk);

    let chunkResponse;

    if (chunk.choices[0].finish_reason === 'stop') {
      res.write(`data: ${JSON.stringify({action: 'close'})}\n\n`);
    } else {
      if (
        chunk.choices[0].delta.role &&
        chunk.choices[0].delta.role === 'assistant'
      ) {
        chunkResponse = {
          action: 'start',
        };
      } else {
        chunkResponse = {
          action: 'chunk',
          chunk: chunk.choices[0].delta.content,
        };
      }
      res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
    }
  };

  const prompt = [];
  prompt.push(`Generate a recipe taht incorporates the following details:`);
  prompt.push(`[Ingredients ${ingredients}]`);
  prompt.push(`[Meal Type ${mealType}]`);
  prompt.push(`[Cuisine Preference ${cuisine}]`);
  prompt.push(`[Cooking Time ${cookingTime}]`);
  prompt.push(`[Complexity ${complexity}]`);

  prompt.push(
    `Please provide a detailed recipe, including steps for preparation and cooking. Only use the ingredient list provided above.`,
  );
  prompt.push(
    `The recipe should highlight the fresh and vibrant flavors of the ingredients`,
  );
  prompt.push(
    `Also give the recipe a suiable name in its local languagebased on cuisine preference`,
  );
  const messages = [
    {
      role: 'system',
      content: prompt.join(' '),
    },
  ];

  fetchOpenAICompletionsStream(messages, sendEvent);
  req.on('close', () => {
    res.end();
  });
});

async function fetchOpenAICompletionsStream(messages, callback) {
  const OPENAI_API_KEY = process.env.ENV_OPENAI_API_KEY;
  const openai = new OpenAI({apiKey: OPENAI_API_KEY});

  const aiModel = 'gpt-4-1106-preview';

  try {
    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: messages,
      stream: true,
    });

    console.log('OpenAI completion created');

    for await (const chunk of completion) {
      callback(chunk);
    }
  } catch (error) {
    console.error('Error in fetchOpenAICompletionsStream: ', error);
  }
}
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
