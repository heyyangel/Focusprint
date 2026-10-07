const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const { uploadRoot } = require('./middleware/upload');

const app = express();

app.use(
  cors({
    origin: env.clientUrl === '*' ? true : env.clientUrl.split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

// Proof files uploaded on task completion.
app.use(`/${env.uploadDir}`, express.static(uploadRoot));

app.use('/api', routes);

// Serve the built React client when it exists (single-origin production deploy).
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist, { fallthrough: true }));
app.get(/^(?!\/api|\/uploads).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => (err ? next() : undefined));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
