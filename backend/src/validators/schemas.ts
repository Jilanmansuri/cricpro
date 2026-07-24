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
    .isEmail()
    .withMessage('Please provide a valid email address'),
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
    .trim()
    .isISO8601()
    .withMessage('Please provide a valid ISO8601 date'),
  body('matchInfo.overs')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Overs count must be a positive integer'),
  body('matchInfo.teamName')
    .optional({ checkFalsy: true })
    .trim(),
  body('matchInfo.opponentTeam')
    .optional({ checkFalsy: true })
    .trim(),
  body('myTeamBatting')
    .isArray()
    .withMessage('Batting scorecard must be an array'),
  body('myTeamBowling')
    .isArray()
    .withMessage('Bowling scorecard must be an array'),
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
