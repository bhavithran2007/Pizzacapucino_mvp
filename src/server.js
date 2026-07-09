const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`Pizza Capucino MVP server is running on http://localhost:${env.port}`);
});
