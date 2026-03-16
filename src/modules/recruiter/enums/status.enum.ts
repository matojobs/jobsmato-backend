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
  INCOMING_OFF = 6,
  CALL_BACK = 7,
  INVALID = 8,
  OUT_OF_NETWORK = 9,
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
 * String values as used by frontend (and API validation)
 */
export const CallStatusString = {
  BUSY: 'Busy',
  RNR: 'RNR',
  CONNECTED: 'Connected',
  WRONG_NUMBER: 'Wrong Number',
  SWITCH_OFF: 'Switch off',
  SWITCHED_OFF: 'Switched Off',
  INCOMING_OFF: 'Incoming Off',
  CALL_BACK: 'Call Back',
  INVALID: 'Invalid',
  OUT_OF_NETWORK: 'Out of network',
} as const;

/** All allowed call status values for dropdowns and validation */
export const CALL_STATUS_OPTIONS = [
  CallStatusString.CONNECTED,
  CallStatusString.RNR,
  CallStatusString.BUSY,
  CallStatusString.SWITCHED_OFF,
  CallStatusString.INCOMING_OFF,
  CallStatusString.CALL_BACK,
  CallStatusString.INVALID,
  CallStatusString.WRONG_NUMBER,
  CallStatusString.OUT_OF_NETWORK,
] as const;

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
