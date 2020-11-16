const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

const { ROUTES } = require('./constants/endpoints.constants');
const {
  NODE_ENV,
  CORS_ORIGIN_DEV,
  CORS_ORIGIN_PROD,
} = require('./config');

const { app, error } = require('./middlewares');
const {
  bugRouter,
  commentThreadRouter,
  usersRouter,
} = require('./routes');

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'dev';
const morganSkip = { skip: () => NODE_ENV === 'test' };
const corsOrigin = {
  origin:
    NODE_ENV === 'production' ? CORS_ORIGIN_PROD : CORS_ORIGIN_DEV,
};

app.use(morgan(morganOption, morganSkip));
app.use(cors(corsOrigin));
app.use(helmet());

app.get('/', (_req, res) => {
  res.send('Express boilerplate initialized!');
});

/*
| ROUTES HERE -------------------------
*/

const BUG_EP = ROUTES.API + ROUTES.BUG;
const COMMENT_THREAD_EP = ROUTES.API + ROUTES.COMMENT_THREAD;
const USERS_EP = ROUTES.API + ROUTES.USERS;

app.use(BUG_EP, bugRouter);
app.use(COMMENT_THREAD_EP, commentThreadRouter);
app.use(USERS_EP, usersRouter);

/*
|--------------------------------------
*/

app.use(error.notFound);
app.use(error.errorHandler);

module.exports = app;
