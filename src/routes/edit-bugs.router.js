const { TABLE_NAMES } = require('../constants/db.constants');
const {
  CRUDService,
  QueryService,
  SerializeService,
} = require('../services');
const {
  auth,
  validate,
  Router,
  jsonBodyParser,
} = require('../middlewares');

const BUG_TABLE = TABLE_NAMES.BUG,
  STAT_TABLE = TABLE_NAMES.STATUS,
  APP_TABLE = TABLE_NAMES.APP,
  SEV_TABLE = TABLE_NAMES.SEVERITY_LEVEL,
  BUG_STAT_TABLE = TABLE_NAMES.BUG_STATUS,
  BUG_APP_TABLE = TABLE_NAMES.BUG_APP,
  BUG_SEV_TABLE = TABLE_NAMES.BUG_SEVERITY;

const editBugsRouter = Router();

editBugsRouter.use(auth.requireAuth, jsonBodyParser);

editBugsRouter
  .route('/:bugId')
  .all((req, res, next) => {
    const { dev } = req.dbUser;

    if (!dev) {
      res.status(401).json({ error: 'Unauthorized edit request' });
    } else next();
  })
  .patch(
    validate.bugBody,
    validate.linkageBody,
    async (req, res, next) => {
      try {
        const { bugId } = req.params;
        const { bug_name, description, completed_notes } = req.newBug;
        const appDb = req.app.get('db');

        if (completed_notes && req.status !== 'closed') {
          res.status(401).json({ error: `Status must be 'closed'` });
          return;
        }

        const rawBug = await CRUDService.getBySearch(
          appDb,
          BUG_TABLE,
          'id',
          bugId,
        );

        let bugChanged = 0;
        if (bug_name !== rawBug.bug_name) {
          rawBug.bug_name = bug_name;
          bugChanged++;
        }

        if (description !== rawBug.description) {
          rawBug.description = description;
          bugChanged++;
        }

        if (completed_notes) {
          rawBug.completed_at = appDb.fn.now();
          rawBug.completed_notes = completed_notes;
          bugChanged++;
        }

        if (bugChanged) {
          await CRUDService.updateEntry(
            appDb,
            BUG_TABLE,
            'id',
            rawBug.id,
            rawBug,
          );
        }

        const links = await QueryService.grabBugLinkages(
          appDb,
          rawBug.id,
        );

        if (links.status_name !== req.status) {
          const status = await CRUDService.getBySearch(
            appDb,
            STAT_TABLE,
            'level',
            req.status,
          );

          await CRUDService.updateFieldByBugId(
            appDb,
            BUG_STAT_TABLE,
            'status_id',
            status.id,
            bugId,
          );

          rawBug.status = req.status;
        } else rawBug.status = links.status_name;

        if (links.app_name !== req.app) {
          const app = await CRUDService.getBySearch(
            appDb,
            APP_TABLE,
            'app_name',
            req.app,
          );

          await CRUDService.updateFieldByBugId(
            appDb,
            BUG_APP_TABLE,
            'app_id',
            app.id,
            bugId,
          );

          rawBug.app = req.app;
        } else rawBug.app = links.app_name;

        if (links.level !== req.severity) {
          const severity = await CRUDService.getBySearch(
            appDb,
            SEV_TABLE,
            'level',
            req.severity,
          );

          await CRUDService.updateFieldByBugId(
            appDb,
            BUG_SEV_TABLE,
            'severity_id',
            severity.id,
            bugId,
          );

          rawBug.severity = req.level;
        } else rawBug.severity = links.level;

        const editBug = SerializeService.formatBug(rawBug);

        res.status(200).json({ editBug });
      } catch (error) {
        next(error);
      }
    },
  );

module.exports = editBugsRouter;