const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors'); // Import the cors package

const app = express();
const PORT = 3000;

// Use CORS middleware to allow requests from all origins (or specify your origin if needed)
app.use(cors());

// Parse JSON bodies
app.use(bodyParser.json());

// API endpoint to save player name
app.post('/api/save-name', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Имя не указано' });
  }

  try {
    // Append player name to a file
    fs.appendFileSync('players.txt', `${name}\n`);
    console.log(`Имя сохранено: ${name}`);
    res.json({ message: 'Имя успешно сохранено' });
  } catch (error) {
    console.error('Error saving name:', error);
    res.status(500).json({ error: 'Ошибка на сервере' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
