import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { handleChat } from './chatHandler.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/api/chat', async (req, res) => {
  const { messages, gameContext = {} } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages must be an array' });
    return;
  }

  try {
    const { textStream } = await handleChat(messages, gameContext);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    for await (const textPart of textStream) {
      res.write(textPart);
    }

    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
