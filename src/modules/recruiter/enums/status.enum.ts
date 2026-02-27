/**
 * Status Enums for Recruiter Module
 * Maps between frontend string values and database SMALLINT values
 */

export enum CallStatus {
  BUSY = 1,
  RNR = 2,
  CONNECTED = 3,
  WRONG_NUMBER = 4,
  SWITCH_OFF = 5,
}

export enum InterestedStatus {
  YES = 1,
  NO = 2,
  CALL_BACK_LATER = 3,
}

export enum SelectionStatus {
  SELECTED = 1,
  NOT_SELECTED = 2,
  PENDING = 3,
}

export enum JoiningStatus {
  JOINED = 1,
  NOT_JOINED = 2,
  PENDING = 3,
  BACKED_OUT = 4,
}

/**
 * String values as used by frontend
 */
export const CallStatusString = {
  BUSY: 'Busy',
  RNR: 'RNR',
  CONNECTED: 'Connected',
  WRONG_NUMBER: 'Wrong Number',
  SWITCH_OFF: 'Switch off',
} as const;

export const InterestedStatusString = {
  YES: 'Yes',
  NO: 'No',
  CALL_BACK_LATER: 'Call Back Later',
} as const;

export const SelectionStatusString = {
  SELECTED: 'Selected',
  NOT_SELECTED: 'Not Selected',
  PENDING: 'Pending',
} as const;

export const JoiningStatusString = {
  JOINED: 'Joined',
  NOT_JOINED: 'Not Joined',
  PENDING: 'Pending',
  BACKED_OUT: 'Backed Out',
} as const;

export type CallStatusStringType = typeof CallStatusString[keyof typeof CallStatusString];
export type InterestedStatusStringType = typeof InterestedStatusString[keyof typeof InterestedStatusString];
export type SelectionStatusStringType = typeof SelectionStatusString[keyof typeof SelectionStatusString];
export type JoiningStatusStringType = typeof JoiningStatusString[keyof typeof JoiningStatusString];
