import app from './src/app.js';
import { env } from './src/config/env.js';

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
