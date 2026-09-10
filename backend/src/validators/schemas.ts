import { body } from 'express-validator';

export const registerValidator = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .trim()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .custom((val) => {
      if (val.includes('@')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          throw new Error('Please enter a valid email address (e.g. name@example.com)');
        }
      }
      return true;
    }),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required'),
];

export const forgotPasswordValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('newPassword')
    .trim()
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
];

export const saveMatchValidator = [
  body('matchInfo.venueName')
    .optional({ checkFalsy: true })
    .trim(),
  body('matchInfo.date')
    .optional({ checkFalsy: true })
    .trim(),
  body('matchInfo.overs')
    .optional({ checkFalsy: true }),
  body('matchInfo.teamName')
    .optional({ checkFalsy: true })
    .trim(),
  body('matchInfo.opponentTeam')
    .optional({ checkFalsy: true })
    .trim(),
  body('myTeamBatting')
    .optional()
    .isArray()
    .withMessage('Batting scorecard must be an array'),
  body('myTeamBowling')
    .optional()
    .isArray()
    .withMessage('Bowling scorecard must be an array'),
  body('innings')
    .optional()
    .isArray()
    .withMessage('Innings scorecard must be an array'),
  body('teamABatting')
    .optional()
    .isArray()
    .withMessage('Team A batting must be an array'),
  body('teamBBatting')
    .optional()
    .isArray()
    .withMessage('Team B batting must be an array'),
];

export const createTournamentValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tournament name is required'),
  body('startDate')
    .trim()
    .isISO8601()
    .withMessage('Please provide a valid ISO8601 start date'),
  body('endDate')
    .trim()
    .isISO8601()
    .withMessage('Please provide a valid ISO8601 end date'),
];

export const createTeamValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required'),
];
