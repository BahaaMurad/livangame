const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.post('/api/save-name', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Имя не указано' });
  }

  // Save the name to a file (or database)
  fs.appendFileSync('players.txt', `${name}\n`);
  console.log(`Имя сохранено: ${name}`);

  res.json({ message: 'Имя успешно сохранено' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
