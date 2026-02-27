/**
 * Status Mapper
 * Converts between database SMALLINT and frontend string values
 */

import {
  CallStatus,
  InterestedStatus,
  SelectionStatus,
  JoiningStatus,
  CallStatusString,
  InterestedStatusString,
  SelectionStatusString,
  JoiningStatusString,
  CallStatusStringType,
  InterestedStatusStringType,
  SelectionStatusStringType,
  JoiningStatusStringType,
} from '../enums/status.enum';

export class StatusMapper {
  /**
   * Convert database SMALLINT to frontend string
   */
  static callStatusToString(status: number | null): string | null {
    if (status === null || status === undefined) return null;
    switch (status) {
      case CallStatus.BUSY:
        return CallStatusString.BUSY;
      case CallStatus.RNR:
        return CallStatusString.RNR;
      case CallStatus.CONNECTED:
        return CallStatusString.CONNECTED;
      case CallStatus.WRONG_NUMBER:
        return CallStatusString.WRONG_NUMBER;
      case CallStatus.SWITCH_OFF:
        return CallStatusString.SWITCH_OFF;
      default:
        return null;
    }
  }

  static interestedStatusToString(status: number | null): string | null {
    if (status === null || status === undefined) return null;
    switch (status) {
      case InterestedStatus.YES:
        return InterestedStatusString.YES;
      case InterestedStatus.NO:
        return InterestedStatusString.NO;
      case InterestedStatus.CALL_BACK_LATER:
        return InterestedStatusString.CALL_BACK_LATER;
      default:
        return null;
    }
  }

  static selectionStatusToString(status: number | null): string | null {
    if (status === null || status === undefined) return null;
    switch (status) {
      case SelectionStatus.SELECTED:
        return SelectionStatusString.SELECTED;
      case SelectionStatus.NOT_SELECTED:
        return SelectionStatusString.NOT_SELECTED;
      case SelectionStatus.PENDING:
        return SelectionStatusString.PENDING;
      default:
        return null;
    }
  }

  static joiningStatusToString(status: number | null): string | null {
    if (status === null || status === undefined) return null;
    switch (status) {
      case JoiningStatus.JOINED:
        return JoiningStatusString.JOINED;
      case JoiningStatus.NOT_JOINED:
        return JoiningStatusString.NOT_JOINED;
      case JoiningStatus.PENDING:
        return JoiningStatusString.PENDING;
      case JoiningStatus.BACKED_OUT:
        return JoiningStatusString.BACKED_OUT;
      default:
        return null;
    }
  }

  /**
   * Convert frontend string to database SMALLINT
   */
  static callStatusToInt(status: string | null): number | null {
    if (!status) return null;
    const normalized = status.trim();
    switch (normalized) {
      case CallStatusString.BUSY:
        return CallStatus.BUSY;
      case CallStatusString.RNR:
        return CallStatus.RNR;
      case CallStatusString.CONNECTED:
        return CallStatus.CONNECTED;
      case CallStatusString.WRONG_NUMBER:
        return CallStatus.WRONG_NUMBER;
      case CallStatusString.SWITCH_OFF:
        return CallStatus.SWITCH_OFF;
      default:
        return null;
    }
  }

  static interestedStatusToInt(status: string | null): number | null {
    if (!status) return null;
    const normalized = status.trim();
    switch (normalized) {
      case InterestedStatusString.YES:
        return InterestedStatus.YES;
      case InterestedStatusString.NO:
        return InterestedStatus.NO;
      case InterestedStatusString.CALL_BACK_LATER:
        return InterestedStatus.CALL_BACK_LATER;
      default:
        return null;
    }
  }

  static selectionStatusToInt(status: string | null): number | null {
    if (!status) return null;
    const normalized = status.trim();
    switch (normalized) {
      case SelectionStatusString.SELECTED:
        return SelectionStatus.SELECTED;
      case SelectionStatusString.NOT_SELECTED:
        return SelectionStatus.NOT_SELECTED;
      case SelectionStatusString.PENDING:
        return SelectionStatus.PENDING;
      default:
        return null;
    }
  }

  static joiningStatusToInt(status: string | null): number | null {
    if (!status) return null;
    const normalized = status.trim();
    switch (normalized) {
      case JoiningStatusString.JOINED:
        return JoiningStatus.JOINED;
      case JoiningStatusString.NOT_JOINED:
        return JoiningStatus.NOT_JOINED;
      case JoiningStatusString.PENDING:
        return JoiningStatus.PENDING;
      case JoiningStatusString.BACKED_OUT:
        return JoiningStatus.BACKED_OUT;
      default:
        return null;
    }
  }
}
